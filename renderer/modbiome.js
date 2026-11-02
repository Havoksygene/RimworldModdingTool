'use strict';
// Mod builder, biome controls: wild plant / animal lists with "rules" (every animal whose stat is at least X), ground bands, ground patches,
// and the scan of other mods' Defs that finds extra animals and plants (their stats are kept in project.scanned).
(function () {
  const { SC, M, el, btn2, changed, labelOf, openPick } = window.MB;
  const C = window.MB.controls;
  const num = (s) => {
    const n = parseFloat(s);
    return Number.isNaN(n) ? '' : n;
  };
  const numBox = (v, fn, w, ph) => {
    const i = el('input', { type: 'number', step: 'any', value: v == null ? '' : v });
    i.style.width = w || '80px';
    if (ph) i.placeholder = ph;
    i.addEventListener('input', () => fn(num(i.value)));
    return i;
  };

  // ---- scanning other mods: XML text -> animals / plants with their statBases -------------------------------------------------------
  function parseDefs(files) {
    const dp = new DOMParser(),
      named = new Map(),
      defs = [];
    for (const f of files) {
      let doc;
      try {
        doc = dp.parseFromString(String(f.text || '').replace(/^﻿/, ''), 'application/xml');
      } catch {
        continue;
      }
      if (doc.getElementsByTagName('parsererror').length) continue;
      for (const d of doc.documentElement ? [...doc.documentElement.children] : []) {
        const dn = d.querySelector(':scope > defName'),
          nm = d.getAttribute('Name');
        if (nm) named.set(nm, d);
        if (dn && dn.textContent.trim())
          defs.push({ tag: d.tagName, name: dn.textContent.trim(), el: d, abstract: d.getAttribute('Abstract') === 'True' });
      }
    }
    const chain = (d) => {
      const out = [];
      for (let i = 0; d && i < 20; i++) {
        out.push(d);
        const p = d.getAttribute('ParentName');
        d = p ? named.get(p) : null;
      }
      return out;
    };
    const stats = (d) => {
      const o = {};
      for (const e of chain(d).reverse()) {
        const sb = e.querySelector(':scope > statBases');
        if (sb)
          for (const s of sb.children) {
            const v = parseFloat(s.textContent);
            if (!Number.isNaN(v)) o[s.tagName] = v;
          }
      }
      return o;
    };
    const pick = (d, sel) => {
      for (const e of chain(d)) {
        const r = e.querySelector(':scope > ' + sel);
        if (r) return r;
      }
      return null;
    };
    const label = (d, n) => {
      const l = pick(d, 'label');
      const t = l ? l.textContent.trim() : n.replace(/_/g, ' ');
      return t.charAt(0).toUpperCase() + t.slice(1);
    };
    const things = new Map(defs.filter((d) => d.tag === 'ThingDef').map((d) => [d.name, d]));
    const animals = [],
      plants = [];
    for (const d of defs) {
      if (d.tag === 'PawnKindDef') {
        const r = d.el.querySelector(':scope > race'),
          race = r && things.get(r.textContent.trim());
        if (!race) continue;
        const intel = pick(race.el, 'race > intelligence');
        const ft = pick(race.el, 'race > fleshType');
        const isAnimalBase = chain(race.el).some((e) => /animal|insect|fish/i.test(e.getAttribute('ParentName') || ''));
        const think = pick(race.el, 'race > thinkTreeMain');
        if (intel && intel.textContent.trim() !== 'Animal') continue;
        if (ft && ft.textContent.trim() === 'Mechanoid') continue;
        if (!isAnimalBase && !(think && /animal/i.test(think.textContent))) continue;
        animals.push({ id: d.name, label: label(d.el, d.name), group: 'Animals', src: 'Scanned', stats: stats(race.el) });
      } else if (d.tag === 'ThingDef' && !d.abstract) {
        const cat = pick(d.el, 'category');
        if (pick(d.el, 'plant') && cat && cat.textContent.trim() === 'Plant')
          plants.push({ id: d.name, label: label(d.el, d.name), group: 'Plants', src: 'Scanned', stats: stats(d.el) });
      }
    }
    return { animals, plants };
  }
  async function scanMods() {
    const r = await window.api.scanDefs();
    if (!r) return null;
    const found = parseDefs(r.files);
    const sc = (M.project.scanned = M.project.scanned || { folders: [], animals: [], plants: [] });
    const merge = (a, b) => {
      const m = new Map(a.map((e) => [e.id, e]));
      for (const e of b) m.set(e.id, e);
      return [...m.values()];
    };
    sc.animals = merge(sc.animals, found.animals);
    sc.plants = merge(sc.plants, found.plants);
    sc.folders = [...new Set([...(sc.folders || []), ...r.folders])];
    changed(true);
    toast('Scanned ' + r.folders.join(', ') + ': found ' + found.animals.length + ' animals and ' + found.plants.length + ' plants.');
    return found;
  }
  window.MB.scanMods = scanMods;
  window.MB.parseDefs = parseDefs;

  // ---- wild plants / animals: entries and rules ---------------------------------------------------------------------------------------
  C.wildlist = (it, f, v, upd) => {
    const wrap = el('div'),
      arr = v || [],
      kind = f.kind;
    const word = kind === 'animals' ? 'animal' : 'plant';
    arr.forEach((e, idx) => {
      const row = el('div', { className: 'row' });
      if (e.rule) {
        row.append(el('span', { className: 'small', textContent: 'Rule: every ' + word + ' with' }));
        row.append(
          btn2(
            e.stat ? labelOf('stats', e.stat) : '(choose a stat)',
            () => openPick('stats', 'Stat of the ' + word, {}, { multi: false, selected: e.stat, onDone: (id) => ((e.stat = id), upd(arr, true)) }),
            'pairlabel',
          ),
        );
        const op = el('select');
        for (const [val, lab] of SC.RULE_OPS)
          op.append(Object.assign(el('option', { value: val, textContent: lab }), { selected: (e.op || '>=') === val }));
        op.addEventListener('change', () => ((e.op = op.value), upd(arr, true)));
        row.append(
          op,
          numBox(e.value, (n) => ((e.value = n), upd(arr, true)), '70px', 'number'),
        );
      } else {
        row.append(
          btn2(
            e.id ? labelOf(f.lk, e.id) + (labelOf(f.lk, e.id) === e.id ? '' : '  (' + e.id + ')') : '(choose)',
            () => openPick(f.lk, 'Choose a ' + word, {}, { multi: false, selected: e.id, onDone: (id) => ((e.id = id), upd(arr, true)) }),
            'pairlabel',
          ),
        );
      }
      row.append(el('span', { className: 'small muted', textContent: 'commonality' }));
      row.append(numBox(e.commonality, (n) => ((e.commonality = n), changed(false)), '70px'));
      row.append(btn2('×', () => (arr.splice(idx, 1), upd(arr, true))));
      wrap.append(row);
      if (e.rule) {
        const m = SC.matchRule(e, kind, M.project);
        const d = el(
          'details',
          { className: 'small muted' },
          el('summary', { textContent: 'Matches ' + m.length + ' ' + word + (m.length === 1 ? '' : 's') }),
        );
        d.append(el('div', { textContent: m.map((x) => x.label).join(', ') || 'nothing (choose a stat and a number)' }));
        wrap.append(d);
      }
    });
    wrap.append(
      el(
        'div',
        { className: 'row' },
        btn2('+ Add ' + word + '…', () =>
          openPick(f.lk, 'Choose a ' + word, {}, { multi: false, onDone: (id) => (arr.push({ id, commonality: 1 }), upd(arr, true)) }),
        ),
        btn2('+ Add rule (by stat)', () => (arr.push({ rule: true, stat: '', op: '>=', value: 1, commonality: 1 }), upd(arr, true))),
        btn2('Scan other mods…', async () => {
          await scanMods();
        }),
      ),
    );
    const sc = M.project.scanned;
    if (sc && sc.folders && sc.folders.length)
      wrap.append(
        el('div', {
          className: 'small muted',
          textContent:
            'Scanned: ' +
            sc.folders.join(', ') +
            ' (' +
            sc.animals.length +
            ' animals, ' +
            sc.plants.length +
            ' plants). Scan again after those mods change.',
        }),
      );
    return wrap;
  };

  // ---- ground bands (terrain + fertility/noise range) --------------------------------------------------------------------------------
  function bandsEditor(arr, onChange) {
    const wrap = el('div');
    arr.forEach((b, idx) => {
      wrap.append(
        el(
          'div',
          { className: 'row' },
          btn2(
            b.terrain ? labelOf('terrains', b.terrain) : '(choose a floor)',
            () =>
              openPick('terrains', 'Choose a floor', {}, { multi: false, selected: b.terrain, onDone: (id) => ((b.terrain = id), onChange(true)) }),
            'pairlabel',
          ),
          el('span', { className: 'small muted', textContent: 'from' }),
          numBox(b.min, (n) => ((b.min = n), onChange(false)), '70px'),
          el('span', { className: 'small muted', textContent: 'to' }),
          numBox(b.max, (n) => ((b.max = n), onChange(false)), '70px'),
          btn2('×', () => (arr.splice(idx, 1), onChange(true))),
        ),
      );
    });
    wrap.append(
      btn2('+ Add floor…', () =>
        openPick(
          'terrains',
          'Choose a floor',
          {},
          { multi: false, onDone: (id) => (arr.push({ terrain: id, min: -999, max: 999 }), onChange(true)) },
        ),
      ),
    );
    return wrap;
  }
  C.bands = (it, f, v, upd) => bandsEditor(v || [], (re) => (re ? upd(v || [], true) : changed(false)));
  C.patches = (it, f, v, upd) => {
    const wrap = el('div'),
      arr = v || [];
    arr.forEach((p, idx) => {
      p.bands = p.bands || [];
      const box = el('div', { className: 'msec' });
      box.append(
        el(
          'div',
          { className: 'row' },
          el('span', { className: 'small', textContent: 'Frequency' }),
          numBox(p.freq, (n) => ((p.freq = n), changed(false)), '80px'),
          el('label', { className: 'small' }, Object.assign(el('input', { type: 'checkbox', checked: !!p.pond }), {}), ' pond (water bodies)'),
          btn2('Remove patch', () => (arr.splice(idx, 1), upd(arr, true))),
        ),
      );
      box.querySelector('input[type=checkbox]').addEventListener('change', (e) => ((p.pond = e.target.checked), changed(false)));
      box.append(bandsEditor(p.bands, (re) => (re ? upd(arr, true) : changed(false))));
      wrap.append(box);
    });
    wrap.append(btn2('+ Add patch', () => (arr.push({ freq: 0.015, pond: false, bands: [] }), upd(arr, true))));
    return wrap;
  };

  // ---- approximate preview map ------------------------------------------------------------------------------------------------------
  // NOT the game's real map generator: ground comes from smooth noise read through the fertility bands, patches are more noise,
  // plants and animals are scattered by density and commonality. It shows the look and the mix, not exact numbers.
  const TCOL = {
    Soil: '#6b5236', SoilRich: '#4a3a26', Sand: '#c9b27a', SoftSand: '#d6c08a', Gravel: '#8a8780', Mud: '#5a4a3a', MarshyTerrain: '#4d5a3a',
    WaterShallow: '#4f86b8', WaterDeep: '#2d5a8a', WaterMovingShallow: '#5a93c2', WaterMovingChestDeep: '#3b70a3', Ice: '#dfeaf2', Lava: '#c4501f',
    Sandstone_Rough: '#8a7a68', Granite_Rough: '#7d7d7d', Limestone_Rough: '#9a9585', Slate_Rough: '#5f6670', Marble_Rough: '#b0b0b0',
  };
  const hashCol = (s, l) => {
    let h = 7;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return 'hsl(' + (h % 360) + ',' + (45 + (h % 30)) + '%,' + (l || 45) + '%)';
  };
  const pcol = (s) => {
    let h = 5;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return 'hsl(' + (75 + (h % 80)) + ',70%,' + (42 + (h % 3) * 8) + '%)';
  };
  const tcol = (t) => {
    const mine = ((M && M.project && M.project.items) || []).find((i) => i.type === 'floor' && (i.defName === t || (window.MB.defNameOf && window.MB.defNameOf(i) === t)));
    if (mine && /^#[0-9a-f]{6}$/i.test(mine.color || '')) return mine.color;
    return tcol0(t);
  };
  const tcol0 = (t) => TCOL[t] || (/water/i.test(t) ? '#4f86b8' : hashCol(t, 40));
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noiseField(w, h, freq, seed) {
    const r = rng(seed),
      G = 64,
      grid = Array.from({ length: G * G }, () => r());
    const sm = (t) => t * t * (3 - 2 * t);
    const at = (x, y) => grid[(((y % G) + G) % G) * G + (((x % G) + G) % G)];
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = 0,
          amp = 1,
          tot = 0,
          f = freq * 6; // vanilla frequencies (~0.015) look right at this scale
        for (let o = 0; o < 3; o++) {
          const fx = x * f,
            fy = y * f,
            x0 = Math.floor(fx),
            y0 = Math.floor(fy),
            tx = sm(fx - x0),
            ty = sm(fy - y0);
          const a = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx,
            b = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
          v += (a * (1 - ty) + b * ty) * amp;
          tot += amp;
          amp /= 2;
          f *= 2;
        }
        out[y * w + x] = v / tot;
      }
    return out;
  }
  const bandFor = (bands, v) => {
    for (const b of bands || []) {
      const lo = b.min === '' || b.min == null ? -999 : Number(b.min),
        hi = b.max === '' || b.max == null ? 999 : Number(b.max);
      if (v >= lo && v < hi) return b.terrain;
    }
    return null;
  };
  function buildPreview(it, project, seed, N) {
    const SCn = window.ModSchema,
      r = rng(seed * 7919 + 13);
    const ter = new Array(N * N),
      fert = noiseField(N, N, 0.021, seed + 1);
    const tf = (v) => -0.5 + v * 2.2; // spread the noise over the usual fertility range
    for (let i = 0; i < N * N; i++) ter[i] = bandFor(it.terrains, tf(fert[i])) || (it.terrains && it.terrains[0] && it.terrains[0].terrain) || 'Soil';
    (it.patches || []).forEach((p, pi) => {
      const nf = noiseField(N, N, Number(p.freq) || 0.015, seed + 100 + pi * 31);
      for (let i = 0; i < N * N; i++) {
        const t = bandFor(p.bands, (nf[i] - 0.5) * 2 * 0.9 + 0.5 + (nf[i] - 0.5) * 0.4);
        if (t) ter[i] = t;
      }
    });
    const water = (t) => /water|marsh|ice|lava/i.test(t);
    const pick = (list) => {
      const tot = list.reduce((a, e) => a + (Number(e.commonality) || 0), 0);
      if (!tot) return null;
      let x = r() * tot;
      for (const e of list) if ((x -= Number(e.commonality) || 0) < 0) return e.id;
      return list[list.length - 1].id;
    };
    const plantsL = SCn.resolveWild(it.wildPlants, 'plants', project),
      animalsL = SCn.resolveWild(it.wildAnimals, 'animals', project);
    const plants = [],
      animals = [],
      pc = {},
      ac = {};
    const pDens = Math.max(0, Number(it.plantDensity) || 0) * 0.35; // fraction of free land cells carrying a plant
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const t = ter[y * N + x];
        if (water(t)) continue;
        if (r() < pDens) {
          const id = pick(plantsL);
          if (id) (plants.push([x, y, id]), (pc[id] = (pc[id] || 0) + 1));
        }
      }
    const nAn = Math.round((N * N * (Number(it.animalDensity) || 0)) / 400);
    for (let k = 0; k < nAn * 1 && animalsL.length; k++) {
      const x = Math.floor(r() * N),
        y = Math.floor(r() * N);
      if (water(ter[y * N + x])) continue;
      const id = pick(animalsL);
      if (id) (animals.push([x, y, id]), (ac[id] = (ac[id] || 0) + 1));
    }
    const tc = {};
    for (const t of ter) tc[t] = (tc[t] || 0) + 1;
    return { N, ter, plants, animals, pc, ac, tc };
  }
  C.biomePreview = (it, f, v, upd) => {
    const wrap = el('div'),
      N = 120,
      Z = 4;
    const cv = el('canvas');
    cv.width = cv.height = N * Z;
    cv.style.cssText = 'max-width:100%;image-rendering:pixelated;border:1px solid #444;background:#222';
    const info = el('div', { className: 'small' });
    info.style.cssText = 'margin-top:6px;line-height:1.5';
    const draw = () => {
      let seed = Number(it.previewSeed) || 1;
      const m = buildPreview(it, M && M.project, seed, N),
        g = cv.getContext('2d');
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          g.fillStyle = tcol(m.ter[y * N + x]);
          g.fillRect(x * Z, y * Z, Z, Z);
        }
      for (const [x, y, id] of m.plants) {
        g.fillStyle = pcol(id);
        g.fillRect(x * Z, y * Z, 3, 3);
      }
      for (const [x, y, id] of m.animals) {
        g.fillStyle = '#fff';
        g.fillRect(x * Z - 1, y * Z - 1, 6, 6);
        g.fillStyle = hashCol(id, 55);
        g.fillRect(x * Z, y * Z, 4, 4);
      }
      info.textContent = '';
      const line = (title, o, colf) => {
        const d = el('div');
        d.append(el('b', { textContent: title + ': ' }));
        const ks = Object.keys(o).sort((a, b) => o[b] - o[a]);
        if (!ks.length) d.append(document.createTextNode('none'));
        ks.slice(0, 14).forEach((k, i) => {
          const sw = el('span', { textContent: '■' });
          sw.style.color = colf(k);
          d.append(sw, document.createTextNode(' ' + String(k).replace(/^Plant_/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2') + ' ' + o[k] + (i < Math.min(ks.length, 14) - 1 ? '   ' : '')));
        });
        if (ks.length > 14) d.append(document.createTextNode('   … and ' + (ks.length - 14) + ' more'));
        info.append(d);
      };
      const pct = {};
      for (const k in m.tc) pct[k] = Math.round((m.tc[k] / (N * N)) * 100) + '%';
      const d0 = el('div');
      d0.append(el('b', { textContent: 'Ground: ' }));
      Object.keys(m.tc)
        .sort((a, b) => m.tc[b] - m.tc[a])
        .forEach((k) => {
          const sw = el('span', { textContent: '■' });
          sw.style.color = tcol(k);
          d0.append(sw, document.createTextNode(' ' + k + ' ' + pct[k] + '   '));
        });
      info.append(d0);
      line('Plants (dots)', m.pc, pcol);
      line('Animals (squares)', m.ac, (k) => hashCol(k, 55));
    };
    wrap.append(
      el('div', { className: 'small', textContent: 'Approximate preview (' + N + ' × ' + N + ' cells). It is NOT the game\'s real map generator: it shows the look and the mix of ground, plants and animals, not exact counts.' }),
      cv,
      el('div', { className: 'row' }, btn2('New random map', () => ((it.previewSeed = Math.floor(Math.random() * 1e6)), draw())), btn2('Redraw with my changes', draw)),
      info,
    );
    setTimeout(draw, 0);
    return wrap;
  };
})();
