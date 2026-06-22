const React = require('react');

class StatusBar extends React.Component {
  render() {
    const { connected, connectionInfo, serverType, serverVersion } = this.props;
    
    return React.createElement(
      'footer',
      { className: 'status-bar' },
      React.createElement(
        'div',
        { className: 'status-left' },
        React.createElement(
          'div',
          { className: 'connection-status' },
          React.createElement(
            'span',
            { className: `status-indicator ${connected ? 'connected' : 'disconnected'}` },
            ''
          ),
          React.createElement(
            'span',
            { className: 'status-text' },
            connected ? '已连接' : '未连接'
          )
        ),
        connected && connectionInfo && React.createElement(
          'span',
          { className: 'connection-info' },
          connectionInfo.name || `${connectionInfo.host}:${connectionInfo.port}`
        )
      ),
      React.createElement(
        'div',
        { className: 'status-right' },
        connected && serverType && React.createElement(
          'span',
          { className: 'server-info' },
          serverType === 'elasticsearch' ? 'Elasticsearch' : 'OpenSearch',
          serverVersion ? ` v${serverVersion}` : ''
        )
      )
    );
  }
}

module.exports = StatusBar;