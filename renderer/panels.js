'use strict';
// RimWorld Sprite Viewer renderer: layer list and the properties panel. Plain script; shares globals with the other renderer files (see index.html for the order).

// ---------- layer list + properties --------------------------------------
function missingFacings(l) {
  if (l.images.single) return [];
  return ['south', 'east', 'north'].filter((f) => !l.images[f]);
}

function renderLayerList() {
  const box = $('layerList');
  box.textContent = '';
  if (!S.layers.length) {
    const m = document.createElement('div');
    m.className = 'muted';
    m.textContent = 'No layers yet. Pick items from the library or add your own sprite.';
    box.appendChild(m);
    return;
  }
  // top of the list = drawn last (on top)
  [...S.layers].reverse().forEach((l) => {
    const d = document.createElement('div');
    d.className = 'layer' + (l.id === S.selId ? ' sel' : '') + (missingFacings(l).length ? ' warn' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = l.visible;
    cb.addEventListener('click', (ev) => ev.stopPropagation());
    cb.addEventListener('change', () => {
      l.visible = cb.checked;
      requestRender();
      commit();
    });
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = l.name;
    const kd = document.createElement('span');
    kd.className = 'kd';
    kd.textContent = l.kind;
    const mv = document.createElement('span');
    mv.className = 'mv';
    const mvb = (t, tip, dir) => {
      const b = document.createElement('button');
      b.textContent = t;
      b.title = tip;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        moveLayer(l, dir);
      });
      return b;
    };
    mv.append(mvb('▲', 'Draw later (in front)', 1), mvb('▼', 'Draw earlier (behind)', -1));
    d.append(cb, nm, kd, mv);
    d.draggable = true;
    d.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', l.id);
      ev.dataTransfer.effectAllowed = 'move';
    });
    d.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      d.classList.add('dragover');
    });
    d.addEventListener('dragleave', () => d.classList.remove('dragover'));
    d.addEventListener('drop', (ev) => {
      ev.preventDefault();
      d.classList.remove('dragover');
      const id = ev.dataTransfer.getData('text/plain');
      if (!id || id === l.id) return;
      const from = S.layers.findIndex((x) => x.id === id),
        to = S.layers.findIndex((x) => x.id === l.id);
      if (from < 0 || to < 0) return;
      const [it] = S.layers.splice(from, 1);
      S.layers.splice(to, 0, it); // lands where the target row is
      afterLayersChanged();
    });
    d.addEventListener('click', () => {
      S.selId = l.id;
      renderLayerList();
      renderProps();
      requestRender();
    });
    box.appendChild(d);
  });
}

function numInput(value, step, onChange, width) {
  const i = document.createElement('input');
  i.type = 'number';
  i.step = step;
  i.value = (+value).toFixed(3).replace(/\.?0+$/, '') || '0';
  if (width) i.style.width = width;
  i.addEventListener('input', () => {
    const v = parseFloat(i.value);
    if (!Number.isNaN(v)) onChange(v);
  });
  return i;
}
function row(label, ...els) {
  const r = document.createElement('div');
  r.className = 'row';
  const lb = document.createElement('label');
  lb.textContent = label;
  r.appendChild(lb);
  els.forEach((e) => r.appendChild(e));
  return r;
}
function btn(text, fn, cls) {
  const b = document.createElement('button');
  b.textContent = text;
  if (cls) b.className = cls;
  b.addEventListener('click', fn);
  return b;
}

function renderProps() {
  const box = $('propsBody');
  box.textContent = '';
  const l = selLayer();
  if (!l) {
    box.className = 'muted';
    box.textContent = 'Select a layer.';
    return;
  }
  box.className = '';
  const f = S.facing;

  const name = document.createElement('input');
  name.type = 'text';
  name.value = l.name;
  name.style.flex = '1';
  name.addEventListener('input', () => {
    l.name = name.value;
    renderLayerList();
  });
  box.appendChild(row('Name', name));

  const chips = document.createElement('div');
  chips.className = 'facingchips';
  for (const ff of ['south', 'east', 'north', 'west']) {
    const has = l.images.single ? true : ff === 'west' ? !!(l.images.west || l.images.east) : !!l.images[ff];
    const ref = ff === 'west' ? l.images.west || l.images.east : l.images[ff];
    const st = ref ? imageState(ref) : 'none';
    const c = document.createElement('span');
    c.className = 'chip' + (!has || st === 'error' ? ' miss' : '');
    c.textContent = ff[0].toUpperCase() + (has && st !== 'error' ? ' ✓' : ' ✗');
    if (st === 'error') c.title = (imageInfo(ref) || {}).error || 'error';
    chips.appendChild(c);
  }
  box.appendChild(row('Sprites', chips));

  const tm = document.createElement('select');
  for (const [v, t] of [
    ['none', 'None'],
    ['skin', 'Skin colour'],
    ['hair', 'Hair colour'],
    ['custom', 'Custom'],
  ]) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    if (l.tintMode === v) o.selected = true;
    tm.appendChild(o);
  }
  tm.addEventListener('change', () => {
    l.tintMode = tm.value;
    requestRender();
  });
  const tc = document.createElement('input');
  tc.type = 'color';
  tc.value = l.tintColor;
  tc.addEventListener('input', () => {
    l.tintColor = tc.value;
    l.tintMode = 'custom';
    tm.value = 'custom';
    requestRender();
  });
  box.appendChild(row('Tint', tm, tc));

  const dsIn = numInput(l.drawSize, 0.05, (v) => {
    l.drawSize = v;
    requestRender();
  });
  const scaleBy = (k) => () => {
    l.drawSize = Math.round(l.drawSize * k * 1000) / 1000;
    renderProps();
    requestRender();
    commit();
  };
  box.appendChild(
    row(
      'Draw size',
      dsIn,
      btn('−10%', scaleBy(0.9)),
      btn('+10%', scaleBy(1.1)),
      btn('1.5', () => {
        l.drawSize = 1.5;
        renderProps();
        requestRender();
        commit();
      }),
    ),
  );
  const ox = numInput(l.off[f][0], 0.005, (v) => {
    l.off[f][0] = v;
    requestRender();
  });
  const oz = numInput(l.off[f][1], 0.005, (v) => {
    l.off[f][1] = v;
    requestRender();
  });
  ox.id = 'propOX';
  oz.id = 'propOZ';
  const lab = f === 'west' ? 'Offset (west)' : 'Offset ' + f;
  box.appendChild(row(lab, ox, oz));
  if (f === 'west' && !l.images.west && l.images.east) {
    const n = document.createElement('div');
    n.className = 'small muted';
    n.textContent = 'West is mirrored from East; edit the East offset.';
    box.appendChild(n);
  }
  box.appendChild(
    row(
      'Angle',
      numInput(l.angle[f], 1, (v) => {
        l.angle[f] = v;
        requestRender();
      }),
    ),
  );
  {
    const k = editTarget(l, f).key;
    box.appendChild(
      row(
        'Offsets',
        btn('Copy to all views', () => {
          for (const g of ['south', 'east', 'north']) {
            l.off[g] = [...l.off[k]];
            l.angle[g] = l.angle[k];
          }
          renderProps();
          requestRender();
          commit();
        }),
        btn('Reset this view', () => {
          l.off[k] = [0, 0];
          l.angle[k] = 0;
          renderProps();
          requestRender();
          commit();
        }),
      ),
    );
  }

  const op = document.createElement('input');
  op.type = 'range';
  op.min = 0.1;
  op.max = 1;
  op.step = 0.05;
  op.value = l.opacity == null ? 1 : l.opacity;
  op.addEventListener('input', () => {
    l.opacity = parseFloat(op.value);
    requestRender();
  });
  box.appendChild(row('Opacity', op));

  if (l.kind === 'apparel') {
    const sl = document.createElement('select');
    for (const [v, t] of [
      ['torso', 'Body / torso'],
      ['headgear', 'Headgear'],
    ]) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = t;
      if (l.slot === v) o.selected = true;
      sl.appendChild(o);
    }
    sl.addEventListener('change', () => {
      l.slot = sl.value;
      if (l.slot !== 'headgear') {
        l.hidesHair = false;
        l.hidesBeard = false;
      }
      renderProps();
      requestRender();
      commit();
    });
    box.appendChild(row('Worn on', sl));
    const al = document.createElement('select');
    const aopts =
      l.slot === 'headgear'
        ? [
            ['', 'Overhead'],
            ['EyeCover', 'EyeCover'],
          ]
        : TORSO_LAYERS.map((v) => [v, v]);
    for (const [v, t] of aopts) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = t;
      if ((l.apparelLayer || (l.slot === 'headgear' ? '' : 'Middle')) === v) o.selected = true;
      al.appendChild(o);
    }
    al.addEventListener('change', () => {
      l.apparelLayer = al.value;
      commit();
    });
    box.appendChild(row('Apparel layer', al));
  }

  // texture size info + sanity check
  const sizes = [];
  for (const ff of ['south', 'east', 'north']) {
    const ref = l.images[ff];
    if (ref) getImage(ref); // make sure every facing is loaded, not just the visible one
    const p = ref && absPath(ref);
    const c = p && imgCache.get(p);
    if (c && c.state === 'ok') sizes.push(ff[0].toUpperCase() + ' ' + c.img.naturalWidth + '×' + c.img.naturalHeight);
  }
  if (sizes.length) {
    const info = document.createElement('div');
    info.className = 'small muted';
    info.textContent = 'Texture: ' + sizes.join(' · ');
    box.appendChild(info);
    const nonSquare = sizes.filter((s) => {
      const m = /(\d+)×(\d+)/.exec(s);
      return m && m[1] !== m[2];
    });
    if (nonSquare.length) {
      const w = document.createElement('div');
      w.id = 'notice';
      w.textContent =
        'Not square (' +
        nonSquare.join(', ') +
        '). RimWorld draws sprites onto a square, so in game this image is STRETCHED. Re-export it as a square (for example 128×128), or let the mod builder fit it for you.';
      box.appendChild(w);
    }
    const uniq = new Set(sizes.map((s) => s.slice(2)));
    if (uniq.size > 1) {
      const w = document.createElement('div');
      w.id = 'notice';
      w.textContent = 'Facings have different pixel sizes - they will look scaled differently in game. Re-export them at the same size.';
      box.appendChild(w);
    }
  }

  const mkChk = (label, get, set) => {
    const i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = get();
    i.addEventListener('change', () => {
      set(i.checked);
      requestRender();
    });
    const w = document.createElement('label');
    w.style.cssText = 'display:flex;gap:6px;align-items:center;color:var(--text)';
    w.append(i, document.createTextNode(label));
    return w;
  };
  const cbx = document.createElement('div');
  cbx.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin:6px 0';
  cbx.append(
    mkChk(
      'Draw behind body (this facing)',
      () => l.behind[f],
      (v) => {
        l.behind[f] = v;
      },
    ),
    mkChk(
      'Follow head offset',
      () => l.followHead,
      (v) => {
        l.followHead = v;
      },
    ),
    mkChk(
      'Flip horizontally',
      () => l.flip,
      (v) => {
        l.flip = v;
      },
    ),
  );
  if (l.kind === 'apparel' && l.slot === 'headgear') {
    cbx.append(
      mkChk(
        'Hides hair (full-head hat)',
        () => l.hidesHair,
        (v) => {
          l.hidesHair = v;
        },
      ),
    );
    cbx.append(
      mkChk(
        'Hides beard (face covered)',
        () => l.hidesBeard,
        (v) => {
          l.hidesBeard = v;
        },
      ),
    );
  }
  box.appendChild(cbx);

  for (const ff of ['south', 'east', 'north', 'single']) {
    const ref = l.images[ff];
    if (!ref) continue;
    const inf = imageInfo(ref);
    const bad =
      inf &&
      (inf.state === 'error'
        ? inf.error
        : inf.opaque !== null && inf.opaque < 0.001
          ? 'fully transparent: nothing to see (wrong DDS format or orientation?)'
          : null);
    if (bad) {
      const n = document.createElement('div');
      n.id = 'notice';
      n.textContent = ff + ' sprite (' + baseName(absPath(ref)) + '): ' + bad;
      box.appendChild(n);
    }
  }

  const miss = missingFacings(l);
  if (miss.length) {
    const n = document.createElement('div');
    n.id = 'notice';
    n.textContent = 'Missing sprite(s): ' + miss.join(', ') + '. In-game this layer would not draw for those facings.';
    box.appendChild(n);
  }

  const br = document.createElement('div');
  br.className = 'btnrow';
  br.append(
    btn('Copy XML values', () => copyXml(l)),
    btn('Send to mod builder', () => window.ModBuilder.fromLayer(l)),
    ...(l.srcBase
      ? [
          btn('Save as asset default', () => {
            const o = OV[l.srcBase] || {};
            OV[l.srcBase] = {
              ...o,
              type: l.kind === 'apparel' ? (l.slot === 'headgear' ? 'apparel-headgear' : 'apparel-torso') : l.kind,
              followHead: l.followHead,
              hidesHair: l.hidesHair,
              hidesBeard: l.hidesBeard,
              layer: {
                off: l.off,
                angle: l.angle,
                behind: l.behind,
                flip: l.flip,
                drawSize: l.drawSize,
                opacity: l.opacity,
                tintMode: l.tintMode,
                tintColor: l.tintColor,
                followHead: l.followHead,
                hidesHair: l.hidesHair,
                hidesBeard: l.hidesBeard,
              },
            };
            OV[l.srcBase] = JSON.parse(JSON.stringify(OV[l.srcBase]));
            saveOv();
            renderLibrary();
            toast('Saved: "' + l.name + '" will now be added with these positions and sizes.');
          }),
          btn('Forget default', () => {
            if (OV[l.srcBase]) {
              delete OV[l.srcBase].layer;
              saveOv();
              toast('Saved default removed.');
            }
          }),
        ]
      : []),
    btn('Replace sprite…', async () => {
      const g = await window.api.pickImages();
      if (g && g[0]) {
        l.images = refsFromFiles(g[0].facings);
        afterLayersChanged();
      }
    }),
    btn('Up', () => moveLayer(l, 1)),
    btn('Down', () => moveLayer(l, -1)),
    btn('Duplicate', () => {
      const c = JSON.parse(JSON.stringify(l));
      c.id = uid();
      c.name += ' copy';
      S.layers.push(c);
      S.selId = c.id;
      afterLayersChanged();
    }),
    btn(
      'Delete',
      () => {
        S.layers = S.layers.filter((x) => x !== l);
        S.selId = null;
        afterLayersChanged();
      },
      'danger',
    ),
  );
  box.appendChild(br);
}

// Texture path relative to Textures/, without the facing suffix. Own files can't know their final
// in-mod folder, so a placeholder is used there.
function texPathOf(l) {
  const ref = l.images.south || l.images.single || l.images.east || l.images.north;
  if (!ref) return 'YOUR/TEXTURE/PATH';
  if (ref.kind === 'game')
    return ref.rel
      .replace(/^Things\//, 'Things/')
      .replace(/(\.(png|jpe?g|psd|tga|tiff?|bmp|dds))+$/i, '')
      .replace(/_(south|east|north|west)$/i, '');
  const name = ref.path
    .split(/[\\/]/)
    .pop()
    .replace(/(\.(png|jpe?g|psd|tga|tiff?|bmp|dds))+$/i, '')
    .replace(/_(south|east|north|west)$/i, '');
  return 'YOUR/FOLDER/' + name;
}
function xmlFor(l) {
  const v = (a) => '(' + round3(a[0]) + ',0,' + round3(a[1]) + ')';
  const lines = [
    '<!-- Values from RimWorld Sprite Viewer. Field names are NOT verified against 1.7:',
    '     compare with a vanilla def of the same kind before using. -->',
    '<graphicData>',
    '  <texPath>' + texPathOf(l) + '</texPath>',
    '  <drawSize>' + l.drawSize + '</drawSize>',
  ];
  for (const f of ['south', 'east', 'north', 'west']) {
    const o = l.off[f];
    if (o[0] || o[1])
      lines.push('  <drawOffset' + f[0].toUpperCase() + f.slice(1) + '>' + v(o) + '</drawOffset' + f[0].toUpperCase() + f.slice(1) + '>');
  }
  lines.push('</graphicData>');
  return lines.join('\n');
}
async function copyXml(l) {
  const text = xmlFor(l);
  try {
    await navigator.clipboard.writeText(text);
    toast('XML values copied to the clipboard.');
  } catch {
    await window.api.saveFile({ defaultName: l.name + '_values.xml', filters: [{ name: 'XML', extensions: ['xml'] }], text });
  }
}

function moveLayer(l, dir) {
  const i = S.layers.indexOf(l),
    j = i + dir;
  if (j < 0 || j >= S.layers.length) return;
  S.layers.splice(i, 1);
  S.layers.splice(j, 0, l);
  renderLayerList();
  requestRender();
  commit();
}
