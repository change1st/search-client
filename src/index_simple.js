// 简化版应用入口，使用直接的导入方式
console.log('开始加载简化版应用...');

// 确保process和require可用
if (typeof process !== 'undefined') {
  console.log('Process对象可用');
  const path = require('path');
  const fs = require('fs');
  
  // 获取当前脚本的目录
  const __dirname = path.dirname(require.main.filename);
  console.log('当前脚本目录:', __dirname);
  
  // 检查App.js文件是否存在
  const appFilePath = path.join(__dirname, 'App.js');
  console.log('App.js文件路径:', appFilePath);
  console.log('App.js文件是否存在:', fs.existsSync(appFilePath));
  
  // 尝试读取文件内容验证
  try {
    const appFileContent = fs.readFileSync(appFilePath, 'utf8');
    console.log('App.js文件内容前50个字符:', appFileContent.substring(0, 50));
  } catch (readError) {
    console.error('读取App.js失败:', readError.message);
  }
}

// 直接使用require导入
const React = require('react');
const ReactDOM = require('react-dom');

// 使用绝对路径导入App
const path = require('path');
const App = require(path.join(__dirname, 'src', 'App'));

console.log('所有模块导入成功!');

// 渲染应用
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('找到root元素，开始渲染...');
  ReactDOM.render(
    React.createElement(React.StrictMode, null,
      React.createElement(App, null)
    ),
    rootElement
  );
  console.log('应用渲染完成!');
} else {
  console.error('未找到root元素!');
}