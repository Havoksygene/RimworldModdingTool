'use strict';
// RimWorld Sprite Viewer renderer: asset library list, thumbnails, body types. Plain script; shares globals with the other renderer files (see index.html for the order).

// ---------- library -------------------------------------------------------
// Per-asset manual settings (type, worn-on slot, ...). Saved in this browser profile, keyed by the asset's path.
let OV = {};
try {
  OV = JSON.parse(localStorage.getItem('rsv-overrides') || '{}') || {};
} catch {
  OV = {};
}
const saveOv = () => {
  try {
    localStorage.setItem('rsv-overrides', JSON.stringify(OV));
  } catch {
    /* ignore */
  }
};
const TYPE_TO_CAT = {
  body: 'bodies',
  head: 'heads',
  hair: 'hair',
  beard: 'beards',
  'apparel-torso': 'apparel',
  'apparel-headgear': 'apparel',
  weapon: 'weapons',
  gene: 'genes',
};
const effCat = (e) => (OV[e.base] && TYPE_TO_CAT[OV[e.base].type]) || e.cat;
const picked = new Set();
let lastPicked = null;
const pickedEntries = () => (S.game ? S.game.entries.filter((x) => picked.has(x.base)) : []);
function selectAsset(e, ev, list) {
  if (ev.shiftKey && lastPicked) {
    const a = list.findIndex((x) => x.base === lastPicked),
      b = list.findIndex((x) => x.base === e.base);
    if (a >= 0 && b >= 0) {
      picked.clear();
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) picked.add(list[i].base);
    }
  } else if (ev.ctrlKey || ev.metaKey) {
    if (picked.has(e.base)) picked.delete(e.base);
    else picked.add(e.base);
    lastPicked = e.base;
  } else {
    picked.clear();
    picked.add(e.base);
    lastPicked = e.base;
  }
  document.querySelectorAll('#libList .item').forEach((x) => x.classList.toggle('picked', picked.has(x.dataset.base)));
}

function visibleEntries() {
  if (!S.game) return [];
  const q = S.filter.trim().toLowerCase();
  return S.game.entries.filter((e) => (S.tab === 'all' || effCat(e) === S.tab) && (!q || e.base.toLowerCase().includes(q)));
}

function renderLibrary() {
  const list = $('libList');
  list.textContent = '';
  const all = visibleEntries();
  const shown = all.slice(0, 400);
  $('libCount').textContent = S.game
    ? `${all.length} item${all.length === 1 ? '' : 's'}${all.length > shown.length ? ' (showing first 400 - use the filter)' : ''}`
    : 'Pick the RimWorld folder to browse default assets.';
  for (const e of shown) {
    const d = document.createElement('div');
    d.className = 'item';
    d.dataset.base = e.base;
    const name = e.base.split('/').pop();
    if (e.icon) {
      // the game's own thumbnail next to the name
      const ic = document.createElement('canvas');
      ic.width = ic.height = 22;
      ic.className = 'ico';
      onImageReady({ kind: 'game', pack: e.pack, rel: e.icon }, (im) => {
        const k = Math.min(22 / im.naturalWidth, 22 / im.naturalHeight),
          w = im.naturalWidth * k,
          h = im.naturalHeight * k;
        ic.getContext('2d').drawImage(im, (22 - w) / 2, (22 - h) / 2, w, h);
      });
      d.appendChild(ic);
    }
    d.appendChild(document.createTextNode(name));
    d.title = e.base;
    {
      const n = ['south', 'east', 'north', 'west'].filter((f) => facingsOf(e)[f]).length;
      const b = document.createElement('span');
      b.className = 'fc';
      b.textContent = facingsOf(e).single ? '1' : n + '/4';
      d.appendChild(b);
    }
    if (e.variants) {
      // small arrow: show one sub-row per body type
      const ar = document.createElement('span');
      ar.className = 'arrow';
      ar.title = 'Show the ' + e.variantNames.length + ' body type versions';
      ar.textContent = EXPANDED.has(e.base) ? '▾' : '▸';
      ar.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (EXPANDED.has(e.base)) EXPANDED.delete(e.base);
        else EXPANDED.add(e.base);
        renderLibrary();
      });
      ar.addEventListener('dblclick', (ev) => ev.stopPropagation());
      d.insertBefore(ar, d.firstChild);
    }
    if (e.pack !== 'Core') {
      const s = document.createElement('span');
      s.className = 'pk';
      s.textContent = e.pack;
      d.appendChild(s);
    }
    d.title = e.base + '  (click: settings · Ctrl/Shift+click: select several · double-click: add to pawn)';
    if (OV[e.base]) {
      const m = document.createElement('span');
      m.className = 'ov';
      m.textContent = '✎';
      m.title = 'Has manual settings';
      d.appendChild(m);
    }
    if (picked.has(e.base)) d.classList.add('picked');
    d.addEventListener('click', (ev) => {
      selectAsset(e, ev, shown);
      showAssetEditor(pickedEntries());
    });
    d.addEventListener('dblclick', () => {
      addFromEntry(e);
    });
    d.addEventListener('mouseenter', () => previewEntry(e));
    list.appendChild(d);
    if (e.variants && EXPANDED.has(e.base)) {
      for (const vn of e.variantNames) {
        const sd = document.createElement('div');
        sd.className = 'item sub';
        sd.dataset.base = e.base;
        sd.dataset.variant = vn;
        sd.textContent = vn;
        if (variantOf(e) === vn) sd.classList.add('cur');
        const sfc = ['south', 'east', 'north', 'west'].filter((f) => e.variants[vn][f]).length;
        const sb = document.createElement('span');
        sb.className = 'fc';
        sb.textContent = sfc + '/4';
        sd.appendChild(sb);
        sd.title = e.base + ' · ' + vn + '  (click: preview and use this version · double-click: add to pawn)';
        const use = () => {
          VARIANT[e.base] = vn;
          saveVariants();
          for (const l of S.layers.filter((y) => y.srcBase === e.base)) {
            l.images = refsFromEntry(e);
            l.variant = vn;
          }
          afterLayersChanged();
          renderLibrary();
        };
        sd.addEventListener('click', (ev) => {
          ev.stopPropagation();
          use();
        });
        sd.addEventListener('dblclick', (ev) => {
          ev.stopPropagation();
          VARIANT[e.base] = vn;
          saveVariants();
          addFromEntry(e);
          renderLibrary();
        });
        sd.addEventListener('mouseenter', () => previewEntry(e, vn));
        list.appendChild(sd);
      }
    }
  }
}

function previewEntry(e, vn) {
  const nm = e.base.split('/').pop() + (vn ? ' · ' + vn : '');
  $('prevName').textContent = nm;
  const c = $('prevCanvas'),
    g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  // all facings in a 2x2 grid (West is the mirrored East unless the asset has its own)
  const fc = vn && e.variants ? e.variants[vn] : facingsOf(e);
  const slots = fc.single
    ? [['single', 0, 0, 2, false]]
    : [
        ['south', 0, 0, 1, false],
        ['east', 1, 0, 1, false],
        ['north', 0, 1, 1, false],
        [fc.west ? 'west' : 'east', 1, 1, 1, !fc.west],
      ];
  const half = c.width / 2;
  for (const [f, gx, gy, span, mirror] of slots) {
    const rel = fc[f];
    if (!rel) continue;
    const ref = { kind: 'game', pack: e.pack, rel };
    onImageReady(ref, (im) => {
      if ($('prevName').textContent !== nm) return;
      const box = half * span,
        k = Math.min(box / im.naturalWidth, box / im.naturalHeight);
      const w = im.naturalWidth * k,
        h = im.naturalHeight * k;
      g.save();
      g.translate(gx * half + box / 2, gy * half + box / 2);
      if (mirror) g.scale(-1, 1);
      g.drawImage(im, -w / 2, -h / 2, w, h);
      g.restore();
    });
  }
}

const CAT_TO_KIND = {
  bodies: 'body',
  heads: 'head',
  hair: 'hair',
  beards: 'beard',
  apparel: 'apparel',
  weapons: 'weapon',
  genes: 'gene',
  other: 'gene',
};
const DEFAULT_WEAPON_OFF = () => ({ south: [0.1, -0.1], east: [0.2, -0.05], north: [0.1, 0.1], west: [0, 0] });
function applyPreset(layer, pre) {
  if (!pre) return;
  const num = (v) => (Number.isFinite(v) ? v : null);
  if (pre.slot === 'torso' || pre.slot === 'headgear') layer.slot = pre.slot;
  if (typeof pre.followHead === 'boolean') layer.followHead = pre.followHead;
  if (typeof pre.hidesHair === 'boolean') layer.hidesHair = pre.hidesHair;
  if (typeof pre.hidesBeard === 'boolean') layer.hidesBeard = pre.hidesBeard;
  if (['none', 'skin', 'hair', 'custom'].includes(pre.tintMode)) layer.tintMode = pre.tintMode;
  if (pre.tintColor) layer.tintColor = pre.tintColor;
  if (num(pre.drawSize) && pre.drawSize > 0) layer.drawSize = pre.drawSize;
  if (num(pre.angle)) for (const f of FACINGS) layer.angle[f] = pre.angle;
  if (pre.off) for (const f of FACINGS) if (Array.isArray(pre.off[f])) layer.off[f] = [num(pre.off[f][0]) || 0, num(pre.off[f][1]) || 0];
  if (pre.behind) for (const f of FACINGS) if (typeof pre.behind[f] === 'boolean') layer.behind[f] = pre.behind[f];
}
// Optional name keywords that mark an apparel item as a hat / as hiding hair. EMPTY on purpose for now:
// every apparel starts as body/torso and the type is set per asset in the settings panel.
// Later, e.g. HEADGEAR_KEYWORDS = ['hat'] would treat every asset whose name contains "hat" as headgear.
const HEADGEAR_KEYWORDS = [];
const HAIR_HIDE_KEYWORDS = [];
const kwRe = (list) => (list.length ? new RegExp(list.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i') : null);
const HEADGEAR_RE = kwRe(HEADGEAR_KEYWORDS),
  HAIR_HIDE_RE = kwRe(HAIR_HIDE_KEYWORDS);
const isHeadgearName = (n) => !!HEADGEAR_RE && HEADGEAR_RE.test(n);
const hidesHairName = (n) => !!HAIR_HIDE_RE && HAIR_HIDE_RE.test(n);

function applyOverride(layer, ov) {
  if (ov.type === 'apparel-torso') {
    layer.slot = 'torso';
    layer.hidesHair = false;
    if (ov.followHead === undefined) layer.followHead = false;
  }
  if (ov.type === 'apparel-headgear') {
    layer.slot = 'headgear';
    if (ov.followHead === undefined) layer.followHead = true;
  }
  if (typeof ov.followHead === 'boolean') layer.followHead = ov.followHead;
  if (typeof ov.hidesHair === 'boolean' && layer.slot === 'headgear') layer.hidesHair = ov.hidesHair;
  if (typeof ov.hidesBeard === 'boolean' && layer.slot === 'headgear') layer.hidesBeard = ov.hidesBeard;
  if (ov.apparelLayer !== undefined) layer.apparelLayer = ov.apparelLayer || undefined;
  if (ov.tintMode) layer.tintMode = ov.tintMode;
  if (Number.isFinite(ov.drawSize) && ov.drawSize > 0) layer.drawSize = ov.drawSize;
  if (ov.layer) {
    // full saved layer defaults ("Save as asset default")
    const d = JSON.parse(JSON.stringify(ov.layer));
    for (const k of ['off', 'angle', 'behind']) if (d[k]) layer[k] = { ...layer[k], ...d[k] };
    for (const k of ['drawSize', 'flip', 'opacity', 'tintMode', 'tintColor', 'followHead']) if (d[k] !== undefined) layer[k] = d[k];
    if (layer.slot === 'headgear' && typeof d.hidesHair === 'boolean') layer.hidesHair = d.hidesHair;
    if (layer.slot === 'headgear' && typeof d.hidesBeard === 'boolean') layer.hidesBeard = d.hidesBeard;
    layer.hasDefault = true;
  }
}

function showAssetEditor(list) {
  const box = $('assetEdit');
  box.textContent = '';
  if (!list || !list.length) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';
  const e = list[0],
    multi = list.length > 1;
  const baseType = (x) =>
    (OV[x.base] && OV[x.base].type) ||
    (x.cat === 'apparel'
      ? x.slot === 'headgear' || isHeadgearName(x.base)
        ? 'apparel-headgear'
        : 'apparel-torso'
      : x.cat === 'hair' && /beard/i.test(x.base)
        ? 'beard'
        : { bodies: 'body', heads: 'head', hair: 'hair', beards: 'beard', weapons: 'weapon', genes: 'gene' }[x.cat] || 'gene');
  const ov = OV[e.base] || {},
    curType = baseType(e);
  const title = document.createElement('div');
  title.className = 'small';
  title.textContent = multi ? list.length + ' assets selected: changes apply to all' : 'Settings for: ' + e.base.split('/').pop();
  box.appendChild(title);
  const setAll = (patch) => {
    for (const x of list) OV[x.base] = { ...(OV[x.base] || { type: baseType(x) }), ...patch };
    saveOv();
    for (const x of list)
      for (const l of S.layers.filter((y) => y.srcBase === x.base)) {
        const o = OV[x.base];
        l.kind = o.type.split('-')[0];
        if (l.kind === 'apparel') l.slot = o.type === 'apparel-headgear' ? 'headgear' : 'torso';
        else {
          l.slot = null;
          l.hidesHair = false;
          l.hidesBeard = false;
        }
        if (o.apparelLayer !== undefined) l.apparelLayer = o.apparelLayer || undefined;
        if (typeof o.followHead === 'boolean') l.followHead = o.followHead;
        if (l.slot === 'headgear' && typeof o.hidesHair === 'boolean') l.hidesHair = o.hidesHair;
        if (l.slot === 'headgear' && typeof o.hidesBeard === 'boolean') l.hidesBeard = o.hidesBeard;
        if (Number.isFinite(o.drawSize) && o.drawSize > 0) l.drawSize = o.drawSize;
      }
    afterLayersChanged();
    renderLibrary();
    showAssetEditor(pickedEntries());
  };
  const sel = document.createElement('select');
  for (const [v, t] of [
    ['body', 'Body'],
    ['head', 'Head'],
    ['hair', 'Hair'],
    ['beard', 'Beard'],
    ['apparel-torso', 'Apparel: body / torso'],
    ['apparel-headgear', 'Apparel: headgear (hat)'],
    ['weapon', 'Weapon'],
    ['gene', 'Gene overlay'],
  ]) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    if (v === curType) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    const hat = sel.value === 'apparel-headgear';
    setAll({
      type: sel.value,
      followHead: hat || ['head', 'hair', 'beard'].includes(sel.value),
      hidesHair: hat ? !!ov.hidesHair : false,
      hidesBeard: hat ? !!ov.hidesBeard : false,
    });
  });
  box.appendChild(row('Type', sel));
  const chk = (label, val, on) => {
    const i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = val;
    i.addEventListener('change', () => on(i.checked));
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;gap:6px;align-items:center';
    l.append(i, document.createTextNode(label));
    box.appendChild(l);
  };
  const startFh = ov.followHead !== undefined ? ov.followHead : ['apparel-headgear', 'head', 'hair', 'beard'].includes(curType);
  chk('Sits on the head (follows head offset)', startFh, (v) => setAll({ followHead: v }));
  if (curType === 'apparel-headgear') {
    chk('Hides hair', ov.hidesHair !== undefined ? ov.hidesHair : hidesHairName(e.base), (v) => setAll({ hidesHair: v }));
    chk('Hides beard', !!ov.hidesBeard, (v) => setAll({ hidesBeard: v }));
  }
  if (curType === 'apparel-torso' || curType === 'apparel-headgear') {
    const al = document.createElement('select');
    al.title =
      'Which RimWorld apparel layer this item uses. Sets the order when you press "Sort like the game" (a backpack or belt item is usually Belt).';
    const opts =
      curType === 'apparel-headgear'
        ? [
            ['', 'Overhead (hat / helmet)'],
            ['EyeCover', 'EyeCover (goggles)'],
          ]
        : [
            ['OnSkin', 'OnSkin (shirt)'],
            ['Middle', 'Middle (jacket)'],
            ['Shell', 'Shell (coat / armour)'],
            ['Belt', 'Belt (pack / belt)'],
          ];
    const cur = ov.apparelLayer || (curType === 'apparel-headgear' ? '' : 'Middle');
    for (const [v, t] of opts) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = t;
      if (v === cur) o.selected = true;
      al.appendChild(o);
    }
    al.addEventListener('change', () => setAll({ apparelLayer: al.value }));
    box.appendChild(row('Layer', al));
  }
  const ds = numInput(Number.isFinite(ov.drawSize) ? ov.drawSize : 1.5, 0.05, (v) => {
    if (v > 0) setAll({ drawSize: v });
  });
  box.appendChild(row('Draw size', ds));
  if (!multi) {
    // real texture size, to spot art that is much bigger/smaller than its neighbours
    const ref = { kind: 'game', pack: e.pack, rel: facingsOf(e).south || facingsOf(e).single || Object.values(facingsOf(e))[0] };
    const info = document.createElement('div');
    info.className = 'small muted';
    box.appendChild(info);
    onImageReady(ref, (im) => {
      info.textContent = 'Texture: ' + (im.naturalWidth || im.width) + '×' + (im.naturalHeight || im.height) + ' px';
    });
  }
  const b = document.createElement('div');
  b.className = 'btnrow';
  b.append(
    btn('Add to pawn', () => list.forEach((x) => addFromEntry(x))),
    btn('Reset to auto', () => {
      list.forEach((x) => delete OV[x.base]);
      saveOv();
      renderLibrary();
      showAssetEditor(pickedEntries());
    }),
  );
  box.appendChild(b);
}

function addFromEntry(e, forceKind) {
  const ov = !forceKind && OV[e.base];
  const kind =
    forceKind || (ov && ov.type && ov.type.split('-')[0]) || (e.cat === 'hair' && /beard/i.test(e.base) ? 'beard' : CAT_TO_KIND[e.cat]) || 'apparel';
  const layer = newLayer(kind, e.base.split('/').pop(), refsFromEntry(e));
  if (kind === 'weapon') layer.off = DEFAULT_WEAPON_OFF();
  const presets = (S.game && S.game.presets) || {};
  const preset =
    presets[e.base] ||
    (Object.keys(presets).find((k) => e.base.endsWith('/' + k)) ? presets[Object.keys(presets).find((k) => e.base.endsWith('/' + k))] : null);
  if (!forceKind && kind === 'apparel' && !preset && e.slot === 'headgear') {
    layer.slot = 'headgear';
    layer.followHead = true;
  } // from an Apparel-Head folder
  if (!forceKind && kind === 'apparel' && !preset && e.slot === 'torso') layer.slot = 'torso';
  if (!forceKind && kind === 'apparel' && !preset && isHeadgearName(e.base)) {
    // guess hats from the name/path
    layer.slot = 'headgear';
    layer.followHead = true;
    layer.drawSize = 1.5;
    layer.hidesHair = hidesHairName(e.base);
  }
  if (!forceKind) applyPreset(layer, preset);
  layer.srcBase = e.base;
  if (e.variants) layer.variant = variantOf(e);
  if (ov) applyOverride(layer, ov);
  addOrReplace(layer);
}

// ---------- body types ----------------------------------------------------
function fillBodyTypes() {
  const sel = $('bodyType');
  sel.textContent = '';
  const bts = (S.game && S.game.bodyTypes) || [];
  const none = document.createElement('option');
  none.value = '';
  none.textContent = bts.length ? '(manual)' : '(no BodyTypeDefs found)';
  sel.appendChild(none);
  for (const b of bts) {
    const o = document.createElement('option');
    o.value = b.defName;
    o.textContent = b.defName;
    sel.appendChild(o);
  }
}

function applyBodyType(name) {
  S.bodyType = name;
  const b = ((S.game && S.game.bodyTypes) || []).find((x) => x.defName === name);
  if (!b) return;
  if (b.headOffset) {
    S.headOffset = [...b.headOffset];
    $('hoX').value = S.headOffset[0];
    $('hoZ').value = S.headOffset[1];
  }
  const e = bodyEntryFor(b);
  if (e) addFromEntry(e, 'body');
  followBodyVariants();
  requestRender();
}
