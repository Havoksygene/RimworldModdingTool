'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  importAssets: (opts) => ipcRenderer.invoke('assets:import', opts),
  onImportProgress: (cb) => ipcRenderer.on('assets:progress', (_e, p) => cb(p)),
  openAppFolder: (which) => ipcRenderer.invoke('app:open-folder', which),
  autoDetectGame: () => ipcRenderer.invoke('game:auto'),
  addSources: (category) => ipcRenderer.invoke('game:add', category),
  setSourceCategory: (i, category) => ipcRenderer.invoke('game:set-category', i, category),
  removeSource: (i) => ipcRenderer.invoke('game:remove', i),
  readImage: (p) => ipcRenderer.invoke('img:read', p),
  pickImages: () => ipcRenderer.invoke('img:pick-many'),
  groupPaths: (paths) => ipcRenderer.invoke('img:group', paths),
  facingsFor: (p) => ipcRenderer.invoke('img:facings', p),
  watchFiles: (paths) => ipcRenderer.invoke('file:watch', paths),
  onFileChanged: (cb) => ipcRenderer.on('file:changed', (_e, p) => cb(p)),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
  openJson: () => ipcRenderer.invoke('file:open-json'),
  scanDefs: () => ipcRenderer.invoke('defs:scan'),
  pathForFile: (file) => webUtils.getPathForFile(file),
  exportMod: (payload) => ipcRenderer.invoke('mod:export', payload),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  openUpdate: (url) => ipcRenderer.invoke('update:open', url),
  findLogs: () => ipcRenderer.invoke('log:find'),
  pickLog: () => ipcRenderer.invoke('log:pick'),
  readLog: (p) => ipcRenderer.invoke('log:read', p),
  appInfo: () => ipcRenderer.invoke('app:info'),
});
