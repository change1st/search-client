const React = require('react');

class ConnectionPanel extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      connectionUrl: '',
      username: '',
      password: '',
      skipCertVerify: false,
      serverType: 'elasticsearch',
      showPassword: false,
      connectionStatus: 'disconnected', // disconnected, connecting, connected, error
      errorMessage: '',
      savedConnections: [],
      selectedConnectionId: null,
      connectionName: '',
      showConnectionForm: true,
      showSavedList: false,
      testMode: false
    };
    
    // 绑定方法
    this.handleInputChange = this.handleInputChange.bind(this);
    this.togglePasswordVisibility = this.togglePasswordVisibility.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.testConnection = this.testConnection.bind(this);
    this.saveConnection = this.saveConnection.bind(this);
    this.deleteConnection = this.deleteConnection.bind(this);
    this.loadConnection = this.loadConnection.bind(this);
    this.toggleView = this.toggleView.bind(this);
    this.getSavedConnections = this.getSavedConnections.bind(this);
    this.saveConnectionToStorage = this.saveConnectionToStorage.bind(this);
    this.deleteConnectionFromStorage = this.deleteConnectionFromStorage.bind(this);
    this.renderConnectionForm = this.renderConnectionForm.bind(this);
    this.renderSavedConnections = this.renderSavedConnections.bind(this);
    this.renderConnectionStatus = this.renderConnectionStatus.bind(this);
  }
  
  componentDidMount() {
    // 从本地存储加载保存的连接
    const savedConnections = this.getSavedConnections();
    this.setState({ savedConnections });
    
    // 自动填充上次成功的连接信息
    const lastConnection = localStorage.getItem('lastSuccessfulConnection');
    if (lastConnection) {
      try {
        const connection = JSON.parse(lastConnection);
        this.setState({
          connectionUrl: connection.url || '',
          username: connection.username || '',
          password: connection.password || ''
        });
      } catch (e) {
        console.error('Failed to parse last successful connection:', e);
      }
    }
  }
  
  // 处理输入变化
  handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    this.setState({ [name]: type === 'checkbox' ? !!checked : value });
  }
  
  // 切换密码可见性
  togglePasswordVisibility() {
    this.setState(prevState => ({ showPassword: !prevState.showPassword }));
  }
  
  // 获取保存的连接列表
  getSavedConnections() {
    try {
      const saved = localStorage.getItem('savedConnections');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load saved connections:', e);
      return [];
    }
  }
  
  // 保存连接到本地存储
  saveConnectionToStorage(connection) {
    try {
      const connections = this.getSavedConnections();
      connections.push(connection);
      localStorage.setItem('savedConnections', JSON.stringify(connections));
      this.setState({ savedConnections: connections });
      return true;
    } catch (e) {
      console.error('Failed to save connection:', e);
      return false;
    }
  }
  
  // 从本地存储删除连接
  deleteConnectionFromStorage(connectionId) {
    try {
      const connections = this.getSavedConnections();
      const updatedConnections = connections.filter(conn => conn.id !== connectionId);
      localStorage.setItem('savedConnections', JSON.stringify(updatedConnections));
      this.setState({ 
        savedConnections: updatedConnections,
        selectedConnectionId: this.state.selectedConnectionId === connectionId ? null : this.state.selectedConnectionId
      });
      return true;
    } catch (e) {
      console.error('Failed to delete connection:', e);
      return false;
    }
  }
  
  // 连接到服务
  handleConnect() {
    const { connectionUrl, username, password, skipCertVerify, serverType } = this.state;
    
    if (!connectionUrl.trim()) {
      this.setState({
        connectionStatus: 'error',
        errorMessage: '请输入连接URL'
      });
      return;
    }
    
    this.setState({ 
      connectionStatus: 'connecting',
      errorMessage: '' 
    });
    
    // 导入esClient模块
    const { esClient } = require('../services/esClient');
    
    // 执行实际的连接测试
    const connectionInfo = {
      url: connectionUrl,
      username: username || '',
      password: password || '',
      skipCertVerify: !!skipCertVerify,
      type: serverType || 'elasticsearch'
    };
    
    esClient.testConnection(connectionInfo)
      .then(serverInfo => {
        // 保存成功的连接信息
        localStorage.setItem('lastSuccessfulConnection', JSON.stringify(connectionInfo));
        
        this.setState({ connectionStatus: 'connected' });

        // 连接成功后默认保存到“保存的连接”
        try {
          const parsed = require('url').parse(connectionInfo.url);
          const defaultName = this.state.connectionName?.trim() || (parsed.hostname || '连接') + ' ' + (new Date().toLocaleString());
          const newConnection = {
            id: Date.now().toString(),
            name: defaultName,
            url: connectionInfo.url,
            username: connectionInfo.username,
            password: connectionInfo.password,
            skipCertVerify: !!connectionInfo.skipCertVerify,
            type: connectionInfo.type || 'elasticsearch',
            createdAt: new Date().toISOString()
          };
          // 如果已存在相同url+username的连接则更新
          const list = this.getSavedConnections();
          const idx = list.findIndex(c => c.url === newConnection.url && c.username === newConnection.username);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...newConnection, id: list[idx].id }; // 保留原id
            localStorage.setItem('savedConnections', JSON.stringify(list));
            this.setState({ savedConnections: list });
          } else {
            this.saveConnectionToStorage(newConnection);
          }
        } catch (e) {
          console.warn('自动保存连接失败:', e);
        }
        
        // 通知父组件连接成功，包含服务器信息
        if (this.props.onConnectionChange) {
          this.props.onConnectionChange(true, { ...connectionInfo, serverInfo });
        }
      })
      .catch(error => {
        this.setState({
          connectionStatus: 'error',
          errorMessage: error.message || '连接失败，请检查URL和凭据'
        });
        
        // 通知父组件连接失败
        if (this.props.onConnectionChange) {
          this.props.onConnectionChange(false, null);
        }
      });
  }
  
  // 断开连接
  handleDisconnect() {
    this.setState({ connectionStatus: 'disconnected' });
    
    // 通知父组件断开连接
    if (this.props.onConnectionChange) {
      this.props.onConnectionChange(false, null);
    }
  }
  
  // 测试连接
  testConnection() {
    const { connectionUrl, username, password, skipCertVerify, serverType } = this.state;
    
    if (!connectionUrl.trim()) {
      this.setState({
        errorMessage: '请输入连接URL',
        testMode: false
      });
      return;
    }
    
    this.setState({ 
      connectionStatus: 'connecting',
      errorMessage: '',
      testMode: true
    });
    
    // 导入esClient模块
    const { esClient } = require('../services/esClient');
    
    // 执行实际的连接测试
    const connectionInfo = {
      url: connectionUrl,
      username: username || '',
      password: password || '',
      skipCertVerify: !!skipCertVerify,
      type: serverType || 'elasticsearch'
    };
    
    esClient.testConnection(connectionInfo)
      .then(() => {
      try {
        this.setState({
          connectionStatus: 'connected',
          errorMessage: '连接测试成功!',
          testMode: false
        });
        
        // 延迟恢复连接状态
        setTimeout(() => {
          if (this.state.connectionStatus === 'connected' && !this.testMode) {
            this.setState({ connectionStatus: 'disconnected' });
          }
        }, 3000);
      } catch (error) {
        this.setState({
          connectionStatus: 'error',
          errorMessage: error.message || '连接测试失败，请检查URL和凭据',
          testMode: false
        });
      }
      })
      .catch(error => {
        this.setState({
          connectionStatus: 'error',
          errorMessage: error.message || '连接测试失败'
        });
        
        // 延迟重置状态
        setTimeout(() => {
          this.setState({ 
            connectionStatus: 'disconnected',
            testMode: false,
            errorMessage: ''
          });
        }, 3000);
      });
  }
  
  // 保存连接
  saveConnection() {
    const { connectionUrl, username, password, connectionName, skipCertVerify, serverType } = this.state;
    
    if (!connectionUrl.trim()) {
      this.setState({ errorMessage: '请输入连接URL' });
      return;
    }
    
    if (!connectionName.trim()) {
      this.setState({ errorMessage: '请输入连接名称' });
      return;
    }
    
    const newConnection = {
      id: Date.now().toString(),
      name: connectionName.trim(),
      url: connectionUrl.trim(),
      username: username.trim(),
      password: password.trim(),
      skipCertVerify: !!skipCertVerify,
      type: serverType || 'elasticsearch',
      createdAt: new Date().toISOString()
    };
    
    if (this.saveConnectionToStorage(newConnection)) {
      this.setState({ 
        connectionName: '',
        errorMessage: '连接已保存'
      });
      
      // 3秒后清除错误消息
      setTimeout(() => {
        this.setState({ errorMessage: '' });
      }, 3000);
    } else {
      this.setState({ errorMessage: '保存连接失败' });
    }
  }
  
  // 删除连接
  deleteConnection(connectionId) {
    if (confirm('确定要删除这个连接吗？')) {
      if (this.deleteConnectionFromStorage(connectionId)) {
        this.setState({ errorMessage: '连接已删除' });
        
        // 3秒后清除错误消息
        setTimeout(() => {
          this.setState({ errorMessage: '' });
        }, 3000);
      } else {
        this.setState({ errorMessage: '删除连接失败' });
      }
    }
  }
  
  // 加载连接
  loadConnection(connection) {
    this.setState({
      connectionUrl: connection.url,
      username: connection.username,
      password: connection.password,
      skipCertVerify: !!connection.skipCertVerify,
      serverType: connection.type || 'elasticsearch',
      selectedConnectionId: connection.id,
      showConnectionForm: true,
      showSavedList: false,
      errorMessage: '已加载保存的连接'
    });
    
    // 3秒后清除错误消息
    setTimeout(() => {
      this.setState({ errorMessage: '' });
    }, 3000);
  }
  
  // 切换视图
  toggleView(view) {
    this.setState({
      showConnectionForm: view === 'form',
      showSavedList: view === 'saved'
    });
  }
  
  // 渲染连接表单
  renderConnectionForm() {
    const { 
      connectionUrl, 
      username, 
      password, 
      showPassword, 
      connectionStatus,
      errorMessage,
      connectionName,
      skipCertVerify,
      serverType
    } = this.state;
    
    const isConnecting = connectionStatus === 'connecting';
    const isConnected = connectionStatus === 'connected';
    const hasError = connectionStatus === 'error' || errorMessage;
    
    return React.createElement(
      'div',
      { className: 'connection-form' },
      
      // 连接名称输入框（仅用于保存连接）
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement(
          'label',
          { htmlFor: 'connectionName' },
          '连接名称（可选）'
        ),
        React.createElement('input', {
          type: 'text',
          id: 'connectionName',
          name: 'connectionName',
          value: connectionName,
          onChange: this.handleInputChange,
          placeholder: '给这个连接起个名字（仅用于保存）',
          disabled: isConnecting
        })
      ),
      
      // 连接URL输入框
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement(
          'label',
          { htmlFor: 'connectionUrl' },
          '连接URL *'
        ),
        React.createElement(
          'div',
          { className: 'url-input-container' },
          React.createElement('input', {
            type: 'text',
            id: 'connectionUrl',
            name: 'connectionUrl',
            value: connectionUrl,
            onChange: this.handleInputChange,
            placeholder: 'http://localhost:9200 或 https://your-cluster.es.amazonaws.com',
            className: hasError && !connectionUrl.trim() ? 'error' : '',
            disabled: isConnecting
          })
        )
      ),

      // 服务类型
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement(
          'label',
          { htmlFor: 'serverType' },
          '服务类型'
        ),
        React.createElement('select', {
          id: 'serverType',
          name: 'serverType',
          value: serverType,
          onChange: this.handleInputChange,
          disabled: isConnecting
        },
          React.createElement('option', { value: 'elasticsearch' }, 'Elasticsearch'),
          React.createElement('option', { value: 'opensearch' }, 'OpenSearch')
        )
      ),
      
      // 认证信息
      React.createElement(
        'div',
        { className: 'auth-section' },
        React.createElement(
          'h3',
          null,
          '认证信息（可选）'
        ),
        
        // 用户名
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement(
            'label',
            { htmlFor: 'username' },
            '用户名'
          ),
          React.createElement('input', {
            type: 'text',
            id: 'username',
            name: 'username',
            value: username,
            onChange: this.handleInputChange,
            placeholder: '输入用户名（如果需要认证）',
            disabled: isConnecting
          })
        ),
        
        // 密码
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement(
            'label',
            { htmlFor: 'password' },
            '密码'
          ),
          React.createElement(
            'div',
            { className: 'password-input-container' },
            React.createElement('input', {
              type: showPassword ? 'text' : 'password',
              id: 'password',
              name: 'password',
              value: password,
              onChange: this.handleInputChange,
              placeholder: '输入密码（如果需要认证）',
              disabled: isConnecting
            }),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'toggle-password-btn',
                onClick: this.togglePasswordVisibility,
                disabled: isConnecting,
                title: showPassword ? '隐藏密码' : '显示密码'
              },
              showPassword ? '👁️' : '👁️‍🗨️'
            )
          )
        )
      ),

      // 证书选项
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement(
          'label',
          { htmlFor: 'skipCertVerify' },
          '忽略证书验证（自签名/开发环境）'
        ),
        React.createElement('div', { className: 'checkbox-row' },
          React.createElement('input', {
            type: 'checkbox',
            id: 'skipCertVerify',
            name: 'skipCertVerify',
            checked: !!skipCertVerify,
            onChange: this.handleInputChange,
            disabled: isConnecting
          }),
          React.createElement('span', { className: 'checkbox-help' }, 'HTTPS连接遇到证书错误时可临时关闭校验')
        )
      ),
      
      // 操作按钮
      React.createElement(
        'div',
        { className: 'connection-actions' },
        isConnected ? (
          React.createElement(
            'button',
            {
              className: 'disconnect-btn',
              onClick: this.handleDisconnect,
              disabled: isConnecting
            },
            '断开连接'
          )
        ) : (
          [
            React.createElement(
              'button',
              {
                key: 'test',
                className: 'test-btn',
                onClick: this.testConnection,
                disabled: isConnecting || !connectionUrl.trim()
              },
              isConnecting ? '测试中...' : '测试连接'
            ),
            React.createElement(
              'button',
              {
                key: 'save',
                className: 'save-btn',
                onClick: this.saveConnection,
                disabled: isConnecting || !connectionUrl.trim()
              },
              '保存连接'
            ),
            React.createElement(
              'button',
              {
                key: 'connect',
                className: 'connect-btn primary',
                onClick: this.handleConnect,
                disabled: isConnecting || !connectionUrl.trim()
              },
              isConnecting ? '连接中...' : '连接'
            )
          ]
        )
      ),
      
      // 提示消息（错误/成功通用）
      hasError && React.createElement(
        'div',
        { className: connectionStatus === 'error' ? 'error-message' : 'info-message' },
        errorMessage || '连接失败'
      )
    );
  }
  
  // 渲染保存的连接列表
  renderSavedConnections() {
    const { savedConnections, selectedConnectionId } = this.state;
    
    if (savedConnections.length === 0) {
      return React.createElement(
        'div',
        { className: 'empty-saved-connections' },
        React.createElement('div', { className: 'empty-icon' }, '💾'),
        React.createElement('div', { className: 'empty-text' }, '暂无保存的连接'),
        React.createElement(
          'button',
          {
            className: 'add-connection-btn',
            onClick: () => this.toggleView('form')
          },
          '添加连接'
        )
      );
    }
    
    return React.createElement(
      'div',
      { className: 'saved-connections-list' },
      React.createElement(
        'div',
        { className: 'list-header' },
        React.createElement('h3', null, '保存的连接'),
        React.createElement(
          'span',
          { className: 'connection-count' },
          savedConnections.length
        )
      ),
      
      React.createElement(
        'div',
        { className: 'connections-grid' },
        savedConnections.map(connection => (
          React.createElement(
            'div',
            {
              key: connection.id,
              className: ['connection-card', selectedConnectionId === connection.id ? 'selected' : ''].join(' ')
            },
            
            // 连接信息
            React.createElement(
              'div',
              { className: 'connection-info' },
              React.createElement(
                'div',
                { className: 'connection-name' },
                connection.name
              ),
              React.createElement(
                'div',
                { className: 'connection-url' },
                connection.url.length > 40 
                  ? connection.url.substring(0, 40) + '...' 
                  : connection.url
              ),
              connection.username && React.createElement(
                'div',
                { className: 'connection-username' },
                '用户: ',
                connection.username
              )
            ),
            
            // 操作按钮
            React.createElement(
              'div',
              { className: 'connection-card-actions' },
              React.createElement(
                'button',
                {
                  className: 'load-btn',
                  onClick: () => this.loadConnection(connection),
                  title: '加载这个连接'
                },
                '加载'
              ),
              React.createElement(
                'button',
                {
                  className: 'delete-btn',
                  onClick: () => this.deleteConnection(connection.id),
                  title: '删除这个连接'
                },
                '删除'
              )
            )
          )
        ))
      )
    );
  }
  
  // 渲染连接状态
  renderConnectionStatus() {
    const { connectionStatus } = this.state;
    
    let statusIcon, statusText, statusClass;
    
    switch (connectionStatus) {
      case 'connected':
        statusIcon = '✅';
        statusText = '已连接';
        statusClass = 'status-connected';
        break;
      case 'connecting':
        statusIcon = '⏳';
        statusText = '连接中...';
        statusClass = 'status-connecting';
        break;
      case 'error':
        statusIcon = '❌';
        statusText = '连接失败';
        statusClass = 'status-error';
        break;
      default:
        statusIcon = '🔌';
        statusText = '未连接';
        statusClass = 'status-disconnected';
    }
    
    return React.createElement(
      'div',
      { className: ['connection-status', statusClass].join(' ') },
      React.createElement('span', { className: 'status-icon' }, statusIcon),
      React.createElement('span', { className: 'status-text' }, statusText)
    );
  }
  
  // 渲染主界面
  render() {
    const { showConnectionForm, showSavedList } = this.state;
    
    return React.createElement(
      'div',
      { className: 'connection-panel' },
      
      // 面板标题和状态
      React.createElement(
        'div',
        { className: 'panel-header' },
        React.createElement(
          'h2',
          null,
          '连接设置'
        ),
        this.renderConnectionStatus()
      ),
      
      // 视图切换按钮
      React.createElement(
        'div',
        { className: 'view-tabs' },
        React.createElement(
          'button',
          {
            className: ['tab-btn', showConnectionForm ? 'active' : ''].join(' '),
            onClick: () => this.toggleView('form')
          },
          '连接设置'
        ),
        React.createElement(
          'button',
          {
            className: ['tab-btn', showSavedList ? 'active' : ''].join(' '),
            onClick: () => this.toggleView('saved')
          },
          '保存的连接'
        )
      ),
      
      // 内容区域
      React.createElement(
        'div',
        { className: 'panel-content' },
        showConnectionForm && this.renderConnectionForm(),
        showSavedList && this.renderSavedConnections()
      ),
      
      // 连接帮助
      React.createElement(
        'div',
        { className: 'connection-help' },
        React.createElement(
          'details',
          null,
          React.createElement(
            'summary',
            null,
            '连接帮助'
          ),
          React.createElement(
            'div',
            { className: 'help-content' },
            React.createElement(
              'p',
              null,
              '常见连接格式:'
            ),
            React.createElement(
              'ul',
              null,
              React.createElement('li', null, '本地Elasticsearch: http://localhost:9200'),
              React.createElement('li', null, 'AWS OpenSearch: https://your-domain.region.es.amazonaws.com'),
              React.createElement('li', null, '带认证的服务: http://username:password@your-domain:port')
            ),
            React.createElement(
              'p',
              null,
              '注意: 请确保您的Elasticsearch或OpenSearch服务已启用CORS（跨域资源共享），否则连接可能失败。'
            )
          )
        )
      )
    );
  }
}

module.exports = ConnectionPanel;