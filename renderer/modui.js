'use strict';
// Mod builder, part 1 of 3: shared state and small helpers. Exposes window.MB for modcontrols.js and modbuilder.js.
// Loaded after the viewer scripts (core.js ... help.js), so it can use their globals (toast, S, ...).
(function () {
  const SC = window.ModSchema,
    GEN = window.ModGen;

  const M = { project: SC.newProject(), selId: null, result: null, previewPath: null, packageEdited: false, watching: new Set() };
  // Screens that this file cannot know yet; modbuilder.js fills them in.
  const hooks = { renderItems() {}, renderForm() {}, refreshOutput() {}, historyChanged() {} };

  const el = (tag, props, ...kids) => {
    const e = Object.assign(document.createElement(tag), props || {});
    for (const k of kids) if (k != null) e.append(k);
    return e;
  };
  const btn2 = (text, fn, cls) => {
    const b = el('button', { textContent: text, className: cls || '' });
    b.addEventListener('click', fn);
    return b;
  };
  const getp = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setp(o, path, v) {
    const ks = path.split('.'),
      last = ks.pop();
    let t = o;
    for (const k of ks) t = t[k] = t[k] || {};
    t[last] = v;
  }
  const sel = () => M.project.items.find((i) => i.id === M.selId) || null;

  // ---- saving the project in the browser storage (restored on the next start) and the "unsaved changes" flag ----
  const KEY = 'rsv-modproject',
    SAVEDKEY = 'rsv-modsaved';
  const lsGet = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const lsSet = (k, v) => {
    try {
      localStorage.setItem(k, v);
      return true;
    } catch {
      return false;
    }
  };
  const markSaved = () => {
    M.savedJson = JSON.stringify(M.project);
    lsSet(SAVEDKEY, M.savedJson);
  };
  const dirty = () => M.project.items.length > 0 && JSON.stringify(M.project) !== M.savedJson;
  function load() {
    try {
      const p = JSON.parse(lsGet(KEY) || 'null');
      if (p && p.meta && Array.isArray(p.items)) {
        M.project = p;
        M.packageEdited = true;
      }
    } catch {
      /* ignore a damaged saved project */
    }
    M.savedJson = lsGet(SAVEDKEY);
  }
  let saveTimer = null,
    warnedFull = false;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (lsSet(KEY, JSON.stringify(M.project)) || warnedFull) return;
      warnedFull = true;
      toast('The project is too big to auto-save (probably imported sounds). Use Save to keep it in a file.');
    }, 300);
  }
  // after any edit: save, regenerate the XML, refresh the item list (and the form when the layout may change)
  function changed(rerender) {
    persist();
    clearTimeout(snapTimer);
    snapTimer = setTimeout(snap, 600);
    hooks.refreshOutput();
    hooks.renderItems();
    if (rerender) hooks.renderForm();
  }

  // ---- undo / redo: snapshots of the whole project (typing is grouped into one step) ----
  const hist = [];
  let pos = -1,
    snapTimer = null,
    histBytes = 0;
  function resetHistory() {
    clearTimeout(snapTimer);
    hist.length = 0;
    const j = JSON.stringify(M.project);
    hist.push(j);
    pos = 0;
    histBytes = j.length;
  }
  function snap() {
    clearTimeout(snapTimer);
    if (pos < 0) return;
    const j = JSON.stringify(M.project);
    if (j === hist[pos]) return;
    for (const x of hist.splice(pos + 1)) histBytes -= x.length;
    hist.push(j);
    histBytes += j.length;
    pos = hist.length - 1;
    while (hist.length > 2 && (hist.length > 80 || histBytes > 60e6)) {
      histBytes -= hist.shift().length;
      pos--;
    }
    hooks.historyChanged();
  }
  function jump(delta) {
    snap(); // flush the pending step first, so the target is computed from the real position
    const to = pos + delta;
    if (to < 0 || to >= hist.length) return false;
    pos = to;
    M.project = JSON.parse(hist[pos]);
    if (!sel()) M.selId = (M.project.items[0] || {}).id || null;
    persist();
    hooks.refreshOutput();
    hooks.renderItems();
    hooks.renderForm();
    hooks.historyChanged();
    return true;
  }
  const undo = () => jump(-1),
    redo = () => jump(1);
  const canUndo = () => pos > 0 || (pos === 0 && JSON.stringify(M.project) !== hist[0]),
    canRedo = () => pos >= 0 && pos < hist.length - 1;

  // ---- custom list entries: saved in the project file ('project') and in a personal app-wide list ('app') ----
  const APPKEY = 'rsv-customlists';
  const appLists = () => {
    try {
      return JSON.parse(lsGet(APPKEY) || '{}') || {};
    } catch {
      return {};
    }
  };
  const saveApp = (o) => lsSet(APPKEY, JSON.stringify(o));
  const projLists = () => (M.project.custom = M.project.custom || {});
  const listsOf = (scope) => (scope === 'app' ? appLists() : projLists());
  const afterListEdit = (scope, lists) => {
    if (scope === 'app') saveApp(lists);
    persist();
    changed(false);
  };
  const store = {
    list(lk) {
      return [...(projLists()[lk] || []).map((e) => ({ ...e, scope: 'project' })), ...(appLists()[lk] || []).map((e) => ({ ...e, scope: 'app' }))];
    },
    add(lk, e, scope) {
      const lists = listsOf(scope);
      (lists[lk] = lists[lk] || []).push(e);
      if (scope === 'app') saveApp(lists);
      persist();
    },
    update(lk, id, scope, e) {
      const lists = listsOf(scope),
        arr = lists[lk] || [],
        i = arr.findIndex((x) => x.id === id);
      if (i >= 0) arr[i] = e;
      afterListEdit(scope, lists);
    },
    remove(lk, id, scope) {
      const lists = listsOf(scope);
      lists[lk] = (lists[lk] || []).filter((x) => x.id !== id);
      afterListEdit(scope, lists);
    },
  };
  const defPrefix = () => String(M.project.meta.prefix || '').replace(/[^A-Za-z0-9_]/g, '');
  // the defName an item will get (same rule as the generator)
  const defNameOf = (it) => it.defName || defPrefix() + (GEN.pascal(it.label) || '');

  // all entries for a list: built-in labelled ones (optionally filtered by kind / excluded ids) + the user's own
  function entriesOf(lk, o) {
    o = o || {};
    let base = SC.CATALOG.entriesFor(lk).filter((e) => (!o.kind || !e.kind || e.kind === o.kind) && !(o.exclude && o.exclude.has(e.id)));
    if (o.blank) base = [{ id: '', label: o.blank, group: 'Default', v: true }, ...base.filter((e) => e.id !== '')];
    if (lk === 'projectiles') {
      for (const it of M.project.items) {
        const id = it.type === 'projectile' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Projectiles in this mod', v: true });
      }
    }
    if ((lk === 'animals' || lk === 'plants') && M.project.scanned) {
      const have = new Set(base.map((e) => e.id));
      for (const e of M.project.scanned[lk] || [])
        if (!have.has(e.id)) base.push({ id: e.id, label: e.label + ' (scanned mod)', group: 'From scanned mods', v: true });
    }
    if (lk === 'materials') {
      for (const it of M.project.items) {
        const id = it.type === 'item' || it.type === 'implant' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Items in this mod', v: true });
      }
    }
    if (lk === 'plants') {
      for (const it of M.project.items) {
        const id = it.type === 'plant' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Plants in this mod', v: true });
      }
    }
    if (lk === 'research') {
      for (const it of M.project.items) {
        const id = it.type === 'research' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Research in this mod', v: true });
      }
    }
    if (lk === 'biomeIds') {
      for (const it of M.project.items) {
        const id = it.type === 'biome' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Biomes in this mod', v: true });
      }
    }
    if (lk === 'traits') {
      for (const it of M.project.items) {
        const id = it.type === 'trait' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Traits in this mod', v: true });
      }
    }
    if (lk === 'tasteThoughts') {
      for (const it of M.project.items) {
        const id = it.type === 'thought' && it.kind === 'memory' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Thoughts in this mod', v: true });
      }
    }
    if (lk === 'hediffs') {
      for (const it of M.project.items) {
        const id = it.type === 'hediff' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Conditions in this mod', v: true });
      }
    }
    if (lk === 'animals') {
      for (const it of M.project.items) {
        const id = it.type === 'animal' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Animals in this mod', v: true });
      }
    }
    if (lk === 'genes') {
      for (const it of M.project.items) {
        const id = it.type === 'gene' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Genes in this mod', v: true });
      }
    }
    if (lk === 'abilities') {
      for (const it of M.project.items) {
        const id = it.type === 'ability' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Abilities in this mod', v: true });
      }
    }
    if (lk === 'terrains') {
      for (const it of M.project.items) {
        const id = it.type === 'floor' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Floors in this mod', v: true });
      }
    }
    if (lk === 'workbenches') {
      for (const it of M.project.items) {
        const id = it.type === 'building' && it.preset === 'workbench' ? defNameOf(it) : '';
        if (id) base.push({ id, label: (it.label || id) + ' (this mod)', group: 'Workbenches in this mod', v: true });
      }
    }
    const mine = store.list(lk).map((e) => ({ id: e.id, label: e.label || e.id, group: 'Your own entries', v: true, custom: true, scope: e.scope }));
    return [...base, ...mine];
  }
  const labelOf = (lk, id, o) => {
    const e = entriesOf(lk, { blank: o && o.blank }).find((x) => x.id === id);
    return e ? e.label : id;
  };
  const openPick = (lk, title, opts, cb) =>
    window.Picker.open(Object.assign({ title, lk, store, notify: toast, entries: () => entriesOf(lk, opts) }, cb));

  window.MB = {
    SC,
    GEN,
    M,
    hooks,
    el,
    btn2,
    getp,
    setp,
    sel,
    lsGet,
    lsSet,
    load,
    persist,
    markSaved,
    dirty,
    changed,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    store,
    entriesOf,
    labelOf,
    openPick,
    defNameOf,
    controls: {},
  };
})();
