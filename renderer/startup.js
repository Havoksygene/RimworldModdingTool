'use strict';
// RimWorld Sprite Viewer renderer: game scanning results and app start. Plain script; shares globals with the other renderer files (see index.html for the order).

// ---------- startup -------------------------------------------------------
function applyGame(res) {
  if (!res) return;
  if (!res.ok) {
    if (res.sources && res.sources.length === 0) {
      S.game = null;
      fillBodyTypes();
      renderLibrary();
    }
    renderSources(res.sources || [], res.sourceInfo);
    $('gameStatus').style.whiteSpace = 'pre-wrap';
    if (res.error) $('gameStatus').textContent = res.error;
    else if (!S.game) {
      $('gameStatus').textContent = 'No sprites yet. Click “Import RimWorld art”, or add a folder of sprites.';
    }
    return;
  }
  S.game = res;
  if (!(res.bodyTypes || []).length) {
    // no RimWorld Defs folder added: approximate values so heads don't sit on the belly
    res.bodyTypes = FALLBACK_BODY_TYPES.map((b) => ({ ...b, headOffset: [...b.headOffset] }));
    res.notes = [
      ...(res.notes || []),
      'No BodyTypeDefs XML found: using the built-in RimWorld 1.7 head offsets. Add the RimWorld install folder (the one with Data/Core/Defs) to read them from your game instead.',
    ];
  }
  imgCache.clear();
  tintCache.clear();
  const n = res.entries.length,
    bt = res.bodyTypes.length;
  const userInfo = (res.sourceInfo || []).filter((x) => !x.builtin && !x.library);
  const userN = userInfo.reduce((a, x) => a + (x.entries || 0), 0);
  let msg = `${n} sprite group${n === 1 ? '' : 's'} · ${bt} body type${bt === 1 ? '' : 's'} found.`;
  if (!n) msg += '\nNo sprites yet. Click “Import RimWorld art”, or add a folder of sprites.';
  if (!bt) msg += '\nNo body-type XML found (add the RimWorld install folder for correct head offsets).';
  for (const note of res.notes || []) msg += '\n' + note;
  $('gameStatus').textContent = msg;
  $('gameStatus').style.whiteSpace = 'pre-wrap';
  renderSources(res.sources || [], res.sourceInfo);
  fillBodyTypes();
  renderLibrary();
  if (!S.layers.length && n) seedDefaultPawn();
}

function renderSources(list, infos) {
  const box = $('sourceList');
  box.textContent = '';
  const user = (infos || []).filter((si) => !si.builtin && !si.library);
  list.forEach((src, i) => {
    const p = typeof src === 'string' ? src : src.path;
    const si = user[i] || {};
    const d = document.createElement('div');
    d.className = 'src';
    const t = document.createElement('span');
    t.className = 'p';
    t.textContent = p.length > 30 ? '…' + p.slice(-29) : p;
    t.title = p + (si.kind ? '\n' + si.kind + ': ' + (si.entries || 0) + ' sprites, ' + (si.images || 0) + ' images' : '');
    if (si.exists === false) {
      t.textContent = '⚠ ' + t.textContent;
      t.title = p + '\nFolder not found.';
    }
    const sel = document.createElement('select');
    sel.title = 'What this folder contains';
    for (const c of ['auto', 'bodies', 'heads', 'hair', 'beards', 'apparel', 'apparel-body', 'apparel-head', 'weapons', 'genes', 'other']) {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c === 'auto' ? 'auto' : c;
      if ((src.category || 'auto') === c) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', async () => applyGame(await window.api.setSourceCategory(i, sel.value)));
    const x = document.createElement('button');
    x.textContent = '×';
    x.title = 'Remove this folder';
    x.addEventListener('click', async () => applyGame(await window.api.removeSource(i)));
    d.append(t, sel, x);
    box.appendChild(d);
  });
}

function seedDefaultPawn() {
  const find = (cat, needles) => {
    const list = S.game.entries.filter((e) => effCat(e) === cat);
    for (const n of needles) {
      const hit = list.find((e) => e.base.toLowerCase().includes(n));
      if (hit) return hit;
    }
    return list[0] || null;
  };
  const body = find('bodies', ['naked_female', 'naked_male']);
  const head = find('heads', ['male_average_normal', 'average_normal']);
  const hair = find('hair', ['shaved', 'bob', 'mop']);
  for (const e of [body, head, hair]) if (e) addFromEntry(e);
  const bts = S.game.bodyTypes || [];
  const bt = bts.find((b) => /^(Male|Female)/.test(b.defName)) || bts[0];
  if (bt) {
    $('bodyType').value = bt.defName;
    applyBodyType(bt.defName);
  }
  S.selId = null;
  afterLayersChanged();
  H.stack = [];
  H.idx = -1;
  commit(); // the starting pawn is the undo baseline
}

// Used by the headless smoke test (electron . --smoke <gameDir> <out.png>)
// main.js pre-seeds the saved game folder, so init() auto-loads it; here we wait for that,
// then add an apparel + weapon layer and switch to the 4-facing sheet.
window.__smoke = async () => {
  for (let i = 0; i < 100 && !S.game; i++) await new Promise((r) => setTimeout(r, 50));
  if (!S.game) throw new Error('game not loaded');
  const pick = (cat, needle) => S.game.entries.find((e) => e.cat === cat && e.base.toLowerCase().includes(needle));
  const a = pick('apparel', 'shirt'),
    w = pick('weapons', 'revolver');
  if (a) addFromEntry(a);
  if (w) addFromEntry(w);
  S.mode = 'sheet';
  S.ppt = 120;
  render();
  await new Promise((r) => setTimeout(r, 400));
  render();
  return S.layers.map((l) => l.kind + ':' + l.name).join(',');
};

(async function init() {
  const pr = loadPrefs();
  if (pr.ppt) S.ppt = pr.ppt;
  if (pr.bg) S.bg = pr.bg;
  if (pr.skin) S.skin = pr.skin;
  if (pr.hair) S.hair = pr.hair;
  if (typeof pr.grid === 'boolean') S.grid = pr.grid;
  if (typeof pr.stretch === 'boolean') S.stretch = pr.stretch;
  if (typeof pr.flipDds === 'boolean') {
    S.flipDds = pr.flipDds;
    $('flipDds').checked = pr.flipDds;
  }
  if (pr.addCat) $('addCat').value = pr.addCat;
  $('zoom').value = S.ppt;
  $('bg').value = S.bg;
  $('grid').checked = S.grid;
  $('stretch').checked = S.stretch;
  $('skin').value = S.skin;
  $('hairc').value = S.hair;
  fillBodyTypes();
  renderLibrary();
  renderLayerList();
  renderProps();
  render();
  applyGame(await window.api.autoDetectGame());
  H.saved = snapshot(); // the starting pawn is not 'unsaved work'
})();
