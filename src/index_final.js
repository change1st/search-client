// 最终版应用入口文件 - 确保所有模块正确导入

// 全局错误捕获
window.onerror = function(message, source, lineno, colno, error) {
  console.error('全局错误:', message);
  console.error('错误堆栈:', error ? error.stack : '无堆栈信息');
  return true;
};

process.on('uncaughtException', function(error) {
  console.error('未捕获的异常:', error.message);
  console.error('异常堆栈:', error.stack);
});

console.log('=== ES/OpenSearch查询工具启动 ===');

// 确保Node.js环境可用
if (typeof require === 'undefined') {
  console.error('❌ 错误: require函数不可用，Node.js集成可能未启用');
  // 在全局作用域中不能使用return，改为抛出异常或继续执行
  throw new Error('Node.js集成未启用，无法继续执行');
}

// 基础模块导入 - 使用require.resolve确保路径正确
const path = require('path');
const fs = require('fs');

// 获取当前目录的绝对路径
const __dirname = path.dirname(require.main ? require.main.filename : process.cwd());
console.log('📁 当前工作目录:', process.cwd());
console.log('📄 脚本目录:', __dirname);

// 检查并导入核心模块
try {
  console.log('📦 开始导入核心模块...');
  
  // 导入React
  console.log('   → 导入React...');
  const React = require('react');
  console.log('   ✓ React导入成功:', typeof React);
  
  // 导入ReactDOM
  console.log('   → 导入ReactDOM...');
  const ReactDOM = require('react-dom');
  console.log('   ✓ ReactDOM导入成功:', typeof ReactDOM);
  
  // 导入App组件 - 使用绝对路径
  console.log('   → 导入App组件...');
  const appFilePath = path.join(__dirname, 'App.js');
  console.log('   → App.js路径:', appFilePath);
  
  if (fs.existsSync(appFilePath)) {
    console.log('   ✓ App.js文件存在');
    const App = require(appFilePath);
    console.log('   ✓ App组件导入成功:', typeof App);
    
    // 验证App是React组件
    if (typeof App === 'function' && App.prototype && App.prototype.isReactComponent) {
      console.log('   ✓ 确认App是React组件');
    } else {
      console.warn('   ⚠️ App不是标准React组件');
    }
    
    // 查找并渲染到root元素
    console.log('🔍 查找root元素...');
    const rootElement = document.getElementById('root');
    
    if (rootElement) {
      console.log('✅ 找到root元素:', rootElement);
      console.log('🚀 开始渲染应用...');
      
      try {
        ReactDOM.render(
          React.createElement(React.StrictMode, null,
            React.createElement(App, null)
          ),
          rootElement
        );
        console.log('🎉 应用渲染成功!');
        console.log('=== 应用启动完成 ===');
      } catch (renderError) {
        console.error('❌ 应用渲染失败:', renderError.message);
        console.error('渲染错误堆栈:', renderError.stack);
      }
    } else {
      console.error('❌ 未找到root元素! 无法渲染应用');
    }
  } else {
    console.error('❌ App.js文件不存在!');
  }
  
} catch (importError) {
  console.error('❌ 模块导入失败:', importError.message);
  console.error('导入错误堆栈:', importError.stack);
  
  // 显示错误信息在页面上
  const errorElement = document.createElement('div');
  errorElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 20px;
    background: #ff4444;
    color: white;
    font-family: Arial;
    z-index: 9999;
  `;
  errorElement.innerHTML = `
    <h2>应用启动失败</h2>
    <p>错误信息: ${importError.message}</p>
    <p>请检查控制台获取更多详情</p>
  `;
  document.body.appendChild(errorElement);
}