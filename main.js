'use strict';
const os = require('os');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const idx = require('./lib/indexer');
const upd = require('./lib/update');

const SETTINGS = () => path.join(app.getPath('userData'), 'settings.json');
const ALLOWED_IMG = /\.(png|jpe?g|dds(\.split)?)$/i;
const IMG_FILTER = [{ name: 'Images (png, jpg, dds)', extensions: ['png', 'jpg', 'jpeg', 'dds'] }];
let win = null;

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS(), 'utf8'));
  } catch {
    return {};
  }
}
function saveSettings(patch) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS()), { recursive: true });
    fs.writeFileSync(SETTINGS(), JSON.stringify({ ...loadSettings(), ...patch }, null, 2));
  } catch {
    /* non-fatal */
  }
}

const cleanCategory = (c) => (idx.CATEGORIES.includes(c) ? c : 'auto');

// Saved folders: [{ path, category }]. Older versions saved plain path strings.
function getSources() {
  const s = loadSettings();
  const raw = Array.isArray(s.sources) ? s.sources : s.gameDir ? [s.gameDir] : [];
  const out = [];
  for (const item of raw) {
    const p = typeof item === 'string' ? item : item && item.path;
    if (typeof p !== 'string' || !p) continue;
    out.push({ path: p, category: cleanCategory(typeof item === 'string' ? 'auto' : item.category) });
  }
  return out;
}

// The app's own folders (in Documents, easy to find, back up or compress): one library folder per kind of sprite, and a Mods folder.
// Drop .png / .png.dds files into the matching folder and they show up in the library, no setup needed.
const APP_DIR = () => process.env.RSV_APP_DIR || path.join(app.getPath('documents'), 'RimWorldSpriteViewer');
const LIB_FOLDERS = [
  ['Bodies', 'bodies'],
  ['Heads', 'heads'],
  ['Hair', 'hair'],
  ['Beards', 'beards'],
  ['Apparel-Body', 'apparel-body'],
  ['Apparel-Head', 'apparel-head'],
  ['Weapons', 'weapons'],
  ['Genes', 'genes'],
];
function ensureAppFolders() {
  const base = APP_DIR();
  try {
    for (const [n] of LIB_FOLDERS) fs.mkdirSync(path.join(base, 'Library', n), { recursive: true });
    fs.mkdirSync(path.join(base, 'Mods'), { recursive: true });
    const note = path.join(base, 'READ-ME.txt');
    if (!fs.existsSync(note))
      fs.writeFileSync(
        note,
        'RimWorld Sprite Viewer folders\n\nLibrary/<kind>: put your extracted sprites here (PNG or .png.dds, with _south/_east/_north/_west). They appear in the viewer automatically.\n  Apparel-Body = clothes and armour, Apparel-Head = hats and helmets.\nMods: generated mods are saved here by default.\nThe whole folder can be zipped as a backup.\n',
      );
  } catch {
    /* read-only documents folder: the app still works with added folders */
  }
  return base;
}
const librarySources = () => LIB_FOLDERS.map(([n, category]) => ({ path: path.join(APP_DIR(), 'Library', n), category, library: true }));

// Scan every saved folder (plus the app's own library folders).
function scanSources(sources) {
  let r;
  ensureAppFolders();
  try {
    r = idx.scan([...sources, ...librarySources()]);
  } catch (e) {
    return { ok: false, error: 'Scan failed: ' + e.message, sources };
  }
  saveSettings({ sources });
  return {
    ok: true,
    sources,
    appDir: APP_DIR(),
    sourceInfo: r.sourceInfo,
    valid: r.valid,
    roots: r.roots,
    entries: r.entries,
    bodyTypes: r.bodyTypes,
    notes: r.notes,
    presets: r.presets,
  };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1100,
    minHeight: 650,
    backgroundColor: '#14161a',
    title: 'RimWorld Sprite Viewer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  // the page refuses to unload while work is unsaved; this is the question the user sees
  win.webContents.on('will-prevent-unload', (e) => {
    if (process.argv.includes('--smoke')) {
      e.preventDefault();
      return;
    } // automated runs never ask
    const r = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Go back', 'Close without saving'],
      defaultId: 0,
      cancelId: 0,
      title: 'Unsaved changes',
      message: 'You have changes that are not saved.',
      detail: 'Use Save project (or Save in the mod builder) first, or close and lose them.',
    });
    if (r === 1) e.preventDefault();
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// ---- IPC -------------------------------------------------------------
ipcMain.handle('game:auto', () => {
  let sources = getSources();
  if (!sources.length) {
    // first launch: add the first RimWorld install we can find (gives us the XML defs and any loose sprites)
    const found = idx.defaultGameDirs().find((d) => {
      try {
        return fs.statSync(d).isDirectory();
      } catch {
        return false;
      }
    });
    if (found) sources = [{ path: found, category: 'auto' }];
  }
  return scanSources(sources);
});

ipcMain.handle('game:add', async (_e, category) => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Add a folder: your RimWorld install, or a folder of sprites',
    properties: ['openDirectory', 'multiSelections'],
  });
  const current = getSources();
  if (res.canceled || !res.filePaths.length) return scanSources(current);
  const cat = cleanCategory(category);
  const next = [...current];
  for (const p of res.filePaths) if (!next.some((s) => s.path === p && s.category === cat)) next.push({ path: p, category: cat });
  return scanSources(next);
});

// Import the game's own art (Assets.zip of the core game and each DLC) into the Library folders.
ipcMain.handle('assets:import', async (_e, opts) => {
  const { importAssets, findArchives } = require('./lib/importer');
  let gameDir = opts && opts.gameDir;
  if (!gameDir) {
    const saved = loadSettings().assetsGameDir;
    const cands = [saved, ...idx.defaultGameDirs()].filter(Boolean);
    gameDir = cands.find((d) => findArchives(d).length);
  }
  if (!gameDir || (opts && opts.choose)) {
    const r = await dialog.showOpenDialog(win, {
      title: 'Choose your RimWorld folder (the one that contains Data and Assets.zip)',
      properties: ['openDirectory'],
    });
    if (r.canceled || !r.filePaths.length) return { ok: false, cancelled: true };
    gameDir = r.filePaths[0];
  }
  if (!findArchives(gameDir).length)
    return {
      ok: false,
      error: 'No Assets.zip found in ' + gameDir + ' (or its Data folder). Choose the RimWorld folder that contains Data.',
      gameDir,
    };
  saveSettings({ assetsGameDir: gameDir });
  ensureAppFolders();
  const res = await importAssets({
    gameDir,
    libDir: path.join(APP_DIR(), 'Library'),
    overwrite: !!(opts && opts.overwrite),
    onProgress: (p) => {
      try {
        win.webContents.send('assets:progress', p);
      } catch {
        /* window gone */
      }
    },
  });
  return { ok: true, gameDir, ...res };
});

ipcMain.handle('app:open-folder', async (_e, which) => {
  const base = ensureAppFolders();
  const dir = which === 'mods' ? path.join(base, 'Mods') : which === 'library' ? path.join(base, 'Library') : base;
  const err = await shell.openPath(dir);
  return { path: dir, error: err || null };
});

ipcMain.handle('game:set-category', (_e, index, category) => {
  const next = getSources();
  if (next[index]) next[index].category = cleanCategory(category);
  return scanSources(next);
});

ipcMain.handle('game:remove', (_e, index) => {
  return scanSources(getSources().filter((_, i) => i !== index));
});

ipcMain.handle('img:read', (_e, p) => {
  if (typeof p !== 'string' || !path.isAbsolute(p) || !ALLOWED_IMG.test(p)) throw new Error('Refused path');
  return fs.readFileSync(p);
});

// Choose one or several image files. Each chosen file is expanded to all its facings, and files of the
// same sprite are merged, so picking just "Head_south.png" (or all four) gives one sprite.
ipcMain.handle('img:pick-many', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Choose sprite image(s). Missing _south/_east/_north/_west files are found automatically',
    properties: ['openFile', 'multiSelections'],
    filters: IMG_FILTER,
  });
  if (res.canceled || !res.filePaths.length) return [];
  return idx.groupPaths(res.filePaths);
});

ipcMain.handle('img:group', (_e, paths) => {
  const ok = (Array.isArray(paths) ? paths : []).filter((p) => typeof p === 'string' && path.isAbsolute(p) && ALLOWED_IMG.test(p));
  return idx.groupPaths(ok);
});

ipcMain.handle('img:facings', (_e, p) => {
  if (typeof p !== 'string' || !path.isAbsolute(p) || !ALLOWED_IMG.test(p)) throw new Error('Refused path');
  return idx.siblingFacings(p);
});

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  platform: process.platform + ' ' + process.arch,
  settings: SETTINGS(),
}));

// Write a generated mod folder. Paths come from the renderer, so each one is checked before anything is written.
const SAFE_REL = /^[A-Za-z0-9_][A-Za-z0-9_ .\-]*(\/[A-Za-z0-9_][A-Za-z0-9_ .\-]*)*\.(xml|png|wav|ogg|mp3)$/;
ipcMain.handle('mod:export', async (_e, { folder, files }) => {
  if (typeof folder !== 'string' || !/^[A-Za-z0-9_\-]{1,64}$/.test(folder) || !Array.isArray(files) || !files.length)
    throw new Error('Bad export request');
  const res = await dialog.showOpenDialog(win, {
    title: "Choose where to create the mod folder (default: the app's Mods folder)",
    defaultPath: path.join(ensureAppFolders(), 'Mods'),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const target = path.join(res.filePaths[0], folder);
  const existed = fs.existsSync(target);
  let n = 0;
  for (const f of files) {
    if (!f || typeof f.path !== 'string' || !SAFE_REL.test(f.path) || f.path.includes('..')) throw new Error('Refused file path: ' + (f && f.path));
    const dest = path.join(target, ...f.path.split('/'));
    if (!dest.startsWith(target + path.sep)) throw new Error('Refused file path: ' + f.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (typeof f.base64 === 'string') fs.writeFileSync(dest, Buffer.from(f.base64, 'base64'));
    else if (typeof f.text === 'string') fs.writeFileSync(dest, f.text, 'utf8');
    else throw new Error('File has no content: ' + f.path);
    n++;
  }
  return { path: target, count: n, existed };
});


// ---- "update available": asks GitHub for the latest release (silent when offline) ----------------------------------------------
ipcMain.handle('update:check', async () => {
  try {
    const { net } = require('electron');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await net.fetch(upd.API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RimWorldSpriteViewer' }, signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return upd.fromRelease(await res.json(), app.getVersion());
  } catch {
    return null;
  }
});
ipcMain.handle('update:open', (e, url) => {
  if (upd.safeUrl(url)) shell.openExternal(url);
});

// ---- RimWorld game log (read only) ------------------------------------------------------------------------------------------
const LOG_DIR_NAME = path.join('Ludeon Studios', 'RimWorld by Ludeon Studios');
function logCandidates() {
  const home = os.homedir();
  const dirs = [];
  if (process.platform === 'win32') dirs.push(path.join(process.env.USERPROFILE || home, 'AppData', 'LocalLow', LOG_DIR_NAME));
  else if (process.platform === 'darwin') dirs.push(path.join(home, 'Library', 'Logs', LOG_DIR_NAME));
  else {
    dirs.push(path.join(home, '.config', 'unity3d', LOG_DIR_NAME));
    dirs.push(path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.config', 'unity3d', LOG_DIR_NAME));
    for (const steam of [path.join(home, '.local', 'share', 'Steam'), path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam')])
      dirs.push(path.join(steam, 'steamapps', 'compatdata', '294100', 'pfx', 'drive_c', 'users', 'steamuser', 'AppData', 'LocalLow', LOG_DIR_NAME));
  }
  const out = [];
  for (const d of dirs)
    for (const n of ['Player.log', 'Player-prev.log']) {
      try {
        const st = fs.statSync(path.join(d, n));
        if (st.isFile()) out.push({ path: path.join(d, n), mtime: st.mtimeMs, size: st.size, name: n });
      } catch {
        /* not there */
      }
    }
  return out.sort((a, b) => b.mtime - a.mtime);
}
const allowedLogs = new Set();
ipcMain.handle('log:find', () => {
  const c = logCandidates();
  for (const f of c) allowedLogs.add(f.path);
  return c;
});
ipcMain.handle('log:pick', async () => {
  const res = await dialog.showOpenDialog(win, { title: 'Choose the RimWorld log (Player.log)', properties: ['openFile'], filters: [{ name: 'Log files', extensions: ['log', 'txt'] }] });
  if (res.canceled || !res.filePaths[0]) return null;
  allowedLogs.add(res.filePaths[0]);
  const st = fs.statSync(res.filePaths[0]);
  return { path: res.filePaths[0], mtime: st.mtimeMs, size: st.size, name: path.basename(res.filePaths[0]) };
});
ipcMain.handle('log:read', (_e, p) => {
  if (typeof p !== 'string' || !allowedLogs.has(p)) throw new Error('Refused: not a log chosen in this app');
  const st = fs.statSync(p);
  const max = 12 * 1024 * 1024;
  const fd = fs.openSync(p, 'r');
  try {
    const len = Math.min(st.size, max);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, st.size - len);
    return { text: buf.toString('utf8'), truncated: st.size > max };
  } finally {
    fs.closeSync(fd);
  }
});

const watched = new Set();
ipcMain.handle('file:watch', (_e, paths) => {
  const wanted = new Set((paths || []).filter((p) => typeof p === 'string' && path.isAbsolute(p) && ALLOWED_IMG.test(p)));
  for (const p of [...watched]) {
    if (!wanted.has(p)) {
      fs.unwatchFile(p);
      watched.delete(p);
    }
  }
  for (const p of wanted) {
    if (watched.has(p)) continue;
    watched.add(p);
    fs.watchFile(p, { interval: 500 }, (cur, prev) => {
      if (cur.mtimeMs !== prev.mtimeMs && win && !win.isDestroyed()) win.webContents.send('file:changed', p);
    });
  }
});

ipcMain.handle('file:save', async (_e, { defaultName, filters, base64, text }) => {
  const res = await dialog.showSaveDialog(win, { defaultPath: defaultName, filters });
  if (res.canceled || !res.filePath) return null;
  if (base64 != null) fs.writeFileSync(res.filePath, Buffer.from(base64, 'base64'));
  else fs.writeFileSync(res.filePath, text ?? '', 'utf8');
  return res.filePath;
});

// Mod builder: read the Defs of other mods (to find animals / plants by stat). Returns the XML text; the page parses it.
ipcMain.handle('defs:scan', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Choose mod folder(s) to scan for animals and plants (the folders that contain Defs)',
    properties: ['openDirectory', 'multiSelections'],
  });
  if (res.canceled || !res.filePaths.length) return null;
  const files = [];
  const LIMIT = 6000;
  const walk = (dir, inDefs, depth) => {
    if (depth > 12 || files.length >= LIMIT) return;
    let list;
    try {
      list = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of list) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, inDefs || e.name.toLowerCase() === 'defs', depth + 1);
      else if (inDefs && /\.xml$/i.test(e.name) && files.length < LIMIT) {
        try {
          if (fs.statSync(full).size <= 3 * 1024 * 1024)
            files.push({ path: path.relative(res.filePaths[0], full), text: fs.readFileSync(full, 'utf8') });
        } catch {
          /* unreadable file: skip */
        }
      }
    }
  };
  for (const d of res.filePaths) walk(d, false, 0);
  return { folders: res.filePaths.map((d) => path.basename(d)), files };
});

ipcMain.handle('file:open-json', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Open project',
    properties: ['openFile'],
    filters: [{ name: 'Sprite viewer project', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  return fs.readFileSync(res.filePaths[0], 'utf8');
});

// ---- headless smoke test: electron . --smoke <gameDir> <outPng> ------
async function smoke() {
  const i = process.argv.indexOf('--smoke');
  const gameDir = process.argv[i + 1];
  const outPng = process.argv[i + 2];
  win.webContents.once('did-finish-load', async () => {
    try {
      await win.webContents.executeJavaScript(`window.__smoke(${JSON.stringify(gameDir)})`);
      // exercise the bridge calls that need no dialog
      const probe = path.join(
        gameDir.split(path.delimiter)[0],
        'Data',
        'Core',
        'Textures',
        'Things',
        'Pawn',
        'Humanoid',
        'Bodies',
        'Naked_Male_east.png',
      );
      const bridge = await win.webContents.executeJavaScript(`(async () => {
        const api = window.api, out = {};
        out.keys = Object.keys(api).sort().join(',');
        out.facings = Object.keys(await api.facingsFor(${JSON.stringify(probe)})).sort().join(',');
        const groups = await api.groupPaths([${JSON.stringify(probe)}]);
        out.groups = groups.length + ':' + groups[0].name + ':' + Object.keys(groups[0].facings).sort().join('/');
        const bytes = await api.readImage(${JSON.stringify(probe)});
        out.pngBytes = bytes.byteLength;
        try { await api.readImage('C:/Windows/notes.txt'); out.refusesNonImage = false; } catch { out.refusesNonImage = true; }
        try { await api.readImage('relative/path.png'); out.refusesRelative = false; } catch { out.refusesRelative = true; }
        await api.watchFiles([${JSON.stringify(probe)}]);
        out.watchOk = true;
        out.appInfo = (await api.appInfo()).electron;
        return out;
      })()`);
      console.log('BRIDGE', JSON.stringify(bridge));
      await new Promise((r) => setTimeout(r, 800));
      const img = await win.webContents.capturePage();
      fs.writeFileSync(outPng, img.toPNG());
      console.log('SMOKE_OK');
    } catch (err) {
      console.log('SMOKE_FAIL', err && err.message);
    }
    app.quit();
  });
}

app.whenReady().then(() => {
  if (process.argv.includes('--smoke')) {
    const i = process.argv.indexOf('--smoke');
    saveSettings({
      sources: process.argv[i + 1]
        .split(path.delimiter)
        .filter(Boolean)
        .map((p) => ({ path: p, category: 'auto' })),
    });
  }
  createWindow();
  if (process.argv.includes('--smoke')) smoke();
});
app.on('window-all-closed', () => app.quit());
