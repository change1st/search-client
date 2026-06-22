const React = require('react');

// 查询面板组件
class QueryPanel extends React.Component {
  constructor(props) {
    super(props);
    
    // 查询状态
    this.state = {
      queryInput: JSON.stringify({
        query: {
          match_all: {}
        },
        size: 10
      }, null, 2),
      selectedIndex: '*', // 默认所有索引
      jsonError: '',
      queryHistory: [],
      historyOpen: false,
      queryMode: 'advanced', // advanced, filter, aggregation
      
      // 过滤查询相关状态
      filters: [],
      filterField: '',
      filterValue: '',
      filterType: 'term', // term, match, range
      filterRangeFrom: '',
      filterRangeTo: '',
      
      // 分页和排序
      pageFrom: 0,
      pageSize: 10,
      sortField: '',
      sortOrder: 'desc',
      
      // 索引映射字段（用于基础查询字段选择）
      mappingFields: [],
      mappingLoading: false,
      mappingError: '',

      // 聚合查询相关状态
      aggregationType: 'terms', // terms, range, date_histogram
      aggregationField: '',
      aggregationSize: 10,
      aggregationRanges: [{ from: '', to: '' }],
      aggregationInterval: 'day',
      aggregationFormat: 'yyyy-MM-dd'
    };
    
    // 绑定方法
    this.handleQueryChange = this.handleQueryChange.bind(this);
    this.handleIndexChange = this.handleIndexChange.bind(this);
    this.formatJSON = this.formatJSON.bind(this);
    this.minifyJSON = this.minifyJSON.bind(this);
    this.clearQuery = this.clearQuery.bind(this);
    this.saveToHistory = this.saveToHistory.bind(this);
    this.executeQuery = this.executeQuery.bind(this);
    this.renderAdvancedQuery = this.renderAdvancedQuery.bind(this);
    this.renderFilterQuery = this.renderFilterQuery.bind(this);
    this.renderAggregationQuery = this.renderAggregationQuery.bind(this);
    this.toggleHistory = this.toggleHistory.bind(this);

    // 映射与过滤辅助方法绑定
    this.fetchMappingForSelectedIndex = this.fetchMappingForSelectedIndex && this.fetchMappingForSelectedIndex.bind(this);
    this.addFilter = this.addFilter && this.addFilter.bind(this);
    this.removeFilter = this.removeFilter && this.removeFilter.bind(this);
  }
  
  // 处理查询输入变化
  handleQueryChange(e) {
    const value = e.target.value;
    this.setState({ queryInput: value });
    
    // 清除之前的JSON错误
    if (this.state.jsonError) {
      this.setState({ jsonError: '' });
    }
  }

  // 打开/关闭历史弹窗
  toggleHistory() {
    this.setState(prev => ({ historyOpen: !prev.historyOpen }));
  }
  
  // 处理索引选择变化
  handleIndexChange(e) {
    const nextIndex = e.target.value;
    // 切换索引时清空已选条件与映射字段，避免跨索引字段不匹配
    this.setState({ selectedIndex: nextIndex, filters: [], mappingFields: [] });
  }
  
  // 格式化JSON
  formatJSON() {
    const { queryInput } = this.state;
    if (!queryInput.trim()) {
      this.setState({ jsonError: '请先输入查询内容' });
      return;
    }
    
    try {
      const parsed = JSON.parse(queryInput);
      this.setState({
        queryInput: JSON.stringify(parsed, null, 2),
        jsonError: ''
      });
    } catch (e) {
      this.setState({ jsonError: '无效的JSON格式，无法格式化' });
    }
  }
  
  // 压缩JSON
  minifyJSON() {
    const { queryInput } = this.state;
    if (!queryInput.trim()) {
      this.setState({ jsonError: '请先输入查询内容' });
      return;
    }
    
    try {
      const parsed = JSON.parse(queryInput);
      this.setState({
        queryInput: JSON.stringify(parsed),
        jsonError: ''
      });
    } catch (e) {
      this.setState({ jsonError: '无效的JSON格式，无法压缩' });
    }
  }
  
  // 清除查询
  clearQuery() {
    this.setState({
      queryInput: '',
      jsonError: ''
    });
  }
  
  // 保存到历史记录
  saveToHistory(query) {
    const { queryHistory } = this.state;
    const newHistory = [query, ...queryHistory.filter(q => JSON.stringify(q) !== JSON.stringify(query))];
    // 只保留最近10条历史记录
    this.setState({ queryHistory: newHistory.slice(0, 10) });
  }
  
  // 执行查询
  executeQuery() {
    const { queryInput, selectedIndex, pageFrom, pageSize, sortField, sortOrder, queryMode, filters } = this.state;
    const { onQuery } = this.props;
    
    if (!queryInput.trim()) {
      this.setState({ jsonError: '请先输入查询内容' });
      return;
    }
    
    try {
      const query = queryMode === 'filter'
        ? { query: { bool: { filter: filters || [] } } }
        : JSON.parse(queryInput);
      this.setState({ jsonError: '' });
      
      // 保存到历史记录
      this.saveToHistory(query);
      
      // 组装分页与排序参数
      const options = {
        from: pageFrom,
        size: pageSize
      };
      if (sortField && sortField.trim()) {
        options.sort = [{ [sortField.trim()]: { order: sortOrder || 'desc' } }];
      }
      // 执行查询（带分页/排序）
      if (onQuery) {
        onQuery(selectedIndex, query, options);
      }
    } catch (e) {
      this.setState({ jsonError: '无效的JSON格式，请检查后再试' });
    }
  }
  
  // 渲染高级查询界面
  renderAdvancedQuery() {
    const { queryInput, jsonError } = this.state;
    const { isLoading } = this.props;
    
    return React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement(
          'label',
          { htmlFor: 'query-input' },
          '查询 DSL:'
        ),
        React.createElement('textarea',
          {
            id: 'query-input',
            className: 'query-input',
            value: queryInput,
            onChange: this.handleQueryChange,
            placeholder: '{"query": {"match_all": {}},"size": 10}',
            rows: 12,
            spellCheck: false
          }
        )
      ),
      jsonError ? React.createElement(
        'div',
        { className: 'error-message' },
        jsonError
      ) : null,
      // 快捷键移至“帮助”弹窗，不占页面空间
      React.createElement(
        'div',
        { className: 'query-actions' },
        React.createElement(
          'button',
          {
            onClick: this.formatJSON,
            disabled: isLoading
          },
          '格式化JSON'
        ),
        React.createElement(
          'button',
          {
            onClick: this.minifyJSON,
            disabled: isLoading
          },
          '压缩JSON'
        ),
        React.createElement(
          'button',
          {
            onClick: this.clearQuery,
            disabled: isLoading
          },
          '清除查询'
        )
      )
    );
  }
  
  // 渲染过滤查询界面
  renderFilterQuery() {
    const { selectedIndex, filterField, filterType, filterValue, filterRangeFrom, filterRangeTo, filters, mappingFields, mappingLoading, mappingError } = this.state;
    const disableFieldSelect = selectedIndex === '*';

    return React.createElement(
      'div',
      { className: 'filter-query-container' },
      React.createElement('h3', null, '基础查询'),
      React.createElement(
        'div',
        { className: 'filter-builder' },
        React.createElement(
          'div',
          { className: 'filter-inputs' },
          React.createElement(
            'div',
            { className: 'form-group' },
            React.createElement(
              'div',
              { className: 'field-label-row' },
              React.createElement('label', null, '字段'),
              React.createElement(
                'button',
                {
                  className: 'load-fields-btn',
                  onClick: () => this.fetchMappingForSelectedIndex && this.fetchMappingForSelectedIndex(),
                  disabled: disableFieldSelect || mappingLoading
                },
                mappingLoading ? '加载中...' : '加载字段'
              )
            ),
            React.createElement(
              'select',
              {
                value: filterField,
                onChange: e => this.setState({ filterField: e.target.value }),
                disabled: disableFieldSelect || mappingLoading || !mappingFields || !mappingFields.length
              },
              React.createElement('option', { value: '' }, disableFieldSelect ? '请选择具体索引' : (mappingLoading ? '加载中...' : '选择字段')),
              (mappingFields || []).map(f => React.createElement('option', { key: f.name, value: f.name }, `${f.name} (${f.type})`))
            )
          ),
          React.createElement(
            'div',
            { className: 'form-group' },
            React.createElement('label', null, '操作符'),
            React.createElement(
              'select',
              { value: filterType, onChange: e => this.setState({ filterType: e.target.value }) },
              React.createElement('option', { value: 'term' }, 'term'),
              React.createElement('option', { value: 'match' }, 'match'),
              React.createElement('option', { value: 'range' }, 'range')
            )
          ),
          filterType === 'range'
            ? React.createElement(
                'div',
                { className: 'range-input-group' },
                React.createElement(
                  'div',
                  { className: 'form-group' },
                  React.createElement('label', null, '起始值'),
                  React.createElement('input', { type: 'text', value: filterRangeFrom, onChange: e => this.setState({ filterRangeFrom: e.target.value }) })
                ),
                React.createElement(
                  'div',
                  { className: 'form-group' },
                  React.createElement('label', null, '结束值'),
                  React.createElement('input', { type: 'text', value: filterRangeTo, onChange: e => this.setState({ filterRangeTo: e.target.value }) })
                )
              )
            : React.createElement(
                'div',
                { className: 'form-group' },
                React.createElement('label', null, '值'),
                React.createElement('input', { type: 'text', value: filterValue, onChange: e => this.setState({ filterValue: e.target.value }) })
              ),
          React.createElement(
            'div',
            { className: 'form-group' },
            React.createElement(
              'button',
              { className: 'add-filter-btn', onClick: () => this.addFilter && this.addFilter(), disabled: !filterField || (filterType === 'range' ? (!filterRangeFrom && !filterRangeTo) : !filterValue) },
              '添加条件'
            )
          )
        ),
        mappingError ? React.createElement('div', { className: 'error-message' }, mappingError) : null
      ),
      React.createElement(
        'div',
        { className: 'active-filters' },
        React.createElement('h4', null, '当前条件'),
        React.createElement(
          'div',
          { className: 'filter-list' },
          (filters || []).map((flt, idx) => React.createElement(
            'div',
            { key: idx, className: 'filter-item' },
            React.createElement('span', null, JSON.stringify(flt)),
            React.createElement('button', { className: 'remove-filter-btn', onClick: () => this.removeFilter && this.removeFilter(idx) }, '×')
          ))
        )
      )
    );
  }
  
  // 渲染聚合查询界面
  renderAggregationQuery() {
    return React.createElement(
      'div',
      { className: 'aggregation-query' },
      React.createElement(
        'h3',
        null,
        '聚合查询'
      )
    );
  }
  
  // 渲染查询模式切换
  renderQueryModeTabs() {
    const { queryMode } = this.state;
    
    return React.createElement(
      'div',
      { className: 'query-mode-tabs' },
      React.createElement(
        'button',
        {
          className: queryMode === 'advanced' ? 'active' : '',
          onClick: () => this.setState({ queryMode: 'advanced' })
        },
        '高级查询'
      ),
      React.createElement(
        'button',
        {
          className: queryMode === 'filter' ? 'active' : '',
          onClick: () => {
            this.setState({ queryMode: 'filter' });
            if (this.state.selectedIndex && this.state.selectedIndex !== '*' && (!this.state.mappingFields || this.state.mappingFields.length === 0)) {
              this.fetchMappingForSelectedIndex && this.fetchMappingForSelectedIndex();
            }
          }
        },
        '基础查询'
      ),
      React.createElement(
        'button',
        {
          className: queryMode === 'aggregation' ? 'active' : '',
          onClick: () => this.setState({ queryMode: 'aggregation' })
        },
        '聚合查询'
      )
    );
  }

  // 拉取当前索引的映射字段
  async fetchMappingForSelectedIndex() {
    const { selectedIndex } = this.state;
    const { onFetchMapping } = this.props;
    if (!onFetchMapping) return;
    if (!selectedIndex || selectedIndex === '*') {
      this.setState({ mappingError: '请选择具体索引后再加载字段' });
      return;
    }
    try {
      this.setState({ mappingLoading: true, mappingError: '' });
      const res = await onFetchMapping(selectedIndex);
      const fields = (res && res.fields) ? res.fields : [];
      this.setState({ mappingFields: fields, mappingLoading: false });
    } catch (err) {
      this.setState({ mappingLoading: false, mappingError: err && err.message ? err.message : '加载映射失败' });
    }
  }

  // 添加过滤条件
  addFilter() {
    const { filterField, filterType, filterValue, filterRangeFrom, filterRangeTo, filters } = this.state;
    if (!filterField) return;
    let clause = null;
    if (filterType === 'term') {
      if (!filterValue) return;
      clause = { term: { [filterField]: filterValue } };
    } else if (filterType === 'match') {
      if (!filterValue) return;
      clause = { match: { [filterField]: filterValue } };
    } else if (filterType === 'range') {
      const rangeSpec = {};
      if (filterRangeFrom) rangeSpec.gte = filterRangeFrom;
      if (filterRangeTo) rangeSpec.lte = filterRangeTo;
      if (Object.keys(rangeSpec).length === 0) return;
      clause = { range: { [filterField]: rangeSpec } };
    }
    const next = [ ...(filters || []), clause ];
    this.setState({ filters: next, filterValue: '', filterRangeFrom: '', filterRangeTo: '' });
  }

  // 移除过滤条件
  removeFilter(index) {
    const { filters } = this.state;
    const next = (filters || []).filter((_, i) => i !== index);
    this.setState({ filters: next });
  }
  
  // 渲染索引选择器
  renderIndexSelector() {
    const { selectedIndex } = this.state;
    const { indices, indicesLoading, onRefreshIndices } = this.props;
    
    return React.createElement(
      'div',
      { className: 'form-group' },
      React.createElement(
        'label',
        { htmlFor: 'index-select', className: 'index-select-label' },
        '选择索引:',
        indicesLoading
          ? React.createElement('span', { className: 'index-loading-hint' },
              React.createElement('span', { className: 'btn-spinner' }),
              '正在加载索引...'
            )
          : null
      ),
      React.createElement(
        'div',
        { className: 'index-selector' },
        React.createElement('select',
          {
            id: 'index-select',
            value: selectedIndex,
            onChange: this.handleIndexChange,
            disabled: indicesLoading
          },
          React.createElement(
            'option',
            { value: '*' },
            '全部索引'
          ),
          // 支持两种索引列表格式：字符串数组或对象数组
          (Array.isArray(indices) ? indices : []).map((item) => {
            const name = (typeof item === 'string') ? item : (item && item.index) ? item.index : '';
            return name ? React.createElement(
              'option',
              { key: name, value: name },
              name
            ) : null;
          })
        ),
        React.createElement(
          'button',
          {
            className: indicesLoading ? 'refresh-btn is-loading' : 'refresh-btn',
            onClick: onRefreshIndices,
            disabled: indicesLoading
          },
          indicesLoading
            ? React.createElement('span', { className: 'btn-spinner' })
            : null,
          indicesLoading ? '加载中...' : '刷新'
        )
      )
    );
  }
  
  // 渲染分页和排序
  renderPaginationAndSorting() {
    const { pageFrom, pageSize, sortField, sortOrder } = this.state;
    return React.createElement(
      'div',
      { className: 'pagination-sort' },
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement('label', null, '每页条数'),
        React.createElement('input', {
          type: 'number',
          min: 1,
          value: pageSize,
          onChange: e => this.setState({ pageSize: parseInt(e.target.value || '10', 10) })
        })
      ),
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement('label', null, '起始位置 from'),
        React.createElement('input', {
          type: 'number',
          min: 0,
          value: pageFrom,
          onChange: e => this.setState({ pageFrom: parseInt(e.target.value || '0', 10) })
        })
      ),
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement('label', null, '排序字段'),
        React.createElement('input', {
          type: 'text',
          placeholder: '例如 _score 或 timestamp',
          value: sortField,
          onChange: e => this.setState({ sortField: e.target.value })
        })
      ),
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement('label', null, '排序顺序'),
        React.createElement(
          'select',
          {
            value: sortOrder,
            onChange: e => this.setState({ sortOrder: e.target.value })
          },
          React.createElement('option', { value: 'desc' }, '降序'),
          React.createElement('option', { value: 'asc' }, '升序')
        )
      )
    );
  }
  
  // 渲染执行按钮
  renderExecuteButton() {
    const { isLoading } = this.props;
    
    return React.createElement(
      'div',
      { className: 'execute-section' },
      React.createElement(
        'button',
        {
          className: 'execute-btn',
          onClick: this.executeQuery,
          disabled: isLoading
        },
        isLoading
          ? React.createElement('span', { className: 'btn-spinner' })
          : null,
        isLoading ? '执行中...' : '执行查询'
      )
    );
  }
  
  // 渲染查询历史弹窗
  renderQueryHistory() {
    const { queryHistory, historyOpen } = this.state;
    if (!historyOpen) return null;

    return React.createElement(
      'div',
      { className: 'modal-overlay', onClick: this.toggleHistory },
      React.createElement(
        'div',
        { className: 'modal-content', onClick: e => e.stopPropagation() },
        React.createElement('h3', null, '查询历史'),
        React.createElement(
          'div',
          { className: 'modal-subtitle' },
          queryHistory.length > 0 ? '点击应用某条历史查询' : '暂无历史记录'
        ),
        React.createElement(
          'ul',
          { className: 'shortcut-list' },
          queryHistory.map((query, index) => React.createElement(
            'li',
            { key: index },
            React.createElement(
              'button',
              {
                className: 'help-btn',
                onClick: () => {
                  this.setState({ queryInput: JSON.stringify(query, null, 2), historyOpen: false });
                }
              },
              '应用查询 ' + (index + 1)
            )
          ))
        ),
        React.createElement(
          'div',
          { className: 'modal-actions' },
          React.createElement(
            'button',
            { className: 'close-btn', onClick: this.toggleHistory },
            '关闭'
          )
        )
      )
    );
  }
  
  // 渲染主界面
  render() {
    const { queryMode } = this.state;
    
    return React.createElement(
      'div',
      { className: 'query-panel' },
      React.createElement(
        'div',
        { className: 'panel-header' },
        React.createElement(
          'h2',
          null,
          '查询构建器'
        ),
        React.createElement(
          'div',
          { className: 'header-actions' },
          React.createElement(
            'button',
            { className: 'help-btn', onClick: this.toggleHistory },
            '查询历史'
          )
        )
      ),
      this.renderIndexSelector(),
      this.renderQueryModeTabs(),
      
      // 根据查询模式渲染不同的查询界面
      queryMode === 'advanced' ? this.renderAdvancedQuery() :
      queryMode === 'filter' ? this.renderFilterQuery() :
      this.renderAggregationQuery(),
      
      this.renderPaginationAndSorting(),
      this.renderExecuteButton(),
      this.renderQueryHistory()
    );
  }
}

module.exports = QueryPanel;