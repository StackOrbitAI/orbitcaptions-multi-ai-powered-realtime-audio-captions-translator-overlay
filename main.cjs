const { app, BrowserWindow, ipcMain, session, desktopCapturer, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 180,
    x: 300,
    y: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Make it float over everything, even fullscreen apps
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.center(); // Force the window to center on startup

  // Load failure logging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load URL: ${validatedURL}, Error Code: ${errorCode}, Description: ${errorDescription}`);
    // If local dev server failed to respond immediately, retry after a second
    if (isDev && validatedURL === 'http://localhost:5173/') {
      console.log('Retrying connection to Dev Server in 1.5s...');
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:5173/');
      }, 1500);
    }
  });

  // Render process logs forwarding
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Browser Console] ${message} (${sourceId}:${line})`);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' }); // Removed to prevent dev pannel from opening by default
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // Automatically grant microphone permissions for the app
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture') {
      return callback(true);
    }
    callback(false);
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.handle('get-desktop-source-id', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    if (sources.length > 0) {
      return sources[0].id;
    }
  } catch (e) {
    console.error("Error getting desktop sources:", e);
  }
  return null;
});

ipcMain.handle('save-file', async (event, { content, filename }) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (filePath) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    }
    return { success: false, cancelled: true };
  } catch (e) {
    console.error("IPC save-file error:", e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-file-silent', async (event, { content, filename }) => {
  try {
    const docsPath = app.getPath('documents');
    const orbitCaptionsDir = path.join(docsPath, 'OrbitAI-Captions');
    if (!fs.existsSync(orbitCaptionsDir)) {
      fs.mkdirSync(orbitCaptionsDir, { recursive: true });
    }
    const fullPath = path.join(orbitCaptionsDir, filename);
    fs.writeFileSync(fullPath, content, 'utf-8');
    return { success: true, filePath: fullPath };
  } catch (e) {
    console.error("IPC save-file-silent error:", e);
    return { success: false, error: e.message };
  }
});

ipcMain.on('set-always-on-top', (event, flag) => {
  try {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) {
      win.setAlwaysOnTop(flag, flag ? 'screen-saver' : 'normal');
    }
  } catch (e) {
    console.error("IPC set-always-on-top error:", e);
  }
});

ipcMain.on('resize-window', (event, { width, height }) => {
  try {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) {
      win.setSize(width, height);
    }
  } catch (e) {
    console.error("IPC resize-window error:", e);
  }
});

ipcMain.handle('copy-to-clipboard', async (event, text) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (e) {
    console.error("IPC copy-to-clipboard error:", e);
    return { success: false, error: e.message };
  }
});

