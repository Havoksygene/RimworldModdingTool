'use strict';
// RimWorld Sprite Viewer renderer: canvas rendering. Plain script; shares globals with the other renderer files (see index.html for the order).

// ---------- rendering --------------------------------------------------
let renderQueued = false;
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function layerColor(l) {
  if (l.tintMode === 'skin') return S.skin;
  if (l.tintMode === 'hair') return S.hair;
  if (l.tintMode === 'custom') return l.tintColor;
  return null;
}

function drawBackground(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (S.bg === 'checker') {
    const s = 16;
    for (let j = 0; j < h; j += s)
      for (let i = 0; i < w; i += s) {
        ctx.fillStyle = (i / s + j / s) & 1 ? '#2a2e36' : '#222630';
        ctx.fillRect(x + i, y + j, s, s);
      }
  } else {
    ctx.fillStyle = S.bg === 'dark' ? '#0d0f12' : S.bg === 'grass' ? '#4a6a35' : '#8a7f70';
    ctx.fillRect(x, y, w, h);
  }
  if (S.grid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    const cx = x + w / 2,
      cy = y + h / 2,
      t = S.ppt;
    // tile grid with the pawn tile centered
    for (let gx = cx - t / 2; gx < x + w; gx += t) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gx = cx - t / 2 - t; gx > x; gx -= t) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gy = cy - t / 2; gy < y + h; gy += t) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
    for (let gy = cy - t / 2 - t; gy > y; gy -= t) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(216,162,74,0.55)';
    ctx.strokeRect(cx - t / 2, cy - t / 2, t, t);
  }
  ctx.restore();
}

function drawLayer(ctx, l, cx, cy, facing) {
  const { ref, mirror } = imageForFacing(l, facing);
  if (!ref) return;
  const img = tinted(ref, layerColor(l));
  if (!img) return;
  const iw = img.width || img.naturalWidth,
    ih = img.height || img.naturalHeight;
  const t = S.ppt;
  const ds = Number.isFinite(l.drawSize) && l.drawSize > 0 ? l.drawSize : 1.5;
  const w = ds * t,
    h = S.stretch ? ds * t : ds * t * (ih / iw);
  let [ox, oz] = l.off[facing === 'west' && mirror ? 'east' : facing];
  if (l.followHead) {
    if (facing === 'east' || facing === 'west') ox += S.headOffset[0];
    oz += S.headOffset[1];
  } // X only on side views (to be confirmed against the game)
  if (!Number.isFinite(ox) || !Number.isFinite(oz)) {
    ox = 0;
    oz = 0;
  } // never let a bad number hide a layer
  if (facing === 'west' && mirror) ox = -ox;
  ctx.save();
  ctx.globalAlpha = l.opacity == null ? 1 : l.opacity;
  ctx.translate(cx + ox * t, cy - oz * t);
  const ang = ((l.angle[facing === 'west' && mirror ? 'east' : facing] || 0) * Math.PI) / 180;
  ctx.rotate(mirror ? -ang : ang);
  ctx.scale((mirror ? -1 : 1) * (l.flip ? -1 : 1), 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  // selection outline
  if (l.id === S.selId && ctx.canvas === $('view')) {
    ctx.save();
    ctx.translate(cx + ox * t, cy - oz * t);
    ctx.strokeStyle = 'rgba(216,162,74,0.9)';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

function drawPawn(ctx, cx, cy, facing) {
  const hatHidesHair = S.layers.some((l) => l.visible && l.kind === 'apparel' && l.slot === 'headgear' && l.hidesHair);
  const hatHidesBeard = S.layers.some((l) => l.visible && l.kind === 'apparel' && l.slot === 'headgear' && l.hidesBeard);
  const vis = S.layers.filter((l) => l.visible && !(hatHidesHair && l.kind === 'hair') && !(hatHidesBeard && l.kind === 'beard'));
  const behindKey = (l) => l.behind[facing === 'west' ? 'west' : facing];
  for (const l of vis.filter((l) => behindKey(l))) drawLayer(ctx, l, cx, cy, facing);
  for (const l of vis.filter((l) => !behindKey(l))) drawLayer(ctx, l, cx, cy, facing);
}

function cellSize() {
  return Math.round(S.ppt * 3.2);
}

function bodyEntryFor(b) {
  if (!b || !b.bodyNakedGraphicPath || !S.game) return null;
  // exact path first; extracted sprite dumps have no folders, so fall back to the file name
  const want = b.bodyNakedGraphicPath.toLowerCase(),
    wantName = want.split('/').pop();
  return (
    S.game.entries.find((x) => x.base.toLowerCase() === want) ||
    S.game.entries.find((x) => effCat(x) === 'bodies' && x.base.split('/').pop().toLowerCase() === wantName) ||
    S.game.entries.find((x) => x.base.split('/').pop().toLowerCase() === wantName) ||
    null
  );
}

function paint(canvas, mode, facingOnly) {
  const cell = cellSize();
  let cells, labels;
  if (mode === 'bodies') {
    const bts = ((S.game && S.game.bodyTypes) || []).filter((b) => b.bodyNakedGraphicPath || b.headOffset).slice(0, 10);
    cells = bts.length ? bts : [null];
    labels = cells.map((b) => (b ? b.defName : 'current'));
  } else {
    cells = mode === 'sheet' ? FACINGS : [facingOnly];
    labels = cells.map((f) => f);
  }
  canvas.width = cell * cells.length;
  canvas.height = cell;
  const ctx = canvas.getContext('2d');
  cells.forEach((c, i) => {
    drawBackground(ctx, i * cell, 0, cell, cell);
    if (mode === 'bodies') {
      const keepLayers = S.layers,
        keepOff = S.headOffset;
      try {
        if (c) {
          if (c.headOffset) S.headOffset = c.headOffset;
          const be = bodyEntryFor(c);
          if (be) S.layers = S.layers.map((l) => (l.kind === 'body' ? { ...l, images: refsFromEntry(be) } : l));
        }
        drawPawn(ctx, i * cell + cell / 2, cell / 2, facingOnly);
      } finally {
        S.layers = keepLayers;
        S.headOffset = keepOff;
      }
    } else drawPawn(ctx, i * cell + cell / 2, cell / 2, c);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(labels[i], i * cell + 8, 16);
  });
}

function render() {
  paint($('view'), S.mode, S.facing);
}
