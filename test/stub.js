'use strict';
// Stubs the Electron bridge (window.api) in a Playwright page, backed by the real indexer.
// Mirrors main.js: the built-in Starter pack is always scanned first, user folders follow.
const fs = require('fs');
const path = require('path');
const idx = require('../lib/indexer');
const STARTER = path.join(__dirname, 'fixtures', 'Starter');

module.exports = async function installStub(page, initialSources, opts = {}) {
  const norm = (s) => (typeof s === 'string' ? { path: s, category: 'auto' } : s);
  const state = { sources: initialSources.map(norm), nextAdd: [], nextPick: [], saved: [] };
  const scan = () => {
    const builtin = opts.starter ? [{ path: STARTER, category: 'auto', builtin: true }] : [];
    const r = idx.scan([...builtin, ...state.sources]);
    if (!r.valid.length) return { ok: false, error: null, sources: state.sources, sourceInfo: r.sourceInfo };
    return { ok: true, sources: state.sources, sourceInfo: r.sourceInfo, valid: r.valid, roots: r.roots, entries: r.entries, bodyTypes: r.bodyTypes, notes: r.notes, presets: r.presets };
  };
  await page.exposeFunction('__scan', scan);
  await page.exposeFunction('__add', (cat) => { for (const p of state.nextAdd) state.sources.push({ path: p, category: cat || 'auto' }); state.nextAdd = []; return scan(); });
  await page.exposeFunction('__setcat', (i, c) => { if (state.sources[i]) state.sources[i].category = c; return scan(); });
  await page.exposeFunction('__remove', (i) => { state.sources = state.sources.filter((_, k) => k !== i); return scan(); });
  await page.exposeFunction('__read', (p) => fs.readFileSync(p).toString('base64'));
  await page.exposeFunction('__facings', (p) => idx.siblingFacings(p));
  await page.exposeFunction('__group', (paths) => idx.groupPaths(paths));
  await page.exposeFunction('__pick', () => { const p = state.nextPick; state.nextPick = []; return idx.groupPaths(p); });
  state.exports = [];
  await page.exposeFunction('__export', (p) => { state.exports.push(p); return { path: '/out/' + p.folder, count: p.files.length, existed: false }; });
  await page.exposeFunction('__save', (o) => { state.saved.push(o); return 'saved'; });
  state.logText = '';
  state.logs = [];
  await page.exposeFunction('__logs', () => state.logs);
  await page.exposeFunction('__logtext', () => state.logText);
  await page.addInitScript(() => {
    const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    window.api = {
      autoDetectGame: () => window.__scan(), addSources: (c) => window.__add(c), setSourceCategory: (i, c) => window.__setcat(i, c),
      removeSource: (i) => window.__remove(i),
      readImage: async (p) => b64(await window.__read(p)),
      pickImages: () => window.__pick(), groupPaths: (p) => window.__group(p),
      watchFiles: async () => {}, onFileChanged: () => {},
      saveFile: (o) => window.__save(o), openJson: async () => null,
      pathForFile: () => null, facingsFor: (p) => window.__facings(p),
      exportMod: (p) => window.__export(p),
      openAppFolder: async (w) => ({ path: '/app/' + w, error: null }),
      findLogs: () => window.__logs(), pickLog: async () => null, readLog: async () => ({ text: await window.__logtext(), truncated: false }),
      appInfo: async () => ({ version: 'test', electron: 'stub' }),
      checkUpdate: async () => window.__update || null, openUpdate: async (u) => { window.__opened = u; },
    };
  });
  return state;
};
