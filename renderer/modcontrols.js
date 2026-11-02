'use strict';
// Mod builder, part 3 of 4: the form controls. One small function per control type (the "t" of a field in modschema.js).
// Each gets (item, field, currentValue, update) and returns the element to show. Pictures live in modsprites.js.
(function () {
  const { SC, GEN, M, hooks, el, btn2, getp, setp, changed, entriesOf, labelOf, openPick, defNameOf } = window.MB;
  const C = window.MB.controls;
  const numOrBlank = (s) => {
    const n = parseFloat(s);
    return Number.isNaN(n) ? '' : n;
  };
  const numInput = (value, onInput, width) => {
    const i = el('input', { type: 'number', step: 'any', value: value == null ? '' : value });
    if (width) i.style.width = width;
    i.addEventListener('input', () => onInput(i));
    return i;
  };

  // ---- simple values ----------------------------------------------------------------------------------------------
  C.text = (it, f, v, upd) => {
    const i = el('input', { type: 'text', value: v || '' });
    i.style.width = '100%';
    if (f.k === 'defName') i.placeholder = GEN.pascal(it.label) ? defNameOf({ label: it.label }) : '';
    i.addEventListener('input', () => upd(i.value));
    i.addEventListener('change', () => hooks.renderItems());
    return i;
  };
  C.area = (it, f, v, upd) => {
    const i = el('textarea', { rows: 3, value: v || '' });
    i.style.width = '100%';
    i.addEventListener('input', () => upd(i.value));
    return i;
  };
  C.num = (it, f, v, upd) => numInput(v, (i) => upd(numOrBlank(i.value)));
  C.bool = (it, f, v, upd) => {
    const i = el('input', { type: 'checkbox', checked: !!v });
    i.addEventListener('change', () => upd(i.checked, true));
    return i;
  };
  C.select = (it, f, v, upd) => {
    const s = el('select');
    for (const [val, lab] of f.opts(it)) s.append(Object.assign(el('option', { value: val, textContent: lab }), { selected: val === v }));
    s.addEventListener('change', () => {
      upd(s.value, true);
      if (f.k === 'mode') applyModeDefaults(it);
      if (f.k === 'preset') {
        (it.type === 'mech' ? SC.applyMechPreset : it.type === 'animal' ? SC.applyAnimalPreset : it.type === 'item' ? SC.applyItemPreset : it.type === 'floor' ? SC.applyFloorPreset : it.type === 'gene' ? SC.applyGenePreset : it.type === 'plant' ? SC.applyPlantPreset : SC.applyBuildPreset)(it);
        changed(true);
      }
      if (f.k === 'shape') {
        SC.applyShape(it, it.type === 'gene');
        changed(true);
      }
      if (f.k === 'wornAs') {
        it.covers = undefined;
        changed(true);
      } // back to the preset's body parts
      if (f.k === 'craftStyle') {
        SC.applyCraftStyle(it);
        changed(true);
      }
    });
    return s;
  };
  C.vec = (it, f, v) => {
    const cur = v || [0, 0];
    const a = el('input', { type: 'number', step: 0.005, value: cur[0] }),
      b = el('input', { type: 'number', step: 0.005, value: cur[1] });
    const u = () => {
      it[f.k] = [parseFloat(a.value) || 0, parseFloat(b.value) || 0];
      changed(false);
    };
    a.addEventListener('input', u);
    b.addEventListener('input', u);
    return el(
      'div',
      { className: 'row' },
      a,
      b,
      btn2('From viewer', () => {
        it[f.k] = [...S.headOffset];
        changed(true);
      }),
    );
  };
  C.color = (it, f, v, upd) => {
    const wrap = el('div', { className: 'row' }),
      i = el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#ff8844' });
    i.addEventListener('change', () => upd(i.value, true));
    wrap.append(i, el('span', { className: 'muted small', textContent: v ? v : 'not set (uses the damage type default)' }));
    if (v) wrap.append(btn2('Clear', () => upd('', true)));
    return wrap;
  };
  C.xml = (it, f, v, upd) => {
    const wrap = el('div'),
      ta = el('textarea', { rows: f.rows || 8, value: v || '', spellcheck: false }),
      msg = el('div', { className: 'small' });
    ta.style.cssText = 'width:100%;font-family:monospace;font-size:12px;';
    ta.placeholder = f.k === 'xmlText' ? '<ThingDef ParentName="ResourceBase">\n  <defName>MyThing</defName>\n  ...\n</ThingDef>' : '<comps>\n  <li Class="CompProperties_Glower"><glowRadius>5</glowRadius></li>\n</comps>';
    const check = () => {
      const t = ta.value.trim();
      if (!t) {
        msg.textContent = '';
        return;
      }
      const r = GEN.checkXml(t);
      msg.textContent = r.ok ? '✓ well formed' : `✗ line ${r.line}: ${r.error}`;
      msg.style.color = r.ok ? 'var(--accent)' : 'var(--danger)';
    };
    ta.addEventListener('input', () => {
      upd(ta.value);
      check();
    });
    check();
    wrap.append(ta, msg);
    return wrap;
  };

  // Patch editor: shows the current stats / ingredients / workbenches of the chosen thing; typed values become patch operations.
  C.patchedit = (it, f) => {
    const wrap = el('div', { className: 'patchedit' });
    const d = SC.defOf(it);
    it.eStats = it.eStats || {};
    it.eCost = it.eCost || {};
    it.eBenchAdd = it.eBenchAdd || [];
    it.eBenchRemove = it.eBenchRemove || [];
    const head = d ? `${d.l} (${d.k}${d.src && d.src !== 'Core' ? ', ' + d.src : ''}): current values are shown in grey.` : 'This thing is not in the game data (another mod?): you can still set stats and ingredients by name.';
    wrap.append(el('div', { className: 'muted small', textContent: head }));
    const table = (title, store, cur, lk, unitHelp) => {
      const box = el('div');
      box.append(el('div', { className: 'small', textContent: title, style: 'margin-top:8px;font-weight:600' }));
      const keys = [...Object.keys(cur), ...Object.keys(store).filter((k) => !(k in cur))];
      if (!keys.length) box.append(el('div', { className: 'muted small', textContent: '(none)' }));
      for (const k of keys) {
        const e = store[k] || (store[k] = { v: '', rm: false });
        const inp = el('input', { type: 'text', value: e.v == null ? '' : e.v, placeholder: k in cur ? 'unchanged' : 'new value' });
        inp.style.width = '80px';
        inp.addEventListener('input', () => {
          e.v = inp.value;
          changed(false);
        });
        const rm = el('input', { type: 'checkbox', checked: !!e.rm });
        rm.addEventListener('change', () => {
          e.rm = rm.checked;
          changed(false);
        });
        const row = el('div', { className: 'row' }, el('span', { textContent: labelOf(lk, k), style: 'flex:1' }), el('span', { className: 'muted small', textContent: k in cur ? String(cur[k]) : 'new' }), inp, el('label', { className: 'small' }, rm, ' remove'));
        if (!(k in cur)) row.append(btn2('×', () => { delete store[k]; changed(true); }));
        box.append(row);
      }
      box.append(
        btn2('+ add', () =>
          openPick(lk, title, {}, {
            multi: false,
            selected: '',
            onDone: (id) => {
              if (id && !(id in store)) store[id] = { v: '', rm: false };
              changed(true);
            },
          }),
        ),
      );
      return box;
    };
    wrap.append(table('Stats', it.eStats, (d && d.s) || {}, 'stats'));
    wrap.append(table('Ingredients (amount)', it.eCost, (d && d.c) || {}, 'materials'));
    if (!d || d.w !== undefined) {
      const box = el('div');
      box.append(el('div', { className: 'small', textContent: 'Made at workbenches', style: 'margin-top:8px;font-weight:600' }));
      const cur = (d && d.w) || [];
      if (!cur.length) box.append(el('div', { className: 'muted small', textContent: '(no workbench listed)' }));
      for (const b of cur) {
        const rm = el('input', { type: 'checkbox', checked: it.eBenchRemove.includes(b) });
        rm.addEventListener('change', () => {
          it.eBenchRemove = it.eBenchRemove.filter((q) => q !== b);
          if (rm.checked) it.eBenchRemove.push(b);
          changed(false);
        });
        box.append(el('div', { className: 'row' }, el('span', { textContent: labelOf('workbenches', b), style: 'flex:1' }), el('label', { className: 'small' }, rm, ' remove')));
      }
      for (const b of it.eBenchAdd) box.append(el('div', { className: 'row' }, el('span', { textContent: labelOf('workbenches', b) + ' (added)', style: 'flex:1' }), btn2('×', () => { it.eBenchAdd = it.eBenchAdd.filter((q) => q !== b); changed(true); })));
      box.append(
        btn2('+ add workbench', () =>
          openPick('workbenches', 'Workbench', {}, {
            multi: false,
            selected: '',
            onDone: (id) => {
              if (id && !it.eBenchAdd.includes(id)) it.eBenchAdd.push(id);
              changed(true);
            },
          }),
        ),
      );
      wrap.append(box);
    } else wrap.append(el('div', { className: 'muted small', textContent: 'This thing has no crafting recipe, so there are no workbenches to change.', style: 'margin-top:8px' }));
    return wrap;
  };

  // ---- pick from a list (or type your own ID) ------------------------------------------------------------------------------------
  C.combo = (it, f, v, upd) => {
    const blank = f.blank || (f.k.startsWith('craft') ? '(style default)' : f.k === 'research' ? '(none)' : f.k === 'surface' ? '(nothing)' : null);
    const cur = (f.custom && it[f.custom]) || v || '';
    const name = cur ? labelOf(f.lk, cur) : '';
    const shown = cur ? (name === cur ? cur : name + '  (' + cur + ')') : blank || '(choose)';
    const choose = () =>
      openPick(
        f.lk,
        f.label,
        { blank },
        {
          multi: false,
          selected: cur,
          onDone: (id) => {
            it[f.k] = id;
            if (f.custom) it[f.custom] = '';
            changed(true);
          },
        },
      );
    return el('div', { className: 'row' }, el('span', { textContent: shown }), btn2('Choose…', choose));
  };
  C.multi = (it, f, v, upd) => {
    const wrap = el('div'),
      cur = [...(v || (f.def ? f.def(it) : []))];
    for (const id of cur)
      wrap.append(
        el(
          'span',
          { className: 'chip3' },
          el('span', { textContent: labelOf(f.lk, id) }),
          btn2('×', () =>
            upd(
              cur.filter((x) => x !== id),
              true,
            ),
          ),
        ),
      );
    if (!cur.length) wrap.append(el('span', { className: 'small muted', textContent: 'nothing selected  ' }));
    wrap.append(btn2('Choose…', () => openPick(f.lk, f.label, {}, { multi: true, selected: cur, onDone: (ids) => upd(ids, true) })));
    return wrap;
  };
  // rows of "name + number" (stat bonuses, ingredients)
  C.pairs = (it, f, v, upd) => {
    const wrap = el('div'),
      arr = v || [],
      opts = { kind: f.kind };
    if (f.lk === 'stats' && f.kind === 'item') {
      // do not offer the stats that already have a fixed box above
      const g = SC.fieldsFor(it.type).find((x) => x.t === 'stats');
      if (g) opts.exclude = new Set([...g.list, ...(g.extra ? g.extra(it) : [])].map((r) => r[0]));
    }
    const nameText = (p) => {
      if (!p.name) return '(choose)';
      const l = labelOf(f.lk, p.name);
      return l + (l === p.name ? '' : '  (' + p.name + ')');
    };
    arr.forEach((p, idx) => {
      const n = btn2(
        nameText(p),
        () =>
          openPick(f.lk, f.label, opts, {
            multi: false,
            selected: p.name,
            onDone: (id) => {
              p.name = id;
              upd(arr, true);
            },
          }),
        'pairlabel',
      );
      const q = numInput(
        p.value,
        (i) => {
          p.value = parseFloat(i.value);
          changed(false);
        },
        '90px',
      );
      q.placeholder = 'value';
      wrap.append(
        el(
          'div',
          { className: 'row' },
          n,
          q,
          btn2('×', () => {
            arr.splice(idx, 1);
            upd(arr, true);
          }),
        ),
      );
    });
    wrap.append(
      btn2('+ Add…', () =>
        openPick(f.lk, f.label, opts, {
          multi: false,
          onDone: (id) => {
            arr.push({ name: id, value: 1 });
            upd(arr, true);
          },
        }),
      ),
    );
    return wrap;
  };
  // the fixed numbers box (hit points, armour, ...)
  C.stats = (it, f) => {
    const wrap = el('div', { className: 'stats' }),
      st = (it[f.store || 'stats'] = it[f.store || 'stats'] || {});
    for (const [key, lab] of [...f.list, ...(f.extra ? f.extra(it) : [])]) {
      const i = el('input', { type: 'number', step: 'any', value: st[key] == null ? '' : st[key], title: key });
      i.addEventListener('input', () => {
        const n = parseFloat(i.value);
        st[key] = Number.isNaN(n) ? undefined : n;
        changed(false);
      });
      wrap.append(el('label', { textContent: lab }), i);
    }
    return wrap;
  };
  C.tools = (it, f, v, upd) => {
    const wrap = el('div'),
      arr = v || [];
    arr.forEach((t, idx) => {
      const l = el('input', { type: 'text', value: t.label || '', placeholder: 'name (blade)' });
      l.style.width = '90px';
      const c = el('select');
      for (const o of f.caps ? f.caps(it) : SC.CATALOG.meleeCapacities) c.append(Object.assign(el('option', { value: o, textContent: o }), { selected: o === t.capacity }));
      const p = el('input', { type: 'number', value: t.power, step: 'any', title: 'damage' }),
        cd = el('input', { type: 'number', value: t.cooldown, step: 'any', title: 'cooldown (s)' });
      l.addEventListener('input', () => {
        t.label = l.value;
        changed(false);
      });
      c.addEventListener('change', () => {
        t.capacity = c.value;
        changed(false);
      });
      p.addEventListener('input', () => {
        t.power = parseFloat(p.value);
        changed(false);
      });
      cd.addEventListener('input', () => {
        t.cooldown = parseFloat(cd.value);
        changed(false);
      });
      const g = f.groups ? el('input', { type: 'text', value: t.group || '', placeholder: 'body part' }) : null;
      if (g) {
        g.setAttribute('list', 'animalGroups');
        g.style.width = '110px';
        g.addEventListener('input', () => {
          t.group = g.value;
          changed(false);
        });
      }
      wrap.append(
        el(
          'div',
          { className: 'row' },
          l,
          c,
          p,
          cd,
          ...(g ? [g] : []),
          btn2('×', () => {
            arr.splice(idx, 1);
            upd(arr, true);
          }),
        ),
      );
    });
    wrap.append(
      ...(f.groups ? [el('datalist', { id: 'animalGroups' }, ...(SC.CATALOG.animalGroups || []).map((g) => el('option', { value: g })))] : []),
      el('div', { className: 'small muted', textContent: f.groups ? 'name · attack type · damage · cooldown (s) · body part' : 'name · damage type · damage · cooldown (s)' }),
      btn2('+ add attack', () => {
        arr.push({ label: 'attack', capacity: f.caps ? f.caps(it)[0] : 'Cut', power: 10, cooldown: 2, group: '' });
        upd(arr, true);
      }),
    );
    return wrap;
  };

  // "Can be made from": material categories with a sub list of single materials
  C.stufftree = (it, f, v) => {
    const wrap = el('div'),
      cats = new Set(v || []),
      off = new Set(it.excludeStuff || []);
    M.open = M.open || new Set();
    const save = (rerender) => {
      it.stuffCategories = [...cats];
      it.excludeStuff = [...off];
      changed(!!rerender);
    };
    for (const c of [...new Set([...Object.keys(SC.CATALOG.stuffTree), ...cats])]) {
      const lk = 'stuff_' + c,
        mats = entriesOf(lk),
        isOpen = M.open.has(c);
      const cb = el('input', { type: 'checkbox', checked: cats.has(c) });
      cb.addEventListener('change', () => {
        cb.checked ? cats.add(c) : cats.delete(c);
        save(true);
      });
      const count = mats.length ? ` (${mats.filter((m) => !off.has(m.id)).length}/${mats.length})` : '';
      const toggle = btn2(
        isOpen ? '▾' : '▸',
        () => {
          isOpen ? M.open.delete(c) : M.open.add(c);
          hooks.renderForm();
        },
        'pmini',
      );
      wrap.append(el('div', { className: 'row' }, toggle, el('label', { className: 'chip2' }, cb, document.createTextNode(c + count))));
      if (!isOpen) continue;
      const box = el('div', { className: 'stuffkids' });
      for (const m of mats) {
        const mc = el('input', { type: 'checkbox', checked: !off.has(m.id), disabled: !cats.has(c) });
        mc.addEventListener('change', () => {
          mc.checked ? off.delete(m.id) : off.add(m.id);
          save(false);
        });
        const unsure = !m.v && !m.custom ? [el('span', { className: 'punv', textContent: '?' })] : [];
        box.append(el('label', { className: 'chip2' }, mc, document.createTextNode(m.label), ...unsure));
      }
      box.append(btn2('+ my own material…', () => openPick(lk, 'Add a material to ' + c, {}, { multi: false, onDone: () => hooks.renderForm() })));
      wrap.append(box);
    }
    wrap.append(
      btn2('+ other category (modded)…', () =>
        openPick(
          'stuffCategories',
          'Material category',
          {},
          {
            multi: false,
            onDone: (id) => {
              if (id) {
                cats.add(id);
                M.open.add(id);
                save(true);
              }
            },
          },
        ),
      ),
    );
    return wrap;
  };

  // ---- a sound: pick from the game's list, or import your own file --------------------------------------------------------------------
  const MAX_SOUND = 1536 * 1024,
    MAX_ALL_SOUNDS = 4 * 1024 * 1024;
  const soundBytes = (rec) => rec.b64.length * 0.75;
  function importSound(it, f, file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!/^(wav|ogg|mp3)$/.test(ext)) {
      toast('Use a .wav or .ogg file.');
      return;
    }
    if (file.size > MAX_SOUND) {
      toast('That sound is over 1.5 MB. Use a short clip (an .ogg is much smaller than a .wav).');
      return;
    }
    const total = Object.values(M.project.audio || {}).reduce((a, r) => a + soundBytes(r), 0);
    if (total + file.size > MAX_ALL_SOUNDS) {
      toast('The project already holds a lot of sound. Remove one first.');
      return;
    }
    const rd = new FileReader();
    rd.onload = () => {
      const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      (M.project.audio = M.project.audio || {})[id] = { name: file.name, ext, b64: String(rd.result).split(',')[1] || '', vol: '' };
      it[f.k + 'Audio'] = id;
      it[f.k] = '';
      if (f.custom) it[f.custom] = '';
      changed(true);
    };
    rd.readAsDataURL(file);
  }
  C.sound = (it, f) => {
    const wrap = el('div'),
      aid = it[f.k + 'Audio'],
      rec = aid && (M.project.audio || {})[aid];
    if (rec) {
      const vol = numInput(
        rec.vol || '',
        (i) => {
          rec.vol = numOrBlank(i.value);
          changed(false);
        },
        '80px',
      );
      vol.placeholder = 'volume';
      vol.title = 'Volume (empty = a sensible default for this kind of sound)';
      const play = () => {
        try {
          const a = new Audio(`data:audio/${rec.ext === 'mp3' ? 'mpeg' : rec.ext};base64,${rec.b64}`);
          a.volume = 0.6;
          a.play().catch(() => toast('Could not play it here.'));
        } catch {
          toast('Could not play it here.');
        }
      };
      const remove = () => {
        it[f.k + 'Audio'] = '';
        if (!M.project.items.some((o) => Object.values(o).includes(aid))) delete M.project.audio[aid];
        changed(true);
      };
      wrap.append(
        el(
          'div',
          { className: 'row' },
          el('span', { textContent: '🔊 ' + rec.name + ' · ' + Math.round(soundBytes(rec) / 1024) + ' KB' }),
          vol,
          btn2('Play', play),
          btn2('Remove', remove),
        ),
      );
      return wrap;
    }
    const file = el('input', { type: 'file', accept: '.wav,.ogg,.mp3,audio/*' });
    file.style.display = 'none';
    file.addEventListener('change', () => {
      if (file.files && file.files[0]) importSound(it, f, file.files[0]);
    });
    wrap.append(
      MB.control(it, { ...f, t: 'combo' }),
      file,
      btn2('Use my own sound file…', () => file.click()),
    );
    return wrap;
  };

  // melee <-> ranged: refill the things that differ
  function applyModeDefaults(it) {
    const d = SC.newItem('weapon');
    it.craftStyle = it.mode === 'melee' ? 'smithing' : 'gun';
    SC.applyCraftStyle(it);
    if (it.mode === 'melee') {
      it.tags = ['MedievalMeleeDecent'];
      it.useStuff = true;
      it.stuffCategories = ['Metallic'];
      it.cost = [];
      it.stuffCount = 60;
    } else {
      it.tags = d.tags;
      it.workbenches = d.workbenches;
      it.useStuff = false;
      it.cost = d.cost;
    }
    hooks.renderForm();
    changed(true);
  }

  // one control for a field
  window.MB.control = (it, f) => {
    const v = getp(it, f.k);
    const upd = (val, rerender) => {
      setp(it, f.k, val);
      changed(!!rerender);
    };
    const make = C[f.t];
    return make ? make(it, f, v, upd) : el('span', { textContent: '?' });
  };
})();
