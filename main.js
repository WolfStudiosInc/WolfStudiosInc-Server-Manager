const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const net = require('net');

const dev = !app.isPackaged;
const dir = path.join(__dirname);
const nextApp = next({ dev, dir });
const handle = nextApp.getRequestHandler();

let mainWindow;

// Auto-updater config
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
if (dev) autoUpdater.forceDevUpdateConfig = false;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function createWindow() {
  await nextApp.prepare();

  const port = await getFreePort();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(port, '127.0.0.1', () => {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 960,
      minHeight: 600,
      title: 'WolfStudiosInc Server Manager',
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    mainWindow.loadURL(`http://127.0.0.1:${port}`);

    // Auto-update events forwarded to renderer
    autoUpdater.on('update-available', info => {
      mainWindow && mainWindow.webContents.send('update-available', info);
    });
    autoUpdater.on('update-not-available', () => {
      mainWindow && mainWindow.webContents.send('update-not-available');
    });
    autoUpdater.on('download-progress', prog => {
      mainWindow && mainWindow.webContents.send('download-progress', prog);
    });
    autoUpdater.on('update-downloaded', info => {
      mainWindow && mainWindow.webContents.send('update-downloaded', info);
    });
    autoUpdater.on('error', err => {
      mainWindow && mainWindow.webContents.send('update-error', err.message);
    });

    // Check for updates after window loads (packaged only)
    if (!dev) {
      mainWindow.webContents.once('did-finish-load', () => {
        autoUpdater.checkForUpdates().catch(() => {});
      });
    }
  });
}

// ── Window control IPC ─────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow && mainWindow.close());

// ── Updater IPC ────────────────────────────────────────────────────────────
ipcMain.on('check-for-updates', event => {
  if (dev) {
    event.sender.send('update-not-available');
    return;
  }
  autoUpdater.checkForUpdates().catch(err => {
    event.sender.send('update-error', err.message);
  });
});
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});
ipcMain.handle('get-version', () => app.getVersion());

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
