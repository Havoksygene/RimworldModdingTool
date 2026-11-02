'use strict';
// RimWorld Sprite Viewer renderer: layer model and undo / redo. Plain script; shares globals with the other renderer files (see index.html for the order).

// ---------- layers --------------------------------------------------------
function zero4() {
  return { south: [0, 0], east: [0, 0], north: [0, 0], west: [0, 0] };
}
function newLayer(kind, name, images) {
  return {
    id: uid(),
    kind,
    name,
    images,
    visible: true,
    tintMode: kind === 'body' || kind === 'head' ? 'skin' : kind === 'hair' || kind === 'beard' ? 'hair' : 'none',
    tintColor: '#ffffff',
    drawSize: DEFAULT_SIZE[kind] || 1.5,
    off: zero4(),
    angle: { south: 0, east: 0, north: 0, west: 0 },
    behind: { south: false, east: false, north: false, west: false },
    followHead: kind === 'head' || kind === 'hair' || kind === 'beard',
    flip: false,
    opacity: 1,
    slot: kind === 'apparel' ? 'torso' : null, // apparel only: 'torso' | 'headgear'
    hidesHair: false, // headgear only
    hidesBeard: false, // headgear only
  };
}

// ---------- undo / redo -----------------------------------------------------
const H = { stack: [], idx: -1, busy: false };
function snapshot() {
  return JSON.stringify({ layers: S.layers, selId: S.selId, headOffset: S.headOffset, bodyType: S.bodyType });
}
function commit() {
  if (H.busy) return;
  const s = snapshot();
  if (H.stack[H.idx] === s) return;
  H.stack.length = H.idx + 1;
  H.stack.push(s);
  if (H.stack.length > 100) H.stack.shift();
  H.idx = H.stack.length - 1;
  if (H.saved === undefined) H.saved = s; // the first state counts as 'nothing to save yet'
}
function restore(i) {
  if (i < 0 || i >= H.stack.length) return;
  H.idx = i;
  const p = JSON.parse(H.stack[i]);
  H.busy = true;
  S.layers = p.layers;
  S.selId = p.selId;
  S.headOffset = p.headOffset;
  S.bodyType = p.bodyType;
  $('hoX').value = S.headOffset[0];
  $('hoZ').value = S.headOffset[1];
  $('bodyType').value = S.bodyType;
  afterLayersChanged();
  H.busy = false;
}
const undo = () => restore(H.idx - 1);
const redo = () => restore(H.idx + 1);

// RimWorld 1.7 apparel layers, lowest drawn first: OnSkin 0, Middle 100, Shell 200, Belt 300 (Overhead 400, EyeCover 500 are headgear).
const TORSO_LAYERS = ['OnSkin', 'Middle', 'Shell', 'Belt'];
// Rough in-game draw order: body, torso apparel, head, genes, hair, headgear, weapon.
function sortLikeGame() {
  const rank = (l) => {
    if (l.kind === 'body') return 0;
    if (l.kind === 'apparel')
      return l.slot === 'headgear'
        ? 5 + 0.1 * (l.apparelLayer === 'EyeCover' ? 1 : 0)
        : 1 + 0.1 * Math.max(0, TORSO_LAYERS.indexOf(l.apparelLayer || 'Middle'));
    if (l.kind === 'head') return 2;
    if (l.kind === 'gene') return 3;
    if (l.kind === 'beard') return 3.5;
    if (l.kind === 'hair') return 4;
    if (l.kind === 'weapon') return 6;
    return 3;
  };
  S.layers = S.layers
    .map((l, i) => ({ l, i }))
    .sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i)
    .map((x) => x.l);
  afterLayersChanged();
}

function toast(msg, ms = 5000) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toast.h);
  toast.h = setTimeout(() => {
    t.style.display = 'none';
  }, ms);
}
window.addEventListener('error', (e) => toast('Error: ' + e.message));
window.addEventListener('unhandledrejection', (e) => toast('Error: ' + ((e.reason && e.reason.message) || e.reason)));

// per-viewer settings (never required for the app to work)
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem('rsv-prefs') || '{}');
  } catch {
    return {};
  }
}
function savePrefs() {
  try {
    localStorage.setItem(
      'rsv-prefs',
      JSON.stringify({
        ppt: S.ppt,
        bg: S.bg,
        grid: S.grid,
        stretch: S.stretch,
        skin: S.skin,
        hair: S.hair,
        flipDds: S.flipDds,
        addCat: $('addCat') ? $('addCat').value : 'auto',
      }),
    );
  } catch {
    /* ignore */
  }
}
const selLayer = () => S.layers.find((l) => l.id === S.selId) || null;

function addOrReplace(layer) {
  // one body, one head, one hair at a time
  if (['body', 'head', 'hair', 'beard'].includes(layer.kind)) {
    const i = S.layers.findIndex((l) => l.kind === layer.kind);
    if (i >= 0) {
      const old = S.layers[i];
      if (!layer.hasDefault) {
        // keep your tweaks when swapping head/hair/body, unless the new asset has its own saved default
        layer.off = old.off;
        layer.drawSize = old.drawSize;
        layer.angle = old.angle;
        layer.behind = old.behind;
        layer.followHead = old.followHead;
        layer.flip = old.flip;
      }
      S.layers[i] = layer;
      S.selId = layer.id;
      afterLayersChanged();
      return;
    }
  }
  S.layers.push(layer);
  S.selId = layer.id;
  afterLayersChanged();
}

function afterLayersChanged() {
  syncWatches();
  renderLayerList();
  renderProps();
  requestRender();
  commit();
}

function syncWatches() {
  const paths = [];
  for (const l of S.layers)
    for (const f of FACINGS) {
      const r = l.images[f];
      if (r && r.kind === 'file') paths.push(r.path);
      if (l.images.single && l.images.single.kind === 'file') paths.push(l.images.single.path);
    }
  window.api.watchFiles([...new Set(paths)]);
}

// Body-shaped apparel has one sprite set per body type (Parka_Female_south ...). Pick which one to use.
const EXPANDED = new Set();
let VARIANT = {};
try {
  VARIANT = JSON.parse(localStorage.getItem('rsv-variants') || '{}') || {};
} catch {
  VARIANT = {};
}
const saveVariants = () => {
  try {
    localStorage.setItem('rsv-variants', JSON.stringify(VARIANT));
  } catch {
    /* ignore */
  }
};
function variantOf(e) {
  if (!e.variants) return null;
  if (VARIANT[e.base] && e.variants[VARIANT[e.base]]) return VARIANT[e.base];
  const bt = (S.bodyType || '').toLowerCase();
  if (bt) {
    const hit = e.variantNames.find((n) => bt === n.toLowerCase() || bt.endsWith('_' + n.toLowerCase()));
    if (hit) return hit;
  }
  return e.defaultVariant;
}
const facingsOf = (e) => {
  const v = variantOf(e);
  return v ? e.variants[v] : e.facings;
};
// After the body type changes, swap body-shaped apparel that follows the body type (no manual choice).
function followBodyVariants() {
  if (!S.game) return;
  let changed = false;
  for (const l of S.layers) {
    if (!l.srcBase || VARIANT[l.srcBase]) continue;
    const e = S.game.entries.find((x) => x.base === l.srcBase);
    if (!e || !e.variants) continue;
    const v = variantOf(e);
    if (v && v !== l.variant) {
      l.images = refsFromEntry(e);
      l.variant = v;
      changed = true;
    }
  }
  if (changed) afterLayersChanged();
}

function refsFromEntry(entry) {
  const images = {};
  for (const [f, rel] of Object.entries(facingsOf(entry))) images[f] = { kind: 'game', pack: entry.pack, rel };
  return normalizeImages(images);
}
function refsFromFiles(facings) {
  const images = {};
  for (const [f, p] of Object.entries(facings)) images[f] = { kind: 'file', path: p };
  return normalizeImages(images);
}
// "single" textures (weapons, simple overlays) are used for every facing.
function normalizeImages(images) {
  if (images.single) {
    const s = images.single;
    return { south: s, east: s, north: s, west: null, single: s };
  }
  return images;
}

function imageForFacing(layer, facing) {
  if (facing === 'west') {
    if (layer.images.west) return { ref: layer.images.west, mirror: false };
    if (layer.images.east) return { ref: layer.images.east, mirror: true };
    return { ref: null, mirror: false };
  }
  return { ref: layer.images[facing] || null, mirror: false };
}
