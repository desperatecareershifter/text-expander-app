const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const store = require('./store');
const { ExpansionEngine } = require('./expander');

const ICON_PATH = path.join(__dirname, '..', 'build', 'icon.ico');

let mainWindow = null;
let tray = null;
let engine = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    title: 'SnapExpand',
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Minimize to tray instead of closing, so the expander keeps running.
  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const image = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(image.isEmpty() ? undefined : image);
  tray.setToolTip('SnapExpand — text expander');

  const rebuildMenu = () => {
    const settings = store.getSettings();
    const menu = Menu.buildFromTemplate([
      { label: 'Open SnapExpand', click: () => mainWindow.show() },
      { type: 'separator' },
      {
        label: 'Expansion enabled',
        type: 'checkbox',
        checked: settings.enabled,
        click: (item) => {
          store.updateSettings({ enabled: item.checked });
          notifySettingsChanged();
          rebuildMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit SnapExpand',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(menu);
  };

  tray.on('click', () => mainWindow.show());
  rebuildMenu();
}

function notifySettingsChanged() {
  if (mainWindow) mainWindow.webContents.send('settings-changed', store.getSettings());
}

function notifyShortcutsChanged() {
  if (mainWindow) mainWindow.webContents.send('shortcuts-changed', store.getShortcuts());
}

function setupEngine() {
  engine = new ExpansionEngine({
    getShortcuts: store.getShortcuts,
    getSettings: store.getSettings,
    onExpansion: (shortcut) => {
      if (mainWindow) mainWindow.webContents.send('expansion-fired', shortcut);
    },
    onError: (err) => {
      console.error('Expansion error:', err);
    }
  });
  engine.start();
}

// ---- IPC handlers -----------------------------------------------------

ipcMain.handle('shortcuts:list', () => store.getShortcuts());
ipcMain.handle('shortcuts:add', (e, payload) => {
  const result = store.addShortcut(payload);
  notifyShortcutsChanged();
  return result;
});
ipcMain.handle('shortcuts:update', (e, { id, payload }) => {
  const result = store.updateShortcut(id, payload);
  notifyShortcutsChanged();
  return result;
});
ipcMain.handle('shortcuts:delete', (e, id) => {
  store.deleteShortcut(id);
  notifyShortcutsChanged();
  return true;
});

ipcMain.handle('settings:get', () => store.getSettings());
ipcMain.handle('settings:update', (e, partial) => {
  const result = store.updateSettings(partial);
  notifySettingsChanged();
  return result;
});

ipcMain.handle('app:platform', () => process.platform);

// ---- Lifecycle ----------------------------------------------------------

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
    setupEngine();

    if (process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin: store.getSettings().launchAtLogin, openAsHidden: true });
    }
  });

  app.on('window-all-closed', () => {
    // Keep running in the tray; do not quit.
  });

  app.on('before-quit', () => {
    app.isQuiting = true;
    if (engine) engine.stop();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
}
