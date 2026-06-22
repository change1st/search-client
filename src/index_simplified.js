// 简洁可靠的应用入口文件

// 简单的错误捕获
window.onerror = function(message, source, lineno, colno, error) {
  console.error('应用错误:', message);
  console.error('错误位置:', source, '行:', lineno);
  return true;
};

console.log('=== 应用启动 ===');

try {
  // 导入React和ReactDOM
  const React = require('react');
  const ReactDOM = require('react-dom');
  console.log('React和ReactDOM导入成功');
  
  // 导入App组件 - 使用相对路径
  // 注意：在Electron渲染进程中，require相对路径基于index.html目录
  const App = require('./src/App');
  console.log('App组件导入成功');

  // 错误边界：任何子组件渲染出错时显示兜底界面，避免整页白屏/崩溃
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
      this.handleReset = this.handleReset.bind(this);
    }

    static getDerivedStateFromError(error) {
      return { error };
    }

    componentDidCatch(error, info) {
      console.error('渲染错误被错误边界捕获:', error, info);
    }

    handleReset() {
      this.setState({ error: null });
    }

    render() {
      if (this.state.error) {
        return React.createElement(
          'div',
          { className: 'error-boundary' },
          React.createElement('h2', null, '应用出现错误'),
          React.createElement('p', { className: 'error-boundary-message' }, this.state.error.message || String(this.state.error)),
          React.createElement(
            'div',
            { className: 'error-boundary-actions' },
            React.createElement('button', { onClick: this.handleReset }, '重试'),
            React.createElement('button', { onClick: () => window.location.reload() }, '重新加载')
          )
        );
      }
      return this.props.children;
    }
  }

  // 渲染应用
  const rootElement = document.getElementById('root');
  if (rootElement) {
    console.log('找到root元素，开始渲染');
    ReactDOM.render(
      React.createElement(ErrorBoundary, null, React.createElement(App)),
      rootElement
    );
    console.log('应用渲染完成');
  } else {
    console.error('未找到root元素');
  }
} catch (error) {
  console.error('应用初始化失败:', error.message);
  console.error('错误堆栈:', error.stack);
  
  // 在页面上显示错误
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding: 20px; background: #ff4444; color: white; font-family: Arial;';
  errorDiv.textContent = '应用启动失败: ' + error.message;
  document.body.appendChild(errorDiv);
}