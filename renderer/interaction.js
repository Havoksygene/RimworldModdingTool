'use strict';
// RimWorld Sprite Viewer renderer: dragging, keyboard, toolbar and buttons. Plain script; shares globals with the other renderer files (see index.html for the order).

// ---------- interaction ---------------------------------------------------
let drag = null;
function facingAt(ev) {
  if (S.mode !== 'sheet') return S.facing; // 'single' and 'bodies' edit the selected facing
  const r = $('view').getBoundingClientRect();
  const i = Math.max(0, Math.min(3, Math.floor(((ev.clientX - r.left) / r.width) * 4)));
  return FACINGS[i];
}
function editTarget(l, f) {
  // Which facing's offset is edited when dragging in facing f
  if (f === 'west' && !l.images.west && l.images.east) return { key: 'east', sign: -1 };
  return { key: f, sign: 1 };
}
$('view').addEventListener('mousedown', (ev) => {
  const l = selLayer();
  if (!l) return;
  const f = facingAt(ev);
  const tgt = editTarget(l, f);
  drag = { x: ev.clientX, y: ev.clientY, ox: l.off[tgt.key][0], oz: l.off[tgt.key][1], tgt, l };
  $('view').classList.add('dragging');
});
window.addEventListener('mousemove', (ev) => {
  if (!drag) return;
  const r = $('view').getBoundingClientRect();
  const scale = $('view').width / r.width; // CSS px -> canvas px
  const dx = ((ev.clientX - drag.x) * scale) / S.ppt,
    dy = ((ev.clientY - drag.y) * scale) / S.ppt;
  drag.l.off[drag.tgt.key][0] = round3(drag.ox + dx * drag.tgt.sign);
  drag.l.off[drag.tgt.key][1] = round3(drag.oz - dy);
  syncOffsetInputs();
  requestRender();
});
window.addEventListener('mouseup', () => {
  const was = drag;
  drag = null;
  $('view').classList.remove('dragging');
  if (was) {
    renderProps();
    commit();
  }
});
const round3 = (v) => Math.round(v * 1000) / 1000;

function syncOffsetInputs() {
  const l = selLayer();
  if (!l) return;
  const f = S.facing,
    tgt = editTarget(l, f);
  const a = $('propOX'),
    b = $('propOZ');
  if (a && b && document.activeElement !== a && document.activeElement !== b) {
    a.value = l.off[f][0];
    b.value = l.off[f][1];
  }
  if (tgt.key !== f) {
    /* west mirrored: inputs show west (unused) values; hint explains */
  }
}

window.addEventListener('keydown', (ev) => {
  const tag = (ev.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  const l = selLayer();
  if (!l) return;
  const step = ev.shiftKey ? 0.02 : 0.005;
  const f = S.facing,
    tgt = editTarget(l, f);
  let dx = 0,
    dz = 0;
  if (ev.key === 'ArrowLeft') dx = -step;
  else if (ev.key === 'ArrowRight') dx = step;
  else if (ev.key === 'ArrowUp') dz = step;
  else if (ev.key === 'ArrowDown') dz = -step;
  else return;
  ev.preventDefault();
  l.off[tgt.key][0] = round3(l.off[tgt.key][0] + dx * tgt.sign);
  l.off[tgt.key][1] = round3(l.off[tgt.key][1] + dz);
  renderProps();
  requestRender();
});

// Delete key removes the selected layer (not while typing in a box)
window.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Delete') return;
  const tag = (ev.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const l = selLayer();
  if (!l) return;
  ev.preventDefault();
  S.layers = S.layers.filter((x) => x !== l);
  S.selId = null;
  afterLayersChanged();
});

// history hooks: edits made in the properties panel, layer list and keyboard nudges
$('propsBody').addEventListener('change', () => commit());
let nudgeTimer = null;
window.addEventListener('keydown', (ev) => {
  const tag = (ev.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
  if ((ev.ctrlKey || ev.metaKey) && !typing) {
    const k = ev.key.toLowerCase();
    if (k === 'z' && !ev.shiftKey) {
      ev.preventDefault();
      undo();
      return;
    }
    if (k === 'y' || (k === 'z' && ev.shiftKey)) {
      ev.preventDefault();
      redo();
      return;
    }
  }
  if (!typing && ev.key.startsWith('Arrow')) {
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(commit, 400);
  }
});

// mouse wheel over the viewport zooms
$('stage').addEventListener(
  'wheel',
  (ev) => {
    ev.preventDefault();
    S.ppt = Math.max(60, Math.min(360, S.ppt + (ev.deltaY < 0 ? 10 : -10)));
    $('zoom').value = S.ppt;
    savePrefs();
    requestRender();
  },
  { passive: false },
);

// drag image files from Explorer onto the window to add them as layers
window.addEventListener('dragover', (ev) => {
  ev.preventDefault();
});
window.addEventListener('drop', async (ev) => {
  ev.preventDefault();
  const paths = [];
  for (const f of [...(ev.dataTransfer ? ev.dataTransfer.files : [])]) {
    if (!/\.(png|jpe?g|dds)$/i.test(f.name)) continue;
    try {
      const p = window.api.pathForFile(f);
      if (p) paths.push(p);
    } catch {
      /* ignore */
    }
  }
  if (!paths.length) {
    toast('Drop PNG, JPG or DDS files. (Folder drops are not supported: use "Add folder as…".)');
    return;
  }
  addGroups(await window.api.groupPaths(paths));
});
function addGroups(groups) {
  const kind = $('addKind').value;
  for (const g of groups || []) {
    const layer = newLayer(kind, g.name, refsFromFiles(g.facings));
    if (kind === 'weapon') layer.off = DEFAULT_WEAPON_OFF();
    addOrReplace(layer);
  }
  if (groups && groups.length) toast(groups.map((g) => g.name + ' (' + Object.keys(g.facings).join('/') + ')').join(', '), 4000);
}

$('btnSort').addEventListener('click', sortLikeGame);

// toolbar wiring
document.querySelectorAll('#facingSeg button').forEach((b) =>
  b.addEventListener('click', () => {
    S.facing = b.dataset.f;
    document.querySelectorAll('#facingSeg button').forEach((x) => x.classList.toggle('active', x === b));
    renderProps();
    requestRender();
  }),
);
document.querySelectorAll('#modeSeg button').forEach((b) =>
  b.addEventListener('click', () => {
    S.mode = b.dataset.m;
    document.querySelectorAll('#modeSeg button').forEach((x) => x.classList.toggle('active', x === b));
    requestRender();
  }),
);
$('zoom').addEventListener('input', () => {
  S.ppt = +$('zoom').value;
  savePrefs();
  requestRender();
});
$('bg').addEventListener('change', () => {
  S.bg = $('bg').value;
  savePrefs();
  requestRender();
});
$('stretch').addEventListener('change', () => {
  S.stretch = $('stretch').checked;
  savePrefs();
  requestRender();
});
$('grid').addEventListener('change', () => {
  S.grid = $('grid').checked;
  savePrefs();
  requestRender();
});
$('skin').addEventListener('input', () => {
  S.skin = $('skin').value;
  savePrefs();
  requestRender();
});
$('hairc').addEventListener('input', () => {
  S.hair = $('hairc').value;
  savePrefs();
  requestRender();
});
const SKINS = [
  ['Pale', '#f1d3bd'],
  ['Light', '#e8b995'],
  ['Medium', '#d19a6a'],
  ['Tan', '#b9794b'],
  ['Brown', '#8d5a3a'],
  ['Dark', '#5e3b26'],
];
const HAIRS = [
  ['Black', '#1c1714'],
  ['Dark brown', '#3b2a1e'],
  ['Brown', '#5b3c26'],
  ['Auburn', '#7a3b22'],
  ['Blond', '#c9a35a'],
  ['Platinum', '#e7dcc0'],
  ['Red', '#9c3a1e'],
  ['Grey', '#8c8c8c'],
  ['White', '#efefef'],
];
for (const [id, list] of [
  ['skinPre', SKINS],
  ['hairPre', HAIRS],
])
  for (const [n, c] of list) {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = n;
    $(id).appendChild(o);
  }
$('skinPre').addEventListener('change', () => {
  if (!$('skinPre').value) return;
  S.skin = $('skin').value = $('skinPre').value;
  $('skinPre').value = '';
  savePrefs();
  requestRender();
});
$('hairPre').addEventListener('change', () => {
  if (!$('hairPre').value) return;
  S.hair = $('hairc').value = $('hairPre').value;
  $('hairPre').value = '';
  savePrefs();
  requestRender();
});

// step through heads / hairs without re-adding layers
function cycleAsset(kind, dir) {
  if (!S.game) return;
  const cat = { head: 'heads', beard: 'beards', body: 'bodies', hair: 'hair' }[kind];
  const list = S.game.entries.filter((e) => effCat(e) === cat);
  if (!list.length) {
    toast('No ' + cat + ' in the library.');
    return;
  }
  const cur = S.layers.find((l) => l.kind === kind);
  const canBeNone = kind === 'hair' || kind === 'beard'; // bald / clean-shaven is a valid choice
  const slots = list.length + (canBeNone ? 1 : 0);
  // position 0 = none (hair/beard only); then the library in order
  let pos = cur && cur.srcBase ? list.findIndex((e) => e.base === cur.srcBase) + (canBeNone ? 1 : 0) : canBeNone && !cur ? 0 : -1;
  pos = (pos + dir + slots) % slots;
  if (canBeNone && pos === 0) {
    S.layers = S.layers.filter((l) => l.kind !== kind);
    if (!S.layers.some((l) => l.id === S.selId)) S.selId = null;
    afterLayersChanged();
    toast(kind + ': none', 1800);
    return;
  }
  const i = pos - (canBeNone ? 1 : 0);
  addFromEntry(list[i]);
  toast(kind + ': ' + list[i].base.split('/').pop() + '  (' + (i + 1) + '/' + list.length + ')', 1800);
}
$('headPrev').addEventListener('click', () => cycleAsset('head', -1));
$('headNext').addEventListener('click', () => cycleAsset('head', 1));
$('hairPrev').addEventListener('click', () => cycleAsset('hair', -1));
$('hairNext').addEventListener('click', () => cycleAsset('hair', 1));
for (const [id, which] of [
  ['btnOpenApp', 'app'],
  ['btnOpenLib', 'library'],
  ['btnOpenMods', 'mods'],
]) {
  $(id).addEventListener('click', async () => {
    try {
      const r = await window.api.openAppFolder(which);
      toast(r && r.error ? 'Could not open ' + r.path + ': ' + r.error : 'Opened ' + (r && r.path), 3500);
    } catch (e) {
      toast('Could not open the folder: ' + e.message);
    }
  });
}
async function importArt(choose) {
  const b = $('btnImportArt');
  b.disabled = true;
  try {
    toast('Looking for your RimWorld install…', 4000);
    const r = await window.api.importAssets({ choose });
    if (r.cancelled) return;
    if (!r.ok) {
      toast(r.error || 'Import failed.', 12000);
      return;
    }
    const parts = Object.entries(r.imported).map(([k, v]) => v + ' ' + k);
    toast(
      (parts.length ? 'Imported ' + parts.join(', ') : 'Nothing new to import') +
        (r.skipped ? ' (' + r.skipped + ' already there)' : '') +
        ' from ' +
        r.archives.join(', ') +
        '.' +
        (r.errors.length
          ? ' ' +
            r.errors.length +
            ' problem(s), e.g. ' +
            r.errors[0] +
            (r.methods
              ? ' [compression methods in these archives: ' +
                Object.entries(r.methods)
                  .map(([m, n]) => m + 'x' + n)
                  .join(', ') +
                ']'
              : '')
          : ''),
      14000,
    );
    applyGame(await window.api.autoDetectGame());
  } catch (e) {
    toast('Import failed: ' + e.message, 12000);
  } finally {
    b.disabled = false;
  }
}
if (window.api.onImportProgress)
  window.api.onImportProgress((p) => {
    if (p.phase === 'copy') toast('Importing ' + p.archive + ': ' + p.done + ' / ' + p.total, 2500);
  });
$('btnImportArt').addEventListener('click', () => importArt(false));
$('btnImportArtPick').addEventListener('click', () => importArt(true));
$('bodyPrev').addEventListener('click', () => cycleAsset('body', -1));
$('bodyNext').addEventListener('click', () => cycleAsset('body', 1));
$('beardPrev').addEventListener('click', () => cycleAsset('beard', -1));
$('beardNext').addEventListener('click', () => cycleAsset('beard', 1));

// back up / restore the per-asset settings
$('btnOvExport').addEventListener('click', () =>
  window.api.saveFile({
    defaultName: 'rsv-asset-settings.json',
    filters: [{ name: 'Settings', extensions: ['json'] }],
    text: JSON.stringify(OV, null, 2),
  }),
);
$('btnOvImport').addEventListener('click', async () => {
  const t = await window.api.openJson();
  if (!t) return;
  try {
    const o = JSON.parse(t);
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('not a settings file');
    Object.assign(OV, o);
    saveOv();
    renderLibrary();
    toast('Imported settings for ' + Object.keys(o).length + ' assets.');
  } catch (e) {
    toast('Could not import: ' + e.message);
  }
});
$('bodyType').addEventListener('change', () => applyBodyType($('bodyType').value));
$('hoX').addEventListener('input', () => {
  S.headOffset[0] = parseFloat($('hoX').value) || 0;
  requestRender();
});
$('hoZ').addEventListener('input', () => {
  S.headOffset[1] = parseFloat($('hoZ').value) || 0;
  requestRender();
});
document.querySelectorAll('#tabs .tab').forEach((b) =>
  b.addEventListener('click', () => {
    S.tab = b.dataset.cat;
    document.querySelectorAll('#tabs .tab').forEach((x) => x.classList.toggle('active', x === b));
    renderLibrary();
  }),
);
$('search').addEventListener('input', () => {
  S.filter = $('search').value;
  renderLibrary();
});

$('btnGame').addEventListener('click', async () => {
  applyGame(await window.api.addSources($('addCat').value));
});
$('addCat').addEventListener('change', savePrefs);
$('flipDds').addEventListener('change', () => {
  S.flipDds = $('flipDds').checked;
  savePrefs();
  for (const [k, c] of [...imgCache]) if (/\.dds(\.split)?$/i.test(k)) imgCache.delete(k);
  tintCache.clear();
  renderLayerList();
  renderProps();
  requestRender();
});
$('btnAddFile').addEventListener('click', async () => addGroups(await window.api.pickImages()));
$('btnDiag').addEventListener('click', async () => {
  const info = await window.api.appInfo();
  const lines = ['RimWorld Sprite Viewer diagnostics', JSON.stringify(info), 'flipDds=' + S.flipDds];
  for (const si of (S.game && S.game.sourceInfo) || [])
    lines.push(`source ${si.path} [${si.category}] ${si.kind} entries=${si.entries} images=${si.images}`);
  for (const l of S.layers) {
    lines.push(`layer ${l.kind} "${l.name}" size=${l.drawSize} followHead=${l.followHead} visible=${l.visible} off=${JSON.stringify(l.off)}`);
    for (const [f, r] of Object.entries(l.images)) {
      const inf = imageInfo(r);
      lines.push(
        `  ${f}: ${absPath(r)} -> ${inf ? inf.state : 'not loaded'}${inf && inf.img ? ' ' + (inf.img.naturalWidth || inf.img.width) + 'x' + (inf.img.naturalHeight || inf.img.height) + ' opaque=' + (inf.opaque === null ? '?' : inf.opaque.toFixed(3)) : ''}${inf && inf.error ? ' ERROR ' + inf.error : ''}`,
      );
    }
  }
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    toast('Diagnostics copied to the clipboard.');
  } catch {
    await window.api.saveFile({ defaultName: 'rsv-diagnostics.txt', filters: [{ name: 'Text', extensions: ['txt'] }], text });
  }
});

// live reload when a sprite file is saved in the editor
window.api.onFileChanged((p) => {
  invalidate(p);
  renderLayerList();
  renderProps();
});
