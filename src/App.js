const React = require('react');
const QueryPanel = require('./components/QueryPanel');
const ResultsPanel = require('./components/ResultsPanel');
const ConnectionDialog = require('./components/ConnectionDialog');
const ConnectionPanel = require('./components/ConnectionPanel');
const StatusBar = require('./components/StatusBar');
const { esClient } = require('./services/esClient');
// 移除CSS导入，在index.html中通过link标签加载样式

class App extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      connected: false,
      connectionInfo: null,
      connectionDetails: null,
      queryResults: null,
      loading: false,
      error: null,
      indices: [],
      indicesLoading: false,
      connectionDialogOpen: false,
      serverType: 'elasticsearch',
      serverVersion: '',
      helpOpen: false
    };
    
    this.appRef = React.createRef();
    this.errorTimeoutRef = null;
    
    // 绑定方法
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleQuery = this.handleQuery.bind(this);
    this.handleFetchMapping = this.handleFetchMapping.bind(this);
    this.toggleConnectionDialog = this.toggleConnectionDialog.bind(this);
    this.refreshIndices = this.refreshIndices.bind(this);
    this.clearError = this.clearError.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.getConnectionDetails = this.getConnectionDetails.bind(this);
    this.toggleHelp = this.toggleHelp.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
  }
  
  componentDidMount() {
    // 尝试从本地存储恢复连接
    this.restoreConnection();
    // 监听键盘快捷键
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  componentWillUnmount() {
    // 清理定时器和事件监听器
    if (this.errorTimeoutRef) {
      clearTimeout(this.errorTimeoutRef);
    }
    document.removeEventListener('keydown', this.handleKeyDown);
    // 无状态客户端，无需显式断开
  }
  
  // 切换帮助弹窗
  toggleHelp(open) {
    this.setState({ helpOpen: open !== undefined ? open : !this.state.helpOpen });
  }
  
  // 从本地存储恢复连接
  restoreConnection() {
    try {
      // 兼容旧键名与新的“最近成功连接”
      const savedConnection = localStorage.getItem('esClientConnection');
      const lastSuccessful = localStorage.getItem('lastSuccessfulConnection');
      const src = savedConnection || lastSuccessful;
      if (src) {
        const parsed = JSON.parse(src);
        // 后台静默恢复连接，不阻塞首屏渲染
        this.connectToServer(parsed, true);
      }
    } catch (error) {
      console.error('Failed to restore connection:', error);
      this.setState({
        error: '恢复连接失败: ' + (error.message || '未知错误')
      });
    }
  }
  
  // 规范化连接信息为ES客户端需要的格式
  getConnectionDetails(connectionInfo) {
    try {
      // 如果已经是详情格式（包含url）
      if (connectionInfo && connectionInfo.url) {
        const u = require('url').parse(connectionInfo.url);
        return {
          url: connectionInfo.url,
          username: connectionInfo.username || '',
          password: connectionInfo.password || '',
          type: connectionInfo.type || connectionInfo.serverType || 'elasticsearch',
          ssl: u.protocol === 'https:',
          skipCertVerify: connectionInfo.skipCertVerify === true
        };
      }
      // 否则从host/port/useSSL构造
      const protocol = connectionInfo.useSSL ? 'https' : 'http';
      const port = connectionInfo.port || (connectionInfo.useSSL ? 443 : 9200);
      const host = connectionInfo.host;
      const urlStr = `${protocol}://${host}:${port}`;
      return {
        url: urlStr,
        username: connectionInfo.username || '',
        password: connectionInfo.password || '',
        type: connectionInfo.serverType || 'elasticsearch',
        ssl: connectionInfo.useSSL === true,
        skipCertVerify: connectionInfo.skipCertVerify === true
      };
    } catch (e) {
      throw e;
    }
  }

  // 连接到ES/OpenSearch服务器
  async connectToServer(connectionInfo, silent = false) {
    try {
      // 静默恢复时不显示全屏加载遮罩，避免阻塞首屏
      this.setState({ loading: !silent, error: null });
      
      // 规范化连接详情
      const connectionDetails = this.getConnectionDetails(connectionInfo);
      // 测试连接
      const serverInfo = await esClient.testConnection(connectionDetails);
      
      // 保存连接信息到本地存储
      localStorage.setItem('esClientConnection', JSON.stringify(connectionDetails));
      
      this.setState({
        connected: true,
        // 保留原始显示信息（若无则根据url填充基础信息）
        connectionInfo: connectionInfo.host ? connectionInfo : (function(){
          const u = require('url').parse(connectionDetails.url);
          return {
            host: u.hostname || '',
            port: u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80),
            username: connectionDetails.username || '',
            password: connectionDetails.password || '',
            useSSL: u.protocol === 'https:',
            serverType: connectionDetails.type || 'elasticsearch',
            name: connectionInfo.name || ''
          };
        })(),
        connectionDetails: connectionDetails,
        serverType: serverInfo.type,
        serverVersion: serverInfo.version,
        loading: false
      });
      
      // 刷新索引列表
      this.refreshIndices();
    } catch (error) {
      this.setState({
        connected: false,
        connectionInfo: null,
        connectionDetails: null,
        loading: false,
        error: error.message || '连接失败，请检查服务器地址和凭证'
      });
      
      // 清除本地存储中的连接信息
      localStorage.removeItem('esClientConnection');
      
      // 3秒后清除错误提示
      this.scheduleErrorClear();
    }
  }
  
  // 处理连接请求
  handleConnect(connectionInfo) {
    // 统一走connectToServer逻辑
    this.connectToServer(connectionInfo);
    this.toggleConnectionDialog(false);
  }
  
  // 处理断开连接
  handleDisconnect() {
    try {
      // 由于esClient是无状态的，不需要调用disconnect方法
      localStorage.removeItem('esClientConnection');
      
      this.setState({
        connected: false,
        connectionInfo: null,
        connectionDetails: null,
        queryResults: null,
        indices: [],
        serverType: 'elasticsearch',
        serverVersion: ''
      });
    } catch (error) {
      this.setState({ error: '断开连接失败: ' + (error.message || '未知错误') });
      this.scheduleErrorClear();
    }
  }
  
  // 处理连接变化
  handleConnectionChange(connected, connectionInfo) {
    if (connected && connectionInfo) {
      this.connectToServer(connectionInfo);
    } else {
      this.handleDisconnect();
    }
  }

  // 获取索引映射字段
  async handleFetchMapping(indexName) {
    if (!this.state.connected) {
      throw new Error('未连接到服务器');
    }
    return esClient.getIndexMapping(this.state.connectionDetails, indexName);
  }
  
  // 处理查询请求（支持分页与排序）
  async handleQuery(index, query, options) {
    if (!this.state.connected) {
      this.setState({ error: '未连接到服务器，请先连接' });
      this.scheduleErrorClear();
      return;
    }
    
    try {
      this.setState({ loading: true, error: null });
      
      // 根据是否有分页/排序选项，选择接口
      const params = {
        index,
        query,
        sort: options && options.sort ? options.sort : undefined,
        from: options && typeof options.from === 'number' ? options.from : 0,
        size: options && typeof options.size === 'number' ? options.size : 10
      };
      const results = await esClient.executePagedQuery(this.state.connectionDetails, params);
      
      this.setState({
        queryResults: results,
        loading: false
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: '查询失败: ' + (error.message || '未知错误')
      });
      this.scheduleErrorClear();
    }
  }
  
  // 刷新索引列表
  async refreshIndices() {
    if (!this.state.connected || !this.state.connectionInfo) {
      return;
    }
    
    try {
      this.setState({ indicesLoading: true });
      const indices = await esClient.getIndices(this.state.connectionDetails);
      
      this.setState({
        indices: indices
      });
    } catch (error) {
      console.error('获取索引列表失败:', error);
      // 不更新UI状态，保留之前的索引列表
    } finally {
      this.setState({ indicesLoading: false });
    }
  }
  
  // 切换连接对话框
  toggleConnectionDialog(open) {
    this.setState({ connectionDialogOpen: open !== undefined ? open : !this.state.connectionDialogOpen });
  }
  
  // 清除错误提示
  clearError() {
    this.setState({ error: null });
    if (this.errorTimeoutRef) {
      clearTimeout(this.errorTimeoutRef);
    }
  }
  
  // 安排错误清除
  scheduleErrorClear() {
    if (this.errorTimeoutRef) {
      clearTimeout(this.errorTimeoutRef);
    }
    this.errorTimeoutRef = setTimeout(this.clearError, 3000);
  }
  
  // 处理键盘快捷键
  handleKeyDown(event) {
    // Ctrl+K 聚焦查询编辑器
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      const queryInput = document.getElementById('query-input');
      if (queryInput) {
        queryInput.focus();
      }
    }
    // Ctrl+L 清除查询
    else if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
      event.preventDefault();
      // 这里可以添加清除查询的逻辑
    }
  }
  
  // 渲染错误提示
  renderError() {
    const { error } = this.state;
    
    if (!error) return null;
    
    return React.createElement(
      'div',
      { className: 'error-toast', onClick: this.clearError },
      React.createElement(
        'span',
        { className: 'error-message' },
        error
      ),
      React.createElement(
        'button',
        { className: 'close-btn', onClick: this.clearError },
        '×'
      )
    );
  }
  
  // 渲染主界面
  render() {
    const { 
      connected, 
      connectionInfo, 
      queryResults, 
      loading, 
      indices, 
      indicesLoading, 
      connectionDialogOpen,
      serverType,
      serverVersion
    } = this.state;
    
    return React.createElement(
      'div',
      { className: 'app-container theme-tech', ref: this.appRef, tabIndex: '0' },
      
      // 头部导航
      React.createElement(
        'header',
        { className: 'app-header' },
        React.createElement(
          'div',
          { className: 'branding' },
          React.createElement('img', { className: 'app-logo', src: './assets/icon-32.png', alt: 'Logo' }),
          React.createElement(
            'h1',
            { className: 'app-title' },
            'search-client'
          )
        ),
        React.createElement(
          'div',
          { className: 'header-actions' },
          connected ? (
            React.createElement(
              'button',
              { className: 'disconnect-btn', onClick: this.handleDisconnect },
              '断开连接'
            )
          ) : (
            React.createElement(
              'button',
              { className: 'connect-btn', onClick: () => this.toggleConnectionDialog(true) },
              '连接'
            )
          ),
          React.createElement(
            'button',
            { className: 'help-btn', onClick: () => this.toggleHelp(true) },
            '帮助'
          )
        )
      ),
      
      // 主内容区
      React.createElement(
        'main',
        { className: 'main-content' },
        React.createElement(
          'div',
          { className: 'content-layout' },
          // 查询面板
          React.createElement(
            'div',
            { className: 'query-panel-container' },
          React.createElement(QueryPanel, {
            onQuery: this.handleQuery,
            indices: indices,
            isLoading: loading,
            indicesLoading: indicesLoading,
            onRefreshIndices: this.refreshIndices,
            onFetchMapping: this.handleFetchMapping,
            serverType: serverType,
            serverVersion: serverVersion
          })
          ),
          // 结果面板
          React.createElement(
            'div',
            { className: 'results-panel-container' },
            React.createElement(ResultsPanel, {
              results: queryResults,
              isLoading: loading
            })
          )
        )
      ),
      
      // 状态栏
      React.createElement(StatusBar, {
        connected: connected,
        connectionInfo: connectionInfo,
        serverType: serverType,
        serverVersion: serverVersion
      }),
      
      // 连接管理（支持保存多个连接、选择或新建）
      connectionDialogOpen && React.createElement(
        'div',
        { className: 'modal-overlay', onClick: () => this.toggleConnectionDialog(false) },
        React.createElement(
          'div',
          { className: 'modal-content', onClick: (e) => e.stopPropagation() },
          React.createElement('h3', null, '连接管理'),
          React.createElement(ConnectionPanel, {
            onConnectionChange: this.handleConnectionChange
          }),
          React.createElement(
            'div',
            { className: 'modal-actions' },
            React.createElement(
              'button',
              { className: 'close-btn', onClick: () => this.toggleConnectionDialog(false) },
              '关闭'
            )
          )
        )
      ),
      
      // 错误提示
      this.renderError(),

      // 帮助弹窗
      this.state.helpOpen && React.createElement(
        'div',
        { className: 'modal-overlay', onClick: () => this.toggleHelp(false) },
        React.createElement(
          'div',
          { className: 'modal-content', onClick: (e) => e.stopPropagation() },
          React.createElement('h3', null, '帮助'),
          React.createElement('p', { className: 'modal-subtitle' }, '键盘快捷键'),
          React.createElement('ul', { className: 'shortcut-list' },
            React.createElement('li', null, 'Ctrl/Cmd + Enter · 执行查询'),
            React.createElement('li', null, 'Ctrl/Cmd + K · 聚焦查询编辑器'),
            React.createElement('li', null, 'Ctrl/Cmd + L · 清除查询')
          ),
          React.createElement(
            'div',
            { className: 'modal-actions' },
            React.createElement(
              'button',
              { className: 'close-btn', onClick: () => this.toggleHelp(false) },
              '关闭'
            )
          )
        )
      ),
      
      // 加载指示器
      loading && React.createElement(
        'div',
        { className: 'loading-overlay' },
        React.createElement(
          'div',
          { className: 'loading-spinner' },
          React.createElement('div', { className: 'spinner' })
        )
      )
    );
  }
}

module.exports = App;
