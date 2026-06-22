const React = require('react');

class ConnectionDialog extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      host: '',
      port: 9200,
      username: '',
      password: '',
      useSSL: false,
      skipCertVerify: false,
      serverType: 'elasticsearch',
      name: ''
    };
    
    // 绑定方法
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }
  
  handleChange(e) {
    const { name, value, type, checked } = e.target;
    this.setState({
      [name]: type === 'checkbox' ? checked : value
    });
  }
  
  handleSubmit(e) {
    e.preventDefault();
    
    const connectionInfo = {
      ...this.state,
      port: parseInt(this.state.port, 10)
    };
    
    if (this.props.onConnect) {
      this.props.onConnect(connectionInfo);
    }
    
    if (this.props.onClose) {
      this.props.onClose();
    }
  }
  
  handleCancel() {
    if (this.props.onClose) {
      this.props.onClose();
    }
  }
  
  render() {
    if (!this.props.isOpen) {
      return null;
    }
    
    return React.createElement(
      'div',
      { className: 'dialog-overlay' },
      React.createElement(
        'div',
        { className: 'dialog-container' },
        React.createElement(
          'div',
          { className: 'dialog-header' },
          React.createElement(
            'h2',
            { className: 'dialog-title' },
            '连接到 ES/OpenSearch'
          ),
          React.createElement(
            'button',
            { className: 'close-button', onClick: this.handleCancel },
            '×'
          )
        ),
        React.createElement(
          'div',
          { className: 'dialog-content' },
          React.createElement(
            'form',
            { id: 'connection-form', onSubmit: this.handleSubmit, className: 'connection-form' },
            
            // 连接名称
            React.createElement(
              'div',
              { className: 'form-group' },
              React.createElement(
                'label',
                { htmlFor: 'connection-name' },
                '连接名称'
              ),
              React.createElement(
                'input',
                {
                  type: 'text',
                  id: 'connection-name',
                  name: 'name',
                  value: this.state.name,
                  onChange: this.handleChange,
                  placeholder: '例如: 本地 ES 实例',
                  required: true
                }
              )
            ),
            
            // 服务器类型
            React.createElement(
              'div',
              { className: 'form-group' },
              React.createElement(
                'label',
                { htmlFor: 'server-type' },
                '服务器类型'
              ),
              React.createElement(
                'select',
                {
                  id: 'server-type',
                  name: 'serverType',
                  value: this.state.serverType,
                  onChange: this.handleChange
                },
                React.createElement(
                  'option',
                  { value: 'elasticsearch' },
                  'Elasticsearch'
                ),
                React.createElement(
                  'option',
                  { value: 'opensearch' },
                  'OpenSearch'
                )
              )
            ),
            
            // 主机地址
            React.createElement(
              'div',
              { className: 'form-group' },
              React.createElement(
                'label',
                { htmlFor: 'host' },
                '主机地址'
              ),
              React.createElement(
                'input',
                {
                  type: 'text',
                  id: 'host',
                  name: 'host',
                  value: this.state.host,
                  onChange: this.handleChange,
                  placeholder: '例如: localhost',
                  required: true
                }
              )
            ),
            
            // 端口
            React.createElement(
              'div',
              { className: 'form-group' },
              React.createElement(
                'label',
                { htmlFor: 'port' },
                '端口'
              ),
              React.createElement(
                'input',
                {
                  type: 'number',
                  id: 'port',
                  name: 'port',
                  value: this.state.port,
                  onChange: this.handleChange,
                  min: 1,
                  max: 65535,
                  required: true
                }
              )
            ),
            
            // 使用SSL
            React.createElement(
              'div',
              { className: 'form-group checkbox-group' },
              React.createElement(
                'label',
                { className: 'checkbox-label' },
                React.createElement(
                  'input',
                  {
                    type: 'checkbox',
                    name: 'useSSL',
                    checked: this.state.useSSL,
                    onChange: this.handleChange
                  }
                ),
                ' 使用 SSL 连接'
              )
            ),

            // 跳过证书验证（仅用于自签名/测试环境）
            React.createElement(
              'div',
              { className: 'form-group checkbox-group' },
              React.createElement(
                'label',
                { className: 'checkbox-label' },
                React.createElement(
                  'input',
                  {
                    type: 'checkbox',
                    name: 'skipCertVerify',
                    checked: this.state.skipCertVerify,
                    onChange: this.handleChange
                  }
                ),
                ' 跳过证书验证（自签名证书时使用）'
              )
            ),
            
            // 认证信息 (可选)
            React.createElement(
              'div',
              { className: 'auth-section' },
              React.createElement(
                'h3',
                null,
                '认证信息 (可选)'
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
                React.createElement(
                  'input',
                  {
                    type: 'text',
                    id: 'username',
                    name: 'username',
                    value: this.state.username,
                    onChange: this.handleChange,
                    placeholder: '用户名'
                  }
                )
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
                  'input',
                  {
                    type: 'password',
                    id: 'password',
                    name: 'password',
                    value: this.state.password,
                    onChange: this.handleChange,
                    placeholder: '密码'
                  }
                )
              )
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'dialog-footer' },
          React.createElement(
            'button',
            { 
              type: 'button', 
              className: 'cancel-button', 
              onClick: this.handleCancel 
            },
            '取消'
          ),
          React.createElement(
            'button',
            { 
              type: 'submit',
              form: 'connection-form',
              className: 'connect-button'
            },
            '连接'
          )
        )
      )
    );
  }
}

module.exports = ConnectionDialog;