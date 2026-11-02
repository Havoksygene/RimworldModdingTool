'use strict';
// Mod builder, part 2 of 4: pictures. Turning layers / library entries / files into sprite references, the "Adjust picture" window,
// and converting a reference into the PNG that is exported. Registers the 'sprite' and 'wornby' form controls.
(function () {
  const { SC, M, el, btn2, getp, setp, sel, changed } = window.MB;
  const FACE4 = ['south', 'east', 'north', 'west'];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const round3 = (n) => Math.round(n * 1000) / 1000;

  // ---- sprite references ----------------------------------------------------------------------------------------
  function spriteFromLayer(l, mode) {
    const im = l.images || {};
    if (mode === 'single') {
      const r = im.single || im.south || im.east || im.north;
      return r ? { single: clone(r) } : null;
    }
    const out = {};
    for (const f of FACE4) if (im[f]) out[f] = clone(im[f]);
    if (im.single) out.single = clone(im.single);
    return Object.keys(out).length ? out : null;
  }
  const spriteFromEntry = (e, mode) => spriteFromLayer({ images: refsFromEntry(e) }, mode);

  function thumb(ref) {
    const c = el('canvas', { width: 48, height: 48, className: 'thumb' });
    onImageReady(ref, (im) => {
      const g = c.getContext('2d'),
        k = Math.min(48 / im.naturalWidth, 48 / im.naturalHeight);
      g.drawImage(im, (48 - im.naturalWidth * k) / 2, (48 - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
    });
    return c;
  }
  const thumbBox = (ref, caption) => el('div', { className: 'thumbbox' }, thumb(ref), el('div', { className: 'small muted', textContent: caption }));

  // The viewer's size (+/-10%, draw size) and per-view offsets only change how the layer is DRAWN in the viewer. To make the game show the
  // same thing, they are baked into the exported picture as a zoom + shift inside the square ("fit"). Weapons keep their drawSize in the def.
  function bakeFit(sprite, l) {
    if (!sprite || !l || l.kind === 'weapon') return sprite;
    const base = (typeof DEFAULT_SIZE !== 'undefined' && DEFAULT_SIZE[l.kind]) || 1.5;
    const z = Number.isFinite(l.drawSize) && l.drawSize > 0 ? l.drawSize / base : 1;
    for (const f of FACE4) {
      const r = sprite[f];
      if (!r || typeof r !== 'object') continue;
      const o = (l.off && l.off[f]) || [0, 0];
      const x = Number.isFinite(o[0]) ? o[0] / base : 0,
        y = Number.isFinite(o[1]) ? -o[1] / base : 0;
      if (Math.abs(z - 1) > 0.002 || Math.abs(x) > 0.002 || Math.abs(y) > 0.002) r.fit = { z: round3(z), x: round3(x), y: round3(y) };
    }
    return sprite;
  }

  // ---- form controls --------------------------------------------------------------------------------------------
  MB.controls.wornby = (it, f, v) => {
    const wrap = el('div'),
      strip = el('div', { className: 'row' });
    for (const [bt, spr] of Object.entries(v || {})) {
      const r = spr.south || spr.single;
      if (r) strip.append(thumbBox(r, bt));
    }
    wrap.append(
      strip,
      el(
        'div',
        { className: 'btnrow' },
        btn2('Use one set for all body types', () => {
          setp(it, f.k, undefined);
          changed(true);
        }),
      ),
    );
    return wrap;
  };
  MB.controls.sprite = (it, f, v) => {
    const wrap = el('div'),
      strip = el('div', { className: 'row' }),
      spr = v || {};
    for (const k of f.mode === 'single' ? ['single'] : FACE4) if (spr[k]) strip.append(thumbBox(spr[k], k));
    if (!strip.children.length) strip.append(el('span', { className: 'small muted', textContent: 'no sprite' }));
    const adjusted = Object.values(spr).filter((r) => r && r.fit);
    if (adjusted.length)
      strip.append(
        el('span', { className: 'small', style: 'color:var(--accent)', textContent: 'adjusted (zoom ' + Math.round(adjusted[0].fit.z * 100) + '%)' }),
      );
    const set = (s, hint, fromLayer) => {
      if (!s) {
        toast('Nothing to use there: ' + hint);
        return;
      }
      setp(it, f.k, s);
      if (it.type === 'weapon' && fromLayer && sel()) {
        const l = selLayer();
        if (l && Number.isFinite(l.drawSize)) it.drawSize = l.drawSize;
      }
      if (it.type === 'body') it.headOffset = [...S.headOffset];
      changed(true);
    };
    const fromSelectedLayer = () => {
      const l = selLayer();
      const s = l && (f.mode === 'single' ? spriteFromLayer(l, f.mode) : bakeFit(spriteFromLayer(l, f.mode), l));
      set(s, 'select a layer in the viewer first', true);
      if (l && !it.label) {
        it.label = l.name.replace(/_/g, ' ');
        changed(true);
      }
    };
    wrap.append(
      strip,
      el(
        'div',
        { className: 'btnrow' },
        ...(it.type !== 'building' && it.type !== 'item' && Object.keys(spr).length ? [btn2('Adjust picture…', () => openFitEditor(it, f))] : []),
        btn2('From selected layer', fromSelectedLayer),
        btn2('From library selection', () => {
          const e = pickedEntries()[0];
          set(e && spriteFromEntry(e, f.mode), 'click an asset in the viewer library first');
        }),
        btn2('Choose files…', async () => {
          const g = await window.api.pickImages();
          if (g && g[0]) set(spriteFromLayer({ images: refsFromFiles(g[0].facings) }, f.mode), 'no file chosen');
        }),
        btn2('Clear', () => {
          setp(it, f.k, undefined);
          changed(true);
        }),
      ),
    );
    return wrap;
  };

  // ---- picture adjust window: move / zoom the picture inside the square, anything outside is cut off -------------------------------
  const isIdentityFit = (ft) => Math.abs(ft.z - 1) < 0.002 && Math.abs(ft.x) < 0.002 && Math.abs(ft.y) < 0.002;
  async function openFitEditor(it, f) {
    const spr = getp(it, f.k) || {};
    const faces = ['south', 'east', 'north', 'single'].filter((k) => spr[k] && typeof spr[k] === 'object');
    if (!faces.length) {
      toast('No picture to adjust.');
      return;
    }
    const imgs = {};
    for (const k of faces) imgs[k] = await loadImageForRef(spr[k]);
    const fit = {};
    for (const k of faces) fit[k] = { z: 1, x: 0, y: 0, ...(spr[k].fit || {}) };
    let cur = faces[0];
    const W = 520,
      F = 360,
      o = (W - F) / 2; // canvas size, size of the gold frame, margin around it
    const ov = el('div', { className: 'pickov' }),
      box = el('div', { className: 'pick', style: 'width:min(600px,96vw)' });
    const cv = el('canvas', { width: W, height: W });
    cv.style.cssText = 'width:100%;max-width:520px;align-self:center;touch-action:none;cursor:grab;border-radius:6px;background:#0d0f12';
    const zoom = el('input', { type: 'range', min: 0.2, max: 4, step: 0.01 });
    zoom.style.flex = '1';
    const info = el('div', { className: 'small muted' }),
      tabs = el('div', { className: 'row' });
    const dim = (im) => [im.naturalWidth || im.width, im.naturalHeight || im.height];

    const draw = () => {
      const g = cv.getContext('2d'),
        im = imgs[cur],
        ft = fit[cur];
      g.clearRect(0, 0, W, W);
      for (let yy = 0; yy < F; yy += 12)
        for (let xx = 0; xx < F; xx += 12) {
          g.fillStyle = ((xx + yy) / 12) % 2 ? '#2a2f38' : '#1e2229';
          g.fillRect(o + xx, o + yy, 12, 12);
        }
      if (im) {
        const [iw, ih] = dim(im),
          k = Math.min(F / iw, F / ih) * ft.z;
        g.imageSmoothingEnabled = true;
        g.drawImage(im, W / 2 + ft.x * F - (iw * k) / 2, W / 2 + ft.y * F - (ih * k) / 2, iw * k, ih * k);
      }
      g.fillStyle = 'rgba(14,16,20,.72)';
      g.fillRect(0, 0, W, o);
      g.fillRect(0, o + F, W, o);
      g.fillRect(0, o, o, F);
      g.fillRect(o + F, o, o, F);
      g.strokeStyle = 'rgba(216,162,74,.95)';
      g.lineWidth = 2;
      g.strokeRect(o, o, F, F);
      g.strokeStyle = 'rgba(255,255,255,.18)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(W / 2, o);
      g.lineTo(W / 2, o + F);
      g.moveTo(o, W / 2);
      g.lineTo(o + F, W / 2);
      g.stroke();
      zoom.value = ft.z;
      const fixed = M.project.meta.spriteSize && /^\d+$/.test(M.project.meta.spriteSize) ? M.project.meta.spriteSize : null;
      const side = fixed || (im ? Math.max(...dim(im)) : '?');
      info.textContent = `Zoom ${Math.round(ft.z * 100)}%. Exported as ${side} × ${side}. The picture is cut at the gold frame.`;
    };
    const mkTabs = () => {
      tabs.textContent = '';
      for (const k of faces) {
        const b = btn2(k, () => {
          cur = k;
          mkTabs();
          draw();
        });
        if (k === cur) b.className = 'active';
        tabs.append(b);
      }
    };
    let drag = null;
    cv.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, fx: fit[cur].x, fy: fit[cur].y };
      cv.setPointerCapture(e.pointerId);
      cv.style.cursor = 'grabbing';
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const sc = cv.getBoundingClientRect().width / W;
      fit[cur].x = drag.fx + (e.clientX - drag.x) / sc / F;
      fit[cur].y = drag.fy + (e.clientY - drag.y) / sc / F;
      draw();
    });
    cv.addEventListener('pointerup', () => {
      drag = null;
      cv.style.cursor = 'grab';
    });
    cv.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        fit[cur].z = Math.min(4, Math.max(0.2, fit[cur].z * (e.deltaY < 0 ? 1.05 : 1 / 1.05)));
        draw();
      },
      { passive: false },
    );
    zoom.addEventListener('input', () => {
      fit[cur].z = parseFloat(zoom.value) || 1;
      draw();
    });
    const fill = () => {
      const im = imgs[cur];
      if (!im) return;
      const [a, b] = dim(im);
      fit[cur] = { z: Math.max(a, b) / Math.min(a, b), x: 0, y: 0 };
      draw();
    };
    const row = el(
      'div',
      { className: 'btnrow' },
      btn2('Fit whole picture', () => {
        fit[cur] = { z: 1, x: 0, y: 0 };
        draw();
      }),
      btn2('Fill the square', fill),
      btn2('−10%', () => {
        fit[cur].z *= 0.9;
        draw();
      }),
      btn2('+10%', () => {
        fit[cur].z *= 1.1;
        draw();
      }),
      btn2('Centre', () => {
        fit[cur].x = 0;
        fit[cur].y = 0;
        draw();
      }),
      btn2('Copy to all views', () => {
        for (const k of faces) fit[k] = { ...fit[cur] };
        draw();
        toast('Same position and zoom for every view.');
      }),
    );
    const close = () => ov.remove();
    const apply = () => {
      for (const k of faces) {
        const ft = fit[k];
        if (isIdentityFit(ft)) delete spr[k].fit;
        else spr[k].fit = { z: round3(ft.z), x: round3(ft.x), y: round3(ft.y) };
      }
      close();
      changed(true);
    };
    box.append(
      el(
        'div',
        { className: 'pickhead' },
        el('b', { textContent: 'Adjust picture' }),
        el('button', { textContent: '×', className: 'pickx', onclick: close }),
      ),
      tabs,
      cv,
      el('div', { className: 'row' }, el('span', { className: 'small', textContent: 'Zoom' }), zoom),
      info,
      row,
      el('div', { className: 'btnrow' }, btn2('Apply', apply), btn2('Cancel', close)),
      el('div', {
        className: 'small muted',
        textContent:
          'Drag to move, mouse wheel or the slider to zoom. Your original image is never changed; the cut is applied when the mod is exported.',
      }),
    );
    ov.append(box);
    ov.addEventListener('mousedown', (e) => {
      if (e.target === ov) close();
    });
    document.body.append(ov);
    mkTabs();
    draw();
  }

  // ---- reference -> PNG for the exported mod ---------------------------------------------------------------------------------------
  function loadImageForRef(ref) {
    return new Promise((resolve) => {
      const done = (im) => resolve(im || null);
      const t = setTimeout(() => done(null), 8000);
      onImageReady(ref, (im) => {
        clearTimeout(t);
        done(im);
      });
      if (imageState(ref) === 'error') {
        clearTimeout(t);
        done(null);
      }
    });
  }
  // keep = buildings and projectiles keep their own proportions (no squaring, no fit)
  async function refToBase64(ref, cache, keep) {
    const key = JSON.stringify(ref) + (keep ? '|keep' : '');
    if (cache.has(key)) return cache.get(key);
    const im = await loadImageForRef(ref);
    if (!im) return null;
    const [iw, ih] = [im.naturalWidth || im.width, im.naturalHeight || im.height];
    const mode = keep ? 'off' : (M.project.meta && M.project.meta.spriteSize) || 'square';
    // Fit onto a square canvas without distorting: transparent padding. A fixed size also scales the whole picture.
    const side = mode === 'off' ? 0 : mode === 'square' ? Math.max(iw, ih) : parseInt(mode, 10) || Math.max(iw, ih);
    const fit = !keep && ref.fit && typeof ref.fit === 'object' ? ref.fit : null;
    const c = document.createElement('canvas');
    const paint = (sd, z, dx, dy) => {
      c.width = c.height = sd;
      const k = Math.min(sd / iw, sd / ih) * z,
        w = iw * k,
        h = ih * k,
        g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(im, sd / 2 + dx * sd - w / 2, sd / 2 + dy * sd - h / 2, w, h);
    };
    if (fit) paint(side || Math.max(iw, ih), Number(fit.z) > 0 ? Number(fit.z) : 1, Number(fit.x) || 0, Number(fit.y) || 0);
    else if (!side) {
      c.width = iw;
      c.height = ih;
      c.getContext('2d').drawImage(im, 0, 0);
    } else paint(side, 1, 0, 0);
    const b = c.toDataURL('image/png').split(',')[1];
    cache.set(key, b);
    return b;
  }

  Object.assign(window.MB, { spriteFromLayer, spriteFromEntry, bakeFit, loadImageForRef, refToBase64, openFitEditor });
})();
