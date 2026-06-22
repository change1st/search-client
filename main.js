const { app, BrowserWindow, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

// 保持对window对象的全局引用，如果不这样做，当JavaScript对象被垃圾回收时，
// window将会自动关闭
let mainWindow;

function createWindow() {
  console.log('创建浏览器窗口...');
  // 创建浏览器窗口 - 使用最简配置
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'search-client',
    // 使用更小尺寸 PNG 作为窗口图标（更贴近默认视觉）
    icon: path.join(__dirname, 'assets', 'icon-128.png'),
    webPreferences: {
      // 启用node集成以支持require语句
      nodeIntegration: true,
      // 禁用上下文隔离以确保require可用
      contextIsolation: false,
      devTools: true
    }
  });

  // 加载应用的index.html
  // 直接加载本地index.html文件
  const urlToLoad = `file://${path.join(__dirname, 'index.html')}`;
    
  mainWindow.loadURL(urlToLoad);
  console.log('加载index.html完成');

  
  
  // 监听页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成');
  });
  
  // 监听渲染进程崩溃事件
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('渲染进程崩溃:', killed ? '被杀死' : '意外崩溃');
  });
  
  // 创建菜单
  createMenu();

  // 当window被关闭，这个事件会被触发
  mainWindow.on('closed', function () {
    // 取消引用window对象，如果你的应用支持多窗口的话，
    // 通常会把多个window对象存放在一个数组里，
    // 与此同时，你应该删除相应的元素
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: '应用',
      submenu: [
        {
          label: '关于应用',
          click: () => {
            // 显示关于对话框
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.send('show-about-dialog');
            }
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => { app.quit(); },
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click: () => { 
            if (mainWindow) { 
              mainWindow.reload(); 
            }
          },
        },
        { type: 'separator' },
        {
          label: '开发者工具',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => { 
            if (mainWindow && mainWindow.webContents) { 
              mainWindow.webContents.toggleDevTools(); 
            }
          },
        },
      ],
    },
  ];

  // 在macOS上，第一个菜单应该是应用名称而不是"应用"
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Electron会在初始化后并准备
// 创建浏览器窗口时，调用这个函数
// 部分API在ready事件触发后才能使用
app.whenReady().then(() => {
  console.log('应用准备就绪');
  // 在 macOS 上设置 Dock 图标（使用更小主体比例的 PNG）
  if (process.platform === 'darwin' && app.dock && typeof app.dock.setIcon === 'function') {
    try {
      const dockPath = path.join(__dirname, 'assets', 'dock_icon_512.png');
      const img = nativeImage.createFromPath(dockPath);
      app.dock.setIcon(img);
      console.log('已设置 Dock 图标:', dockPath);
    } catch (e) {
      console.warn('设置 Dock 图标失败:', e && e.message ? e.message : e);
    }
  }
  createWindow();
});

// 当全部窗口关闭时退出。
app.on('window-all-closed', function () {
  // 在macOS上，除非用户用Cmd + Q确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') {
    console.log('应用退出');
    app.quit();
  }
});

app.on('activate', function () {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，
  // 通常在应用中重新创建一个窗口
  if (mainWindow === null) {
    console.log('重新创建窗口');
    createWindow();
  }
});

// 在这个文件中，你可以续写应用剩下主进程代码，
// 也可以拆分成几个文件，然后用require导入。

// 添加错误处理
app.on('error', (error) => {
  console.error('应用错误:', error);
});

// 防止在macOS上应用程序崩溃
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});
