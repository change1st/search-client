// preload.js

// 所有Node.js API都可以在预加载过程中使用
const { ipcRenderer } = require('electron');

// 当contextIsolation为false时，直接挂载到window对象
window.electronAPI = {
  // 向主进程发送消息
  sendMessage: (channel, data) => {
    // 白名单通道，防止不安全的通信
    const validChannels = [
      'show-about-dialog',
      'export-results',
      'save-connection-config',
      'load-connection-config'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`尝试发送消息到未授权的通道: ${channel}`);
    }
  },
  
  // 从主进程接收消息
  receiveMessage: (channel, callback) => {
    const validChannels = [
      'about-dialog-closed',
      'export-complete',
      'connection-config-loaded',
      'show-error-message'
    ];
    if (validChannels.includes(channel)) {
      // 移除之前的监听器，避免重复和内存泄漏
      ipcRenderer.removeAllListeners(channel);
      // 添加新的监听器
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    } else {
      console.warn(`尝试接收来自未授权通道的消息: ${channel}`);
    }
  },
  
  // 一次性消息接收
  receiveOnceMessage: (channel, callback) => {
    const validChannels = [
      'about-dialog-closed',
      'export-complete',
      'connection-config-loaded',
      'show-error-message'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    } else {
      console.warn(`尝试一次性接收来自未授权通道的消息: ${channel}`);
    }
  },
  
  // 环境信息
  isDev: process.env.NODE_ENV === 'development',
  
  // 平台信息
  platform: process.platform,
  
  // 应用信息
  appInfo: {
    name: process.env.npm_package_name || 'search-client',
    version: process.env.npm_package_version || '1.0.0'
  }
};

// 设置全局变量和初始化操作
window.addEventListener('DOMContentLoaded', () => {
  // 页面已经加载完成，可以执行一些初始化操作
  console.log('Electron preload script loaded');
  
  // 检测环境
  if (process.env.NODE_ENV === 'development') {
    console.log('运行在开发环境中');
  } else {
    console.log('运行在生产环境中');
  }
});

// 添加错误处理
process.on('uncaughtException', (error) => {
  console.error('Preload脚本未捕获的异常:', error);
});
