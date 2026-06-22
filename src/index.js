// 添加错误处理，捕获并输出所有错误
console.log('开始加载应用...');
console.log('当前脚本路径:', window.location.href);
console.log('当前工作目录:', process.cwd ? process.cwd() : 'process.cwd不可用');

try {
  console.log('导入React模块...');
  const React = require('react');
  console.log('React模块导入成功:', typeof React);
  
  console.log('导入ReactDOM模块...');
  const ReactDOM = require('react-dom');
  console.log('ReactDOM模块导入成功:', typeof ReactDOM);
  
  console.log('导入App模块...');
  // 使用完整路径导入App模块
  console.log('尝试导入./src/App...');
  try {
    const App = require('./src/App');
    console.log('App模块导入成功:', typeof App);
  } catch (appError) {
    console.error('导入./App失败:', appError.message);
    console.log('尝试使用绝对路径导入...');
    try {
      const path = require('path');
      const appPath = path.join(__dirname, 'src', 'App.js');
      console.log('计算的绝对路径:', appPath);
      const App = require(appPath);
      console.log('绝对路径导入成功:', typeof App);
    } catch (absError) {
      console.error('绝对路径导入失败:', absError.message);
    }
  }
  
  console.log('查找root元素...');
  const rootElement = document.getElementById('root');
  console.log('root元素:', rootElement);
  
  if (rootElement) {
    console.log('开始渲染应用...');
    ReactDOM.render(
      React.createElement(React.StrictMode, null,
        React.createElement(App, null)
      ),
      rootElement
    );
    console.log('应用渲染成功');
  } else {
    console.error('无法找到root元素');
  }
} catch (error) {
  console.error('应用启动错误:', error);
  console.error('错误堆栈:', error.stack);
}