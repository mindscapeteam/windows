const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('node:path');
const AutoLaunch = require('auto-launch');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32' && require('electron-squirrel-startup')) {
  app.quit();
}

// Auto-update from GitHub Releases
const { updateElectronApp } = require('update-electron-app');
updateElectronApp({
  repo: 'mindscapeteam/windows',
  updateInterval: '1 hour',
});

const PRODUCTION_URL = 'https://mindscapehealth.org/dashboard';

let mainWindow = null;
let tray = null;

const autoLauncher = new AutoLaunch({
  name: 'MindScape',
  isHidden: true,
});

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: isMac, // macOS uses native frame with hidden titlebar
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,
    transparent: false,
    backgroundColor: '#ffffff',
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(PRODUCTION_URL);

  // Inject drag region, window controls, and page fixes
  mainWindow.webContents.on('did-finish-load', () => {
    const commonCSS = `
      .auth-container {
        height: 100vh !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }
      .auth-form-container {
        overflow-y: auto !important;
      }
    `;

    if (isMac) {
      // macOS: just add a drag region for the hidden titlebar area
      mainWindow.webContents.insertCSS(commonCSS + `
        body::before {
          content: '';
          position: fixed; top: 0; left: 0; right: 0; height: 38px;
          -webkit-app-region: drag; z-index: 99999;
          pointer-events: none;
        }
      `);
    } else {
      // Windows: custom frameless window controls
      mainWindow.webContents.insertCSS(commonCSS + `
        #electron-drag-bar {
          position: fixed; top: 0; left: 0; right: 130px; height: 32px;
          -webkit-app-region: drag; z-index: 99999;
        }
        #electron-window-controls {
          position: fixed; top: 4px; right: 8px; z-index: 100000;
          display: flex; gap: 2px;
        }
        #electron-window-controls button {
          width: 32px; height: 28px; border: none; border-radius: 6px;
          background: transparent; color: #64748b; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        #electron-window-controls button:hover { background: rgba(0,0,0,0.08); color: #1e293b; }
        #electron-window-controls button.close-btn:hover { background: #ef4444; color: #fff; }
      `);
      mainWindow.webContents.executeJavaScript(`
        (function() {
          if (document.getElementById('electron-drag-bar')) return;

          var bar = document.createElement('div');
          bar.id = 'electron-drag-bar';
          document.body.appendChild(bar);

          var controls = document.createElement('div');
          controls.id = 'electron-window-controls';

          var minBtn = document.createElement('button');
          minBtn.title = 'Minimize';
          minBtn.innerHTML = '<svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>';
          minBtn.addEventListener('click', function() { window.electronAPI.minimize(); });

          var maxBtn = document.createElement('button');
          maxBtn.title = 'Maximize';
          maxBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
          maxBtn.addEventListener('click', function() { window.electronAPI.maximize(); });

          var closeBtn = document.createElement('button');
          closeBtn.title = 'Close';
          closeBtn.className = 'close-btn';
          closeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.4"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.4"/></svg>';
          closeBtn.addEventListener('click', function() { window.electronAPI.close(); });

          controls.appendChild(minBtn);
          controls.appendChild(maxBtn);
          controls.appendChild(closeBtn);
          document.body.appendChild(controls);
        })();
      `);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('MindScape');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open MindScape',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Start on Login',
      type: 'checkbox',
      checked: true,
      click: async (menuItem) => {
        if (menuItem.checked) {
          await autoLauncher.enable();
        } else {
          await autoLauncher.disable();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// IPC handlers for window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

// Handle new window requests
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Allow Google/Firebase auth popups to open inside Electron
    if (
      url.includes('accounts.google.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('firebaseauth') ||
      url.includes('mindscapehealth.org')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 700,
          icon: path.join(__dirname, 'assets', 'icon.png'),
          title: 'MindScape - Sign In',
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
          },
        },
      };
    }
    // Everything else opens in the default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

app.whenReady().then(async () => {
  createWindow();
  createTray();

  // Enable auto-launch by default on first run
  const isEnabled = await autoLauncher.isEnabled();
  if (!isEnabled) {
    await autoLauncher.enable();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
