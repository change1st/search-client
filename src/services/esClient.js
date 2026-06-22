const http = require('http');
const https = require('https');
const url = require('url');

// ES/OpenSearch客户端实现
class ESClient {
  constructor() {
    this.timeout = 30000; // 默认30秒超时
  }

  // 构建请求选项
  _buildRequestOptions(connectionDetails, path, method = 'GET', body = null) {
    const parsedUrl = url.parse(connectionDetails.url);
    
    // 确保路径以/开头
    let formattedPath = path;
    if (!formattedPath.startsWith('/')) {
      formattedPath = `/${formattedPath}`;
    }

    // 如果URL已经包含路径，合并路径
    if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
      formattedPath = `${parsedUrl.pathname}${formattedPath}`;
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      protocol: parsedUrl.protocol,
      path: formattedPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // 添加用户代理标识
        'User-Agent': 'ES-OpenSearch-Mac-Client/1.0.0'
      },
      timeout: this.timeout
    };

    // 如果设置了用户名和密码，添加认证头
    if (connectionDetails.username && connectionDetails.password) {
      const auth = Buffer.from(`${connectionDetails.username}:${connectionDetails.password}`).toString('base64');
      options.headers['Authorization'] = `Basic ${auth}`;
    }

    // SSL选项
    if (parsedUrl.protocol === 'https:') {
      // 优先使用skipCertVerify控制证书校验（true表示跳过校验）
      if (Object.prototype.hasOwnProperty.call(connectionDetails, 'skipCertVerify')) {
        const reject = connectionDetails.skipCertVerify === true ? false : true;
        options.rejectUnauthorized = reject;
        // 为了兼容部分Node版本的行为，显式设置Agent
        options.agent = new https.Agent({ rejectUnauthorized: reject });
      } else {
        // 兼容旧字段ssl：当ssl为false时不校验证书
        const reject = connectionDetails.ssl !== false;
        options.rejectUnauthorized = reject;
        options.agent = new https.Agent({ rejectUnauthorized: reject });
      }
    }

    // 根据服务类型添加特定的头部
    if (connectionDetails.type === 'opensearch') {
      options.headers['Accept'] = 'application/vnd.opensearch+json;version=1.0';
    }

    return options;
  }

  // 发送请求
  _sendRequest(options, body = null) {
    return new Promise((resolve, reject) => {
      const httpModule = options.protocol === 'https:' ? https : http;
      
      const req = httpModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          // 处理非2xx状态码
          if (res.statusCode < 200 || res.statusCode >= 300) {
            try {
              const errorData = data ? JSON.parse(data) : {};
              const errorMessage = errorData.error?.reason || errorData.message || `HTTP错误: ${res.statusCode}`;
              return reject(new Error(errorMessage));
            } catch {
              return reject(new Error(`HTTP错误: ${res.statusCode}, 响应: ${data}`));
            }
          }

          try {
            // 尝试解析JSON，处理空响应
            const parsedData = data ? JSON.parse(data) : {};
            resolve({
              data: parsedData,
              status: res.statusCode,
              headers: res.headers
            });
          } catch (err) {
            reject(new Error(`无法解析响应: ${err.message}. 原始响应: ${data}`));
          }
        });
      });

      // 超时处理
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时，请检查服务器是否可用'));
      });

      req.on('error', (err) => {
        // 提供更友好的错误信息
        let errorMessage = err.message;
        if (err.code === 'ECONNREFUSED') {
          errorMessage = '连接被拒绝，请检查服务器地址和端口';
        } else if (err.code === 'ENOTFOUND') {
          errorMessage = '找不到服务器，请检查网络连接和地址';
        }
        reject(new Error(`网络错误: ${errorMessage}`));
      });

      // 发送请求体
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  // 测试连接
  async testConnection(connectionDetails) {
    try {
      const options = this._buildRequestOptions(connectionDetails, '/');
      const response = await this._sendRequest(options);
      
      // 检查响应，ES和OpenSearch都应该包含版本信息
      if (!response.data) {
        throw new Error('服务器返回空响应');
      }
      
      // 检查版本信息或其他标识特征
      if (!response.data.version && !response.data.tagline) {
        throw new Error('无效的ES/OpenSearch响应');
      }
      
      // 返回服务信息
      return {
        type: connectionDetails.type,
        version: response.data.version?.number || '未知',
        tagline: response.data.tagline || '未知',
        status: response.status
      };
    } catch (err) {
      throw new Error(`连接错误: ${err.message}`);
    }
  }

  // 执行查询
  async executeQuery(connectionDetails, queryParams) {
    const { query, index } = queryParams;
    
    // 验证参数
    if (!query) {
      throw new Error('查询不能为空');
    }
    
    const path = `/${index || '*'}/_search`;
    
    try {
      const options = this._buildRequestOptions(connectionDetails, path, 'POST');
      const response = await this._sendRequest(options, query);
      return response.data;
    } catch (err) {
      throw new Error(`查询执行失败: ${err.message}`);
    }
  }

  // 获取索引列表
  async getIndices(connectionDetails) {
    try {
      // 尝试使用_cat/indices API
      const options = this._buildRequestOptions(connectionDetails, '/_cat/indices?format=json&s=index');
      const response = await this._sendRequest(options);
      return response.data;
    } catch (err) {
      // 如果_cat API失败，尝试使用另外一种方式
      try {
        const options = this._buildRequestOptions(connectionDetails, '/_aliases');
        const response = await this._sendRequest(options);
        
        // 从_aliases响应中提取索引名
        const indices = Object.keys(response.data).map(indexName => ({
          index: indexName,
          status: 'open', // 假设所有返回的索引都是open状态
          pri: '1', // 假设每个索引一个主分片
          rep: '1', // 假设每个索引一个副本
          'docs.count': '0',
          'store.size': '0kb'
        }));
        
        return indices;
      } catch (secondaryErr) {
        throw new Error(`获取索引列表失败: ${err.message}`);
      }
    }
  }

  // 获取索引映射并扁平化字段列表
  async getIndexMapping(connectionDetails, indexName) {
    if (!indexName) {
      throw new Error('索引名不能为空');
    }

    const path = `/${indexName}/_mapping`;
    try {
      const options = this._buildRequestOptions(connectionDetails, path);
      const response = await this._sendRequest(options);

      const mappingsData = response.data || {};
      const allFields = [];

      const flattenProps = (props, prefix = '') => {
        if (!props || typeof props !== 'object') return;
        for (const key of Object.keys(props)) {
          const node = props[key];
          const fullName = prefix ? `${prefix}.${key}` : key;
          if (node && node.properties) {
            flattenProps(node.properties, fullName);
          } else {
            allFields.push({ name: fullName, type: node && node.type ? node.type : 'object' });
          }
        }
      };

      // 兼容不同返回结构：{ index: { mappings: { properties } } }
      for (const idx of Object.keys(mappingsData)) {
        const props = mappingsData[idx]?.mappings?.properties;
        flattenProps(props || {});
      }

      // 去重并排序
      const uniqueFields = Array.from(new Map(allFields.map(f => [f.name, f])).values())
        .sort((a, b) => a.name.localeCompare(b.name));

      return { fields: uniqueFields, raw: mappingsData };
    } catch (err) {
      throw new Error(`获取索引映射失败: ${err.message}`);
    }
  }

  // 获取集群健康状态
  async getClusterHealth(connectionDetails) {
    try {
      const options = this._buildRequestOptions(connectionDetails, '/_cluster/health');
      const response = await this._sendRequest(options);
      return response.data;
    } catch (err) {
      throw new Error(`获取集群健康状态失败: ${err.message}`);
    }
  }

  // 执行聚合查询
  async executeAggregation(connectionDetails, queryParams) {
    const { query, index, aggregations } = queryParams;
    
    // 验证参数
    if (!index) {
      throw new Error('索引名不能为空');
    }
    
    // 如果提供了聚合定义，构建包含聚合的查询
    const finalQuery = aggregations ? {
      size: 0, // 聚合查询通常不需要返回文档
      aggs: aggregations,
      ...query
    } : query;
    
    const path = `/${index}/_search`;
    
    try {
      const options = this._buildRequestOptions(connectionDetails, path, 'POST');
      const response = await this._sendRequest(options, finalQuery);
      return response.data;
    } catch (err) {
      throw new Error(`聚合查询执行失败: ${err.message}`);
    }
  }

  // 执行过滤查询
  async executeFilterQuery(connectionDetails, queryParams) {
    const { filters, index, sort, from = 0, size = 10, additionalQuery = {} } = queryParams;
    
    // 验证参数
    if (!index) {
      throw new Error('索引名不能为空');
    }
    
    // 构建过滤查询
    const filterQuery = {
      from,
      size,
      query: {
        bool: {
          filter: filters || []
        }
      },
      ...additionalQuery
    };
    
    // 添加排序
    if (sort) {
      filterQuery.sort = sort;
    }
    
    const path = `/${index}/_search`;
    
    try {
      const options = this._buildRequestOptions(connectionDetails, path, 'POST');
      const response = await this._sendRequest(options, filterQuery);
      return response.data;
    } catch (err) {
      throw new Error(`过滤查询执行失败: ${err.message}`);
    }
  }

  // 执行排序和分页查询
  async executePagedQuery(connectionDetails, queryParams) {
    const { query, index, sort, from = 0, size = 10 } = queryParams;
    
    // 验证参数
    if (!query) {
      throw new Error('查询不能为空');
    }
    
    // 构建分页查询
    const pagedQuery = {
      from,
      size,
      ...query
    };
    
    // 添加排序
    if (sort) {
      pagedQuery.sort = sort;
    }
    
    const path = `/${index || '*'}/_search`;
    
    try {
      const options = this._buildRequestOptions(connectionDetails, path, 'POST');
      const response = await this._sendRequest(options, pagedQuery);
      return response.data;
    } catch (err) {
      throw new Error(`分页查询执行失败: ${err.message}`);
    }
  }

  // 执行批量操作
  async bulkOperations(connectionDetails, operations) {
    if (!operations || operations.length === 0) {
      throw new Error('批量操作不能为空');
    }
    
    // 构建批量操作请求体
    const bulkBody = operations.map(op => {
      // 确保每个操作都是有效的
      if (!op.action || !op.data) {
        throw new Error('无效的批量操作，缺少action或data字段');
      }
      
      // 构建操作行和数据行
      return JSON.stringify({ [op.action]: op.meta || {} }) + '\n' +
             JSON.stringify(op.data) + '\n';
    }).join('');
    
    const path = '/_bulk';
    
    try {
      const options = this._buildRequestOptions(connectionDetails, path, 'POST', bulkBody);
      // 批量操作不使用JSON.stringify，因为已经格式化好了
      const req = options.protocol === 'https:' ? https.request : http.request;
      
      return new Promise((resolve, reject) => {
        const request = req(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } catch (err) {
              reject(new Error(`无法解析批量操作响应: ${err.message}`));
            }
          });
        });
        
        request.on('error', (err) => {
          reject(new Error(`批量操作失败: ${err.message}`));
        });
        
        request.write(bulkBody);
        request.end();
      });
    } catch (err) {
      throw new Error(`批量操作执行失败: ${err.message}`);
    }
  }

  // 执行术语聚合
  async executeTermsAggregation(connectionDetails, queryParams) {
    const { index, field, size = 10, orderBy = '_count', orderDir = 'desc' } = queryParams;
    
    // 验证参数
    if (!index || !field) {
      throw new Error('索引名和字段名不能为空');
    }
    
    // 构建术语聚合查询
    const aggregationQuery = {
      size: 0,
      aggs: {
        terms_agg: {
          terms: {
            field: field,
            size: size,
            order: {
              [orderBy]: orderDir
            }
          }
        }
      }
    };
    
    const path = `/${index}/_search`;
    
    try {
      const options = this._buildRequestOptions(connectionDetails, path, 'POST');
      const response = await this._sendRequest(options, aggregationQuery);
      return response.data;
    } catch (err) {
      throw new Error(`术语聚合查询执行失败: ${err.message}`);
    }
  }

  // 执行范围聚合
  async executeRangeAggregation(connectionDetails, queryParams) {
    const { index, field, ranges } = queryParams;
    
    // 验证参数
    if (!index || !field || !ranges || ranges.length === 0) {
      throw new Error('索引名、字段名和范围定义不能为空');
    }
    
    // 构建范围聚合查询
    const aggregationQuery = {
      size: 0,
      aggs: {
        range_agg: {
          range: {
            field: field,
            ranges: ranges
          }
        }
      }
    };
    
    const path = `/${index}/_search`;
    
    try {
      const options = this._buildRequestOptions(connectionDetails, path, 'POST');
      const response = await this._sendRequest(options, aggregationQuery);
      return response.data;
    } catch (err) {
      throw new Error(`范围聚合查询执行失败: ${err.message}`);
    }
  }

  // 执行日期直方图聚合
  async executeDateHistogramAggregation(connectionDetails, queryParams) {
    const { index, field, interval, format = 'yyyy-MM-dd' } = queryParams;
    
    // 验证参数
    if (!index || !field || !interval) {
      throw new Error('索引名、字段名和时间间隔不能为空');
    }
    
    // 构建日期直方图聚合查询
    const aggregationQuery = {
      size: 0,
      aggs: {
        date_histogram_agg: {
          date_histogram: {
            field: field,
            calendar_interval: interval,
            format: format
          }
        }
      }
    };
    
    const path = `/${index}/_search`;
    
    try {
      const options = this._buildRequestOptions(connectionDetails, path, 'POST');
      const response = await this._sendRequest(options, aggregationQuery);
      return response.data;
    } catch (err) {
      throw new Error(`日期直方图聚合查询执行失败: ${err.message}`);
    }
  }

  // 基本的索引统计信息
  async getIndexStats(connectionDetails, indexName) {
    try {
      const path = `/${indexName}/_stats`;
      const options = this._buildRequestOptions(connectionDetails, path);
      const response = await this._sendRequest(options);
      return response.data;
    } catch (err) {
      throw new Error(`获取索引统计信息失败: ${err.message}`);
    }
  }
}

// 导出单例
const esClient = new ESClient();

module.exports = { esClient };