const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('snapExpand', {
  listShortcuts: () => ipcRenderer.invoke('shortcuts:list'),
  addShortcut: (payload) => ipcRenderer.invoke('shortcuts:add', payload),
  updateShortcut: (id, payload) => ipcRenderer.invoke('shortcuts:update', { id, payload }),
  deleteShortcut: (id) => ipcRenderer.invoke('shortcuts:delete', id),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial) => ipcRenderer.invoke('settings:update', partial),

  getPlatform: () => ipcRenderer.invoke('app:platform'),

  onShortcutsChanged: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('shortcuts-changed', listener);
    return () => ipcRenderer.removeListener('shortcuts-changed', listener);
  },
  onSettingsChanged: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('settings-changed', listener);
    return () => ipcRenderer.removeListener('settings-changed', listener);
  },
  onExpansionFired: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('expansion-fired', listener);
    return () => ipcRenderer.removeListener('expansion-fired', listener);
  }
});
