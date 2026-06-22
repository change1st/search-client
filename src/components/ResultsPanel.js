const React = require('react');
// 移除CSS导入，在index.html中通过link标签加载样式

class ResultsPanel extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      selectedTab: 'results', // results, stats, response
      expandedItems: new Set(),
      searchTerm: '',
      paginationPage: 1,
      itemsPerPage: 10,
      showCompactView: false,
      highlightMatches: true,
      showExportMenu: false
    };
    
    // 绑定方法
    this.toggleTab = this.toggleTab.bind(this);
    this.toggleItemExpansion = this.toggleItemExpansion.bind(this);
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.handlePaginationChange = this.handlePaginationChange.bind(this);
    this.toggleViewMode = this.toggleViewMode.bind(this);
    this.toggleHighlighting = this.toggleHighlighting.bind(this);
    this.toggleExportMenu = this.toggleExportMenu.bind(this);
    this.renderJsonItem = this.renderJsonItem.bind(this);
    this.renderResultItem = this.renderResultItem.bind(this);
    this.renderResultsTab = this.renderResultsTab.bind(this);
    this.renderStatsTab = this.renderStatsTab.bind(this);
    this.renderResponseTab = this.renderResponseTab.bind(this);
    this.exportResults = this.exportResults.bind(this);
    this.getFormattedTime = this.getFormattedTime.bind(this);
    this.getPrettyJsonString = this.getPrettyJsonString.bind(this);
  }
  
  // 切换标签页
  toggleTab(tab) {
    this.setState({ selectedTab: tab });
  }
  
  // 切换展开/折叠状态
  toggleItemExpansion(id) {
    const newExpandedItems = new Set(this.state.expandedItems);
    if (newExpandedItems.has(id)) {
      newExpandedItems.delete(id);
    } else {
      newExpandedItems.add(id);
    }
    this.setState({ expandedItems: newExpandedItems });
  }
  
  // 处理搜索框变化
  handleSearchChange(event) {
    this.setState({ 
      searchTerm: event.target.value, 
      paginationPage: 1 // 重置分页
    });
  }
  
  // 处理分页变化
  handlePaginationChange(page) {
    this.setState({ paginationPage: page });
  }
  
  // 切换视图模式
  toggleViewMode() {
    this.setState(prevState => ({ 
      showCompactView: !prevState.showCompactView,
      paginationPage: 1 // 重置分页
    }));
  }
  
  // 切换高亮
  toggleHighlighting() {
    this.setState(prevState => ({ highlightMatches: !prevState.highlightMatches }));
  }
  
  // 切换导出菜单
  toggleExportMenu() {
    this.setState(prevState => ({ showExportMenu: !prevState.showExportMenu }));
  }
  
  // 获取格式化时间
  getFormattedTime(timeMs) {
    if (timeMs < 1) {
      return `${(timeMs * 1000).toFixed(2)}μs`;
    } else if (timeMs < 1000) {
      return `${timeMs.toFixed(2)}ms`;
    } else {
      return `${(timeMs / 1000).toFixed(2)}s`;
    }
  }
  
  // 获取格式化的JSON字符串
  getPrettyJsonString(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return JSON.stringify({ error: '无法序列化对象' }, null, 2);
    }
  }
  
  // 导出结果
  exportResults(format) {
    const { results } = this.props;
    if (!results || !results.hits || !results.hits.hits) {
      return;
    }
    
    let content = '';
    let filename = `search-results-${new Date().toISOString().slice(0, 10)}`;
    
    switch (format) {
      case 'json':
        content = this.getPrettyJsonString(results);
        filename += '.json';
        break;
      case 'csv':
        const hits = results.hits.hits;
        if (hits.length > 0) {
          // 获取所有可能的字段
          const fieldsSet = new Set();
          hits.forEach(hit => {
            if (hit._source) {
              Object.keys(hit._source).forEach(field => fieldsSet.add(field));
            }
          });
          const fields = Array.from(fieldsSet);
          
          // 生成CSV内容
          content = fields.join(',') + '\n';
          hits.forEach(hit => {
            if (hit._source) {
              const row = fields.map(field => {
                const value = hit._source[field];
                const strValue = value !== undefined && value !== null ? String(value) : '';
                // 转义CSV特殊字符
                return '"' + strValue.replace(/"/g, '""') + '"';
              }).join(',');
              content += row + '\n';
            }
          });
        }
        filename += '.csv';
        break;
      case 'text':
        content = this.getPrettyJsonString(results.hits.hits.map(hit => hit._source));
        filename += '.txt';
        break;
    }
    
    // 创建下载链接
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // 渲染JSON对象
  renderJsonItem(key, value, depth = 0, path = []) {
    if (depth > 6) {
      return React.createElement('span', { className: 'json-ellipsis' }, '...');
    }
    
    const currentPath = [...path, key].join('.');
    
    if (value === null) {
      return React.createElement('span', { className: 'null-value' }, 'null');
    }
    
    if (value === undefined) {
      return React.createElement('span', { className: 'undefined-value' }, 'undefined');
    }
    
    if (typeof value === 'string') {
      // 高亮搜索匹配
      if (this.state.highlightMatches && this.state.searchTerm) {
        // 转义正则特殊字符，避免用户输入 ( [ * 等导致 RegExp 抛错使整页崩溃
        const escaped = this.state.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        if (regex.test(value)) {
          const parts = value.split(regex);
          return React.createElement(
            'span',
            { className: 'string-value' },
            parts.map((part, i) => 
              regex.test(part) ? 
                React.createElement('span', { key: i, className: 'search-match' }, part) : 
                part
            )
          );
        }
      }
      return React.createElement('span', { className: 'string-value' }, '"' + value + '"');
    }
    
    if (typeof value === 'number') {
      return React.createElement('span', { className: 'number-value' }, String(value));
    }
    
    if (typeof value === 'boolean') {
      return React.createElement('span', { className: 'boolean-value' }, String(value));
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return React.createElement('span', { className: 'array-value' }, '[]');
      }
      
      const isExpanded = this.state.expandedItems.has(currentPath);
      
      return React.createElement(
        'span',
        { className: 'array-container' },
        React.createElement(
          'span',
          { 
            className: ['json-toggle', isExpanded ? 'expanded' : 'collapsed'].join(' '),
            onClick: () => this.toggleItemExpansion(currentPath)
          },
          isExpanded ? '▼' : '▶'
        ),
        React.createElement('span', { className: 'array-value' }, '[ '),
        isExpanded ? (
          React.createElement(
            'span',
            { className: 'json-expanded-content' },
            value.map((item, index) => 
              React.createElement(
                'div',
                { 
                  key: index, 
                  className: 'json-item',
                  style: { marginLeft: (depth + 1) * 20 + 'px' }
                },
                this.renderJsonItem(index, item, depth + 1, [...path, key]),
                index < value.length - 1 && React.createElement('span', null, ',')
              )
            ),
            React.createElement(
              'span',
              { style: { marginLeft: depth * 20 + 'px' } },
              ' ]'
            )
          )
        ) : (
          React.createElement('span', null, `... ${value.length} 个元素`)
        )
      );
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return React.createElement('span', { className: 'object-value' }, '{}');
      }
      
      const isExpanded = this.state.expandedItems.has(currentPath);
      
      return React.createElement(
        'span',
        { className: 'object-container' },
        React.createElement(
          'span',
          { 
            className: ['json-toggle', isExpanded ? 'expanded' : 'collapsed'].join(' '),
            onClick: () => this.toggleItemExpansion(currentPath)
          },
          isExpanded ? '▼' : '▶'
        ),
        React.createElement('span', { className: 'object-value' }, '{ '),
        isExpanded ? (
          React.createElement(
            'span',
            { className: 'json-expanded-content' },
            keys.map((k, index) => 
              React.createElement(
                'div',
                { 
                  key: k, 
                  className: 'json-item',
                  style: { marginLeft: (depth + 1) * 20 + 'px' }
                },
                React.createElement('span', { className: 'json-key' }, '"' + k + '"'),
                React.createElement('span', { className: 'json-separator' }, ': '),
                this.renderJsonItem(k, value[k], depth + 1, [...path, key]),
                index < keys.length - 1 && React.createElement('span', null, ',')
              )
            ),
            React.createElement(
              'span',
              { style: { marginLeft: depth * 20 + 'px' } },
              ' }'
            )
          )
        ) : (
          React.createElement('span', null, `... ${keys.length} 个属性`)
        )
      );
    }
    
    return React.createElement('span', null, String(value));
  }
  
  // 渲染单个结果项
  renderResultItem(hit, index) {
    const { showCompactView } = this.state;
    const itemId = `hit-${index}`;
    const isExpanded = this.state.expandedItems.has(itemId);
    
    return React.createElement(
      'div',
      { className: 'result-item' },
      React.createElement(
        'div',
        { className: 'result-item-header' },
        React.createElement(
          'span',
          { className: 'result-index' },
          index + 1
        ),
        hit._index && React.createElement(
          'span',
          { className: 'result-index-name' },
          hit._index
        ),
        hit._id && React.createElement(
          'span',
          { className: 'result-id' },
          hit._id
        ),
        hit._score !== undefined && hit._score !== null && React.createElement(
          'span',
          { className: 'result-score' },
          'Score: ',
          hit._score.toFixed(4)
        ),
        !showCompactView && React.createElement(
          'span',
          { 
            className: ['result-toggle', isExpanded ? 'expanded' : 'collapsed'].join(' '),
            onClick: () => this.toggleItemExpansion(itemId)
          },
          isExpanded ? '收起' : '展开'
        )
      ),
      showCompactView ? (
        React.createElement(
          'div',
          { className: 'result-content-compact' },
          this.renderJsonItem(`source-${index}`, hit._source || hit.fields || {})
        )
      ) : isExpanded ? (
        React.createElement(
          'div',
          { className: 'result-content-expanded' },
          this.renderJsonItem(`hit-${index}`, hit)
        )
      ) : hit._source && Object.keys(hit._source).length > 0 ? (
        React.createElement(
          'div',
          { className: 'result-content-preview' },
          this.renderJsonItem(`source-${index}`, hit._source)
        )
      ) : null
    );
  }
  
  // 渲染结果标签页
  renderResultsTab() {
    const { results, isLoading } = this.props;
    const { searchTerm, paginationPage, itemsPerPage, showCompactView } = this.state;
    
    if (isLoading) {
      return React.createElement(
        'div',
        { className: 'loading-container' },
        React.createElement('div', { className: 'loading-spinner' }),
        React.createElement('div', { className: 'loading-text' }, '查询中...')
      );
    }
    
    if (!results || !results.hits || !results.hits.hits) {
      return React.createElement(
        'div',
        { className: 'empty-state' },
        React.createElement('div', { className: 'empty-icon' }, '📊'),
        React.createElement('div', { className: 'empty-text' }, '暂无查询结果'),
        React.createElement('div', { className: 'empty-subtext' }, '请执行查询以查看结果')
      );
    }
    
    const allHits = results.hits.hits || [];
    
    // 过滤结果
    const filteredHits = searchTerm
      ? allHits.filter(hit => {
          const searchStr = JSON.stringify(hit).toLowerCase();
          return searchStr.includes(searchTerm.toLowerCase());
        })
      : allHits;
    
    // 计算分页
    const totalPages = Math.ceil(filteredHits.length / itemsPerPage);
    const startIndex = (paginationPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentHits = filteredHits.slice(startIndex, endIndex);
    
    // 渲染分页按钮
    const renderPagination = () => {
      const pages = [];
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          React.createElement(
            'button',
            {
              key: i,
              className: paginationPage === i ? 'active' : '',
              onClick: () => this.handlePaginationChange(i),
              disabled: paginationPage === i
            },
            i
          )
        );
      }
      
      return React.createElement(
        'div',
        { className: 'pagination-controls' },
        React.createElement(
          'button',
          {
            className: 'pagination-btn',
            onClick: () => this.handlePaginationChange(Math.max(1, paginationPage - 1)),
            disabled: paginationPage === 1
          },
          '上一页'
        ),
        pages,
        React.createElement(
          'button',
          {
            className: 'pagination-btn',
            onClick: () => this.handlePaginationChange(Math.min(totalPages, paginationPage + 1)),
            disabled: paginationPage === totalPages
          },
          '下一页'
        )
      );
    };
    
    return React.createElement(
      'div',
      { className: 'results-tab' },
      React.createElement(
        'div',
        { className: 'results-controls' },
        React.createElement(
          'div',
          { className: 'search-control' },
          React.createElement('input', {
            type: 'text',
            className: 'search-input',
            placeholder: '在结果中搜索...',
            value: searchTerm,
            onChange: this.handleSearchChange
          })
        ),
        React.createElement(
          'div',
          { className: 'view-controls' },
          React.createElement(
            'button',
            {
              className: ['view-btn', showCompactView ? '' : 'active'].join(' '),
              onClick: this.toggleViewMode
            },
            showCompactView ? '详细视图' : '紧凑视图'
          ),
          React.createElement(
            'button',
            {
              className: ['highlight-btn', this.state.highlightMatches ? 'active' : ''].join(' '),
              onClick: this.toggleHighlighting
            },
            this.state.highlightMatches ? '取消高亮' : '高亮匹配'
          )
        ),
        React.createElement(
          'div',
          { className: 'export-controls' },
          React.createElement(
            'div',
            { className: 'export-dropdown', onMouseLeave: () => this.setState({ showExportMenu: false }) },
            React.createElement(
              'button',
              { className: 'export-btn', onClick: this.toggleExportMenu },
              '导出'
            ),
            this.state.showExportMenu && React.createElement(
              'div',
              { className: 'export-menu' },
              React.createElement(
                'div',
                { className: 'export-menu-item', onClick: () => { this.exportResults('json'); this.toggleExportMenu(); } },
                '导出JSON'
              ),
              React.createElement(
                'div',
                { className: 'export-menu-item', onClick: () => { this.exportResults('csv'); this.toggleExportMenu(); } },
                '导出CSV'
              ),
              React.createElement(
                'div',
                { className: 'export-menu-item', onClick: () => { this.exportResults('text'); this.toggleExportMenu(); } },
                '导出文本'
              )
            )
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'results-summary' },
        React.createElement(
          'span',
          null,
          '共找到 ',
          React.createElement('strong', null, filteredHits.length),
          ' 条结果',
          searchTerm && React.createElement(
            'span',
            null,
            ' (从 ',
            React.createElement('strong', null, allHits.length),
            ' 条中过滤)'
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'results-list' },
        currentHits.map((hit, index) => this.renderResultItem(hit, startIndex + index))
      ),
      totalPages > 1 && renderPagination()
    );
  }
  
  // 渲染统计标签页
  renderStatsTab() {
    const { results, isLoading } = this.props;
    
    if (isLoading) {
      return React.createElement(
        'div',
        { className: 'loading-container' },
        React.createElement('div', { className: 'loading-spinner' }),
        React.createElement('div', { className: 'loading-text' }, '查询中...')
      );
    }
    
    if (!results || !results.hits) {
      return React.createElement(
        'div',
        { className: 'empty-state' },
        React.createElement('div', { className: 'empty-icon' }, '📊'),
        React.createElement('div', { className: 'empty-text' }, '暂无统计信息'),
        React.createElement('div', { className: 'empty-subtext' }, '请执行查询以查看统计结果')
      );
    }
    
    const renderStatItem = (label, value, className = '') => {
      return React.createElement(
        'div',
        { className: ['stat-item', className].filter(Boolean).join(' ') },
        React.createElement('div', { className: 'stat-label' }, label),
        React.createElement('div', { className: 'stat-value' }, value)
      );
    };
    
    return React.createElement(
      'div',
      { className: 'stats-tab' },
      React.createElement(
        'div',
        { className: 'stats-grid' },
        renderStatItem('总命中数', results.hits.total?.value || 0),
        renderStatItem('查询耗时', results.took ? this.getFormattedTime(results.took) : '-'),
        renderStatItem('是否超时', results.timed_out ? '是' : '否'),
        renderStatItem('分片失败数', results._shards?.failed || 0),
        renderStatItem('总分片数', results._shards?.total || 0),
        renderStatItem('成功分片数', results._shards?.successful || 0)
      ),
      results.hits.max_score !== undefined && results.hits.max_score !== null && renderStatItem(
        '最大得分',
        results.hits.max_score.toFixed(4),
        'max-score'
      ),
      results.aggregations && Object.keys(results.aggregations).length > 0 && React.createElement(
        'div',
        { className: 'aggregations-section' },
        React.createElement(
          'h3',
          null,
          '聚合结果'
        ),
        React.createElement(
          'div',
          { className: 'aggregations-content' },
          this.renderJsonItem('aggregations', results.aggregations)
        )
      )
    );
  }
  
  // 渲染完整响应标签页
  renderResponseTab() {
    const { results, isLoading } = this.props;
    
    if (isLoading) {
      return React.createElement(
        'div',
        { className: 'loading-container' },
        React.createElement('div', { className: 'loading-spinner' }),
        React.createElement('div', { className: 'loading-text' }, '查询中...')
      );
    }
    
    if (!results) {
      return React.createElement(
        'div',
        { className: 'empty-state' },
        React.createElement('div', { className: 'empty-icon' }, '📋'),
        React.createElement('div', { className: 'empty-text' }, '暂无响应数据'),
        React.createElement('div', { className: 'empty-subtext' }, '请执行查询以查看完整响应')
      );
    }
    
    return React.createElement(
      'div',
      { className: 'response-tab' },
      React.createElement(
        'pre',
        { className: 'json-response' },
        this.getPrettyJsonString(results)
      ),
      React.createElement(
        'div',
        { className: 'response-actions' },
        React.createElement(
          'button',
          { 
            className: 'copy-btn',
            onClick: () => {
              navigator.clipboard.writeText(this.getPrettyJsonString(results))
                .then(() => alert('已复制到剪贴板'))
                .catch(err => console.error('复制失败:', err));
            }
          },
          '复制JSON'
        )
      )
    );
  }
  
  // 渲染主界面
  render() {
    const { selectedTab } = this.state;
    const { results } = this.props;
    
    return React.createElement(
      'div',
      { className: 'results-panel' },
      React.createElement(
        'div',
        { className: 'results-header' },
        React.createElement(
          'h2',
          null,
          '查询结果'
        ),
        React.createElement(
          'div',
          { className: 'tabs-container' },
          React.createElement(
            'button',
            { 
              className: ['tab-btn', selectedTab === 'results' ? 'active' : ''].join(' '),
              onClick: () => this.toggleTab('results')
            },
            '结果列表',
            results && results.hits && results.hits.hits && (
              React.createElement(
                'span',
                { className: 'tab-count' },
                results.hits.hits.length
              )
            )
          ),
          React.createElement(
            'button',
            { 
              className: ['tab-btn', selectedTab === 'stats' ? 'active' : ''].join(' '),
              onClick: () => this.toggleTab('stats')
            },
            '统计信息'
          ),
          React.createElement(
            'button',
            { 
              className: ['tab-btn', selectedTab === 'response' ? 'active' : ''].join(' '),
              onClick: () => this.toggleTab('response')
            },
            '完整响应'
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'results-content' },
        selectedTab === 'results' && this.renderResultsTab(),
        selectedTab === 'stats' && this.renderStatsTab(),
        selectedTab === 'response' && this.renderResponseTab()
      )
    );
  }
}

module.exports = ResultsPanel;