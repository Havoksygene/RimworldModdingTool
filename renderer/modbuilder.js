'use strict';
// Mod builder, part 4 of 4: the screens (item list, form, generated-XML panel), export, and the buttons.
// The form is generated from ModSchema.fieldsFor(type), so a new item type or field means editing modschema.js / modgen.js, not this file.
// Shared helpers come from modui.js (window.MB), controls from modcontrols.js, pictures from modsprites.js.
(function () {
  const MB = window.MB,
    { SC, GEN, M, hooks, el, btn2, sel, changed, persist, markSaved, dirty, load, lsSet } = MB;
  const $m = (id) => document.getElementById(id);
  const SAVEDKEY = 'rsv-modsaved';

  // ---- view switching -------------------------------------------------------------------------------------------
  function show(on) {
    $m('modView').hidden = !on;
    $m('app').style.display = on ? 'none' : '';
    if (on) refreshAll();
  }
  function refreshAll() {
    if (!M.selId && M.project.items.length) M.selId = M.project.items[0].id;
    renderMeta();
    renderItems();
    renderForm();
    refreshOutput();
  }
  const selectItem = (id) => {
    if (!id) return;
    M.selId = id;
    renderItems();
    renderForm();
  };

  // ---- right: problems + generated files -------------------------------------------------------------------------------
  // sprites in the output whose image is not square (only those already loaded can be checked)
  function nonSquareSprites(r) {
    const seen = new Set(),
      out = [];
    for (const f of r.files) {
      if (!f.sprite || f.keep) continue;
      const k = JSON.stringify(f.sprite);
      if (seen.has(k)) continue;
      seen.add(k);
      let c;
      try {
        getImage(f.sprite);
        c = imgCache.get(absPath(f.sprite));
      } catch {
        c = null;
      }
      if (c && c.state === 'loading' && !M.watching.has(k)) {
        M.watching.add(k);
        onImageReady(f.sprite, () => refreshOutput());
      }
      if (c && c.state === 'ok' && c.img && c.img.naturalWidth !== c.img.naturalHeight)
        out.push(f.path.split('/').pop() + ' (' + c.img.naturalWidth + '×' + c.img.naturalHeight + ')');
    }
    return out;
  }
  function showPreview() {
    const f = M.result && M.result.files.find((x) => x.path === M.previewPath),
      pre = $m('modPre');
    if (pre) pre.textContent = !f ? '' : f.text || '(image: ' + f.path + ')';
  }
  function problemLine(cls, mark, text, id) {
    const d = el('div', { className: 'small ' + cls + ' link', textContent: mark + ' ' + text, title: 'Click to open this item' });
    d.addEventListener('click', () => selectItem(id));
    return d;
  }
  function refreshOutput() {
    M.result = GEN.generate(M.project);
    const r = M.result,
      box = $m('modOut');
    box.textContent = '';
    const head = el('div', { className: 'small' }, r.errors.length ? `${r.errors.length} problem(s) to fix before export` : 'Ready to export');
    head.style.color = r.errors.length ? 'var(--danger)' : 'var(--accent)';
    box.append(head);
    const idFor = (text) => {
      const k = String(text).split(':')[0].trim();
      const it = M.project.items.find((i) => (i.label || i.defName) === k);
      return it && it.id;
    };
    for (const e of r.errors) box.append(problemLine('modErr', '✗', e, idFor(e)));
    for (const w of r.warnings) box.append(problemLine('modWarn', '!', w.item + ': ' + w.message, w.id));
    const ns = nonSquareSprites(r);
    if (ns.length) {
      const off = (M.project.meta.spriteSize || 'square') === 'off';
      box.append(
        el('div', {
          className: 'small modWarn',
          textContent: off
            ? '! ' +
              ns.length +
              ' sprite(s) are not square (e.g. ' +
              ns[0] +
              '). RimWorld stretches those. Change "Sprite shape" to fit them onto a square.'
            : 'i ' +
              ns.length +
              ' sprite(s) are not square (e.g. ' +
              ns[0] +
              '). They will be fitted onto a transparent square when you export, without stretching.',
        }),
      );
    }
    const texts = r.files.filter((f) => f.text);
    if (!M.previewPath || !texts.some((f) => f.path === M.previewPath)) M.previewPath = texts.length ? texts[texts.length > 1 ? 1 : 0].path : null;
    const list = el('select');
    list.style.width = '100%';
    for (const f of r.files)
      list.append(
        Object.assign(el('option', { value: f.path, textContent: (f.sprite ? '🖼 ' : f.base64 ? '🔊 ' : '') + f.path }), {
          selected: f.path === M.previewPath,
        }),
      );
    list.addEventListener('change', () => {
      M.previewPath = list.value;
      showPreview();
    });
    box.append(
      el('div', { className: 'small muted', textContent: r.files.length + ' files in folder "' + r.folder + '"' }),
      list,
      el('pre', { id: 'modPre' }),
    );
    const copy = async () => {
      const f = r.files.find((x) => x.path === M.previewPath);
      if (!f || !f.text) return;
      try {
        await navigator.clipboard.writeText(f.text);
        toast('Copied.');
      } catch {
        toast('Copy not allowed here.');
      }
    };
    box.append(el('div', { className: 'btnrow' }, btn2('Copy this XML', copy)));
    showPreview();
  }

  // ---- left: mod settings + item list ---------------------------------------------------------------------------------------
  const SPRITE_SHAPES = [
    ['square', 'Fit onto a square (keep size)'],
    ['64', 'Square, 64 × 64'],
    ['128', 'Square, 128 × 128 (vanilla size)'],
    ['256', 'Square, 256 × 256'],
    ['off', 'Leave as is (may stretch in game)'],
  ];
  function renderMeta() {
    const box = $m('modMeta'),
      m = M.project.meta;
    box.textContent = '';
    const field = (label, key, area) => {
      const i = area ? el('textarea', { rows: 2 }) : el('input', { type: 'text' });
      i.value = m[key] || '';
      i.style.flex = '1';
      i.dataset.k = key;
      i.addEventListener('input', () => {
        m[key] = i.value;
        if (key === 'packageId') M.packageEdited = true;
        if ((key === 'name' || key === 'author') && !M.packageEdited) {
          // suggest a packageId until the user types their own
          m.packageId = (GEN.pascal(m.author) || 'me').toLowerCase() + '.' + (GEN.pascal(m.name) || 'mod').toLowerCase();
          const p = box.querySelector('[data-k=packageId]');
          if (p) p.value = m.packageId;
        }
        changed(false);
      });
      return el('div', { className: 'row' }, el('label', { textContent: label }), i);
    };
    const sz = el('select');
    sz.title = 'RimWorld draws every sprite onto a square, so a rectangular image gets stretched in game.';
    for (const [v, t] of SPRITE_SHAPES)
      sz.append(Object.assign(el('option', { value: v, textContent: t }), { selected: (m.spriteSize || 'square') === v }));
    sz.addEventListener('change', () => {
      m.spriteSize = sz.value;
      changed(false);
    });
    const szRow = el('div', { className: 'row' }, el('label', { textContent: 'Sprite shape' }), sz);
    szRow.style.flexWrap = 'nowrap';
    box.append(
      field('Mod name', 'name'),
      field('Author', 'author'),
      field('packageId', 'packageId'),
      field('Game versions', 'versions'),
      field('defName prefix', 'prefix'),
      field('Description', 'description', true),
      szRow,
    );
  }
  // ---- the "+ Add" menu: every kind of item, grouped, with a search box ------------------------------------------------------
  const ADD_GROUPS = [
    ['Gear', [['apparel', 'Clothes, armour, hats'], ['weapon', 'Melee or ranged weapons'], ['projectile', 'Bullets and shots for weapons'], ['implant', 'Bionic parts and implants']]],
    ['Things and buildings', [['item', 'Resources, ore, food, meals, drugs'], ['building', 'Walls, furniture, workbenches, turrets...'], ['floor', 'Floors and natural ground'], ['plant', 'Crops, bushes, trees']]],
    ['People and looks', [['hair', 'Hairstyles'], ['beard', 'Beards'], ['head', 'Head shapes'], ['body', 'Body shapes'], ['gene', 'Genes (Biotech)'], ['xenotype', 'A named group of genes'], ['trait', 'Personality traits'], ['thought', 'Mood effects']]],
    ['Abilities and conditions', [['ability', 'Powers pawns can use'], ['hediff', 'Conditions on a pawn']]],
    ['Creatures', [['animal', 'Tameable or wild animals'], ['mech', 'Mechanoids (Biotech)']]],
    ['World and events', [['biome', 'Biomes and the world map'], ['incident', 'Random events: weather, disease']]],
    ['Crafting and research', [['research', 'Research projects'], ['recipe', 'Recipes and bills']]],
    ['Your own XML', [['xmlfile', 'Hand-written Defs or patches, or changes to vanilla things']]],
  ];
  const ITEM_GROUP = {};
  for (const [g, list] of ADD_GROUPS) for (const [t] of list) ITEM_GROUP[t] = g;
  function buildAddMenu() {
    const host = $m('modAdd');
    host.textContent = '';
    const toggle = btn2('+ Add item…', () => open(menu.hidden));
    toggle.id = 'modAddBtn';
    const menu = el('div', { id: 'modAddMenu', hidden: true });
    const search = el('input', { type: 'search', placeholder: 'Search kinds (animal, recipe, trait...)' });
    const body = el('div');
    menu.append(search, body);
    host.append(toggle, menu);
    const draw = () => {
      body.textContent = '';
      const q = search.value.trim().toLowerCase();
      for (const [g, list] of ADD_GROUPS) {
        const rows = list.filter(([t, d]) => !q || (SC.TYPE_LABELS[t] + ' ' + d + ' ' + g).toLowerCase().includes(q));
        if (!rows.length) continue;
        body.append(el('h4', { textContent: g }));
        for (const [t, d] of rows) {
          const b = el('button', { className: 'opt', textContent: '+ ' + SC.TYPE_LABELS[t] }, el('small', { textContent: d }));
          b.addEventListener('click', () => {
            open(false);
            addItem(t);
          });
          body.append(b);
        }
      }
    };
    function open(on) {
      menu.hidden = !on;
      if (on) {
        search.value = '';
        draw();
        search.focus();
      }
    }
    search.addEventListener('input', draw);
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') open(false);
      if (e.key === 'Enter') {
        const first = body.querySelector('button.opt');
        if (first) first.click();
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (!menu.hidden && !host.contains(e.target)) open(false);
    });
  }

  const closedGroups = new Set();
  function renderItems() {
    const box = $m('modItems');
    box.textContent = '';
    if (!M.project.items.length)
      box.append(
        el('div', { className: 'muted small', textContent: 'No items yet. Use + Add item above, or use "Send to mod builder" on a layer in the viewer.' }),
      );
    const filter = $m('modFilter');
    filter.hidden = M.project.items.length < 8;
    const q = filter.hidden ? '' : filter.value.trim().toLowerCase();
    const byGroup = new Map();
    for (const it of M.project.items) {
      const name = (it.label || it.defName || '').toLowerCase();
      if (q && !(name + ' ' + (SC.TYPE_LABELS[it.type] || '').toLowerCase()).includes(q)) continue;
      const g = ITEM_GROUP[it.type] || 'Other';
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(it);
    }
    const grouped = M.project.items.length >= 8;
    const order = [...ADD_GROUPS.map(([g]) => g), 'Other'];
    for (const g of order) {
      const list = byGroup.get(g);
      if (!list) continue;
      const shut = grouped && closedGroups.has(g) && !q;
      if (grouped) {
        const h = el('div', { className: 'itemgrp' }, el('span', { textContent: (shut ? '▸ ' : '▾ ') + g }), el('span', { className: 'n', textContent: String(list.length) }));
        h.addEventListener('click', () => {
          closedGroups.has(g) ? closedGroups.delete(g) : closedGroups.add(g);
          renderItems();
        });
        box.append(h);
      }
      if (shut) continue;
      for (const it of list) {
        const d = el(
          'div',
          { className: 'layer' + (it.id === M.selId ? ' sel' : '') },
          el('span', { className: 'nm', textContent: it.label || it.defName || '(unnamed)' }),
          el('span', { className: 'kd', textContent: SC.TYPE_LABELS[it.type] }),
        );
        d.addEventListener('click', () => selectItem(it.id));
        const x = el('button', { className: 'itemx', textContent: '✕', title: 'Delete this item (Undo brings it back)' });
        x.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteItem(it);
        });
        d.append(x);
        box.append(d);
      }
    }
    if (q && !byGroup.size) box.append(el('div', { className: 'muted small', textContent: 'No item matches "' + q + '".' }));
  }
  function deleteItem(it) {
    if (!confirm('Delete "' + (it.label || it.defName || 'this item') + '" from the mod? You can bring it back with Undo.')) return;
    const i = M.project.items.indexOf(it);
    M.project.items = M.project.items.filter((q) => q !== it);
    if (M.selId === it.id) M.selId = (M.project.items[Math.min(i, M.project.items.length - 1)] || {}).id || null;
    changed(true);
  }
  function addItem(type, init) {
    const it = Object.assign(SC.newItem(type), init || {});
    M.project.items.push(it);
    M.selId = it.id;
    changed(true);
    return it;
  }

  // ---- center: the form of the selected item ---------------------------------------------------------------------------------
  const SECTIONS = [
    ['Basics', 'The name and description players will see.'],
    ['Look', 'Sprites and how it is worn or held.'],
    ['In the game', 'Size, walking behaviour and where it appears in the build menu.'],
    ['Item properties', 'Numbers belonging to the item itself.'],
    ['When it happens', 'Chance, timing, letter and where.'],
    ['What it does', 'Its effects, and who it applies to.'],
    ['Mechanoid', 'Body, work, weapons and numbers.'],
    ['Gestation', 'How a mechanitor makes it.'],
    ['Recipe details', 'What goes in, what comes out, and where it is made.'],
    ['Research', 'Cost, prerequisites, bench and where it sits on the research screen.'],
    ['Eating and effects', 'What it feeds, how it is eaten, how fast it rots, and the high a drug gives.'],
    ['Bonuses to the wearer', 'Effects on the person using it.'],
    ['Recipe', 'Where and how it is crafted.'],
    ['Materials', 'What it is made from.'],
    ['On the world map', 'The world picture, and how the biome is placed and travelled.'],
    ['Wildlife', 'Wild plants and animals, with rules for groups of them.'],
    ['Ground', 'Floors by fertility and patches of other ground.'],
    ['Climate', 'Weather, diseases and ambient sounds.'],
    ['As a material or ore', 'Use it as a building / weapon / apparel material, or find it underground.'],
    ['How it hits', 'Damage, speed, explosion and effects.'],
    ['Natural rock', 'Mountain rock: what it gives when mined.'],
    ['Growing', 'Where and how fast it grows, and what it gives.'],
    ['Gene effects', 'Costs, tags and what the gene changes.'],
    ['How it is used', 'Targeting, range, timing and costs.'],
    ['What it does', 'Effects, added one by one.'],
    ['Surgery', 'Where it is installed and how.'],
    ['Making the item', 'Ingredients, bench and research for the item itself.'],
    ['Body and food', 'Body shape, size, stats and diet.'],
    ['Life', 'Training, breeding and lifespan.'],
    ['Fighting', 'Attacks and body parts.'],
    ['Products and wild life', 'What it gives, where it lives, who sells it.'],
    ['Your own XML', 'Optional, for advanced users.'],
  ];
  // which section a field goes in (first matching rule wins; fields nobody claims belong to the recipe)
  const SECTION_RULES = [
    [(k) => /^(label|defName|description|mode|techLevel|tags|preset)$/.test(k), 'Basics'],
    [(k) => k === 'extraXml', 'Your own XML'],
    [(k, it) => it.type === 'animal' && /^(sprites\.(main|female|baby|juvenile|dessicated)|drawSize|color|soundsLike|maleLabel|femaleLabel|babyLabel|juvenileLabel)/.test(k), 'Look'],
    [(k, it) => it.type === 'animal' && /^(trainability|petness|nuzzleMtb|lifeExpectancy|gestationDays|litterMax|juvenileAge|adultAge|herdAnimal|packAnimal)$/.test(k), 'Life'],
    [(k, it) => it.type === 'animal' && /^(tools|predator|maxPreyBodySize)$/.test(k), 'Fighting'],
    [(k, it) => it.type === 'animal' && /^(produce|produceThing|produceAmount|produceDays|sprites\.egg|eggHatchDays|eggFertilizedMax|combatPower|ecoWeight|wildGroup|tradeTags)$/.test(k), 'Products and wild life'],
    [(k, it) => it.type === 'animal' && k !== 'preset', 'Body and food'],
    [(k, it) => it.type === 'xmlfile', 'Your own XML'],
    [(k) => k === 'sprites.unfinished', 'Recipe'],
    [(k, it) => it.type === 'biome' && /^(workerClass|movementDifficulty|settlementWeight|allowFarmingCamps)$/.test(k), 'On the world map'],
    [
      (k, it) =>
        it.type === 'biome' &&
        /^(animalDensity|plantDensity|wildPlantRegrowDays|forageability|foragedFood|wildPlants|wildAnimals|packAnimals)$/.test(k),
      'Wildlife',
    ],
    [(k, it) => it.type === 'biome' && /^(terrains|patches|previewSeed)$/.test(k), 'Ground'],
    [(k, it) => it.type === 'biome' && /^(weather|diseaseMtbDays|diseases|ambient)$/.test(k), 'Climate'],
    [(k, it) => it.type === 'building' && /^(natural|rockKind|color|mineableThing|dropChance|mineableYield|veinCommonality|veinSize)$/.test(k), 'Natural rock'],
    [(k, it) => it.type === 'gene' && /^(sprites\.|colorType|colorValue|shape|meshSize|layer|offset)/.test(k), 'Look'],
    [(k, it) => it.type === 'implant' && /^(sprites\.main|colorType|meshSize|layer|offset)/.test(k), 'Look'],
    [(k, it) => it.type === 'implant' && /^(drawOnPawn)$/.test(k), 'Look'],
    [(k, it) => it.type === 'implant' && /^(races|bodyParts|medicineSkill|surgeryWork)$/.test(k), 'Surgery'],
    [(k, it) => it.type === 'implant' && /^(cost|workbenches|research|craftSkill|stats)$/.test(k), 'Making the item'],
    [(k, it) => it.type === 'implant' && k !== 'preset', 'What it does'],
    [(k, it) => it.type === 'hediff', 'What it does'],
    [(k, it) => it.type === 'ability' && /^(eff|hediffSelf)/.test(k), 'What it does'],
    [(k, it) => it.type === 'ability' && !/^sprites/.test(k), 'How it is used'],
    [(k, it) => it.type === 'gene' && k !== 'preset', 'Gene effects'],
    [(k, it) => it.type === 'plant' && /^(stats|customStats)$/.test(k), 'Item properties'],
    [(k, it) => it.type === 'plant' && k !== 'preset' && !/^(sprites)/.test(k), 'Growing'],
    [(k, it) => it.type === 'floor' && /^(color|edgeType|renderPrecedence|pathCost|fertility|affordances|affordanceNeeded)$/.test(k), 'In the game'],
    [(k, it) => it.type === 'floor' && /^(stats|customStats)$/.test(k), 'Item properties'],
    [(k, it) => it.type === 'floor' && /^(designation|cost|research)$/.test(k), 'Materials'],
    [(k, it) => it.type === 'item' && /^(isStuff|stuff|deposit)/.test(k), 'As a material or ore'],
    [(k, it) => it.type === 'incident' && /^(letter|baseChance|minRefireDays|earliestDay|allowedBiomes|disallowedBiomes)/.test(k), 'When it happens'],
    [(k, it) => (it.type === 'trait' || it.type === 'thought' || it.type === 'incident') && k !== 'preset', 'What it does'],
    [(k, it) => it.type === 'mech' && /^(gestate|gest|gestWork|gestDays|gestCycles|gestResearch)$/.test(k), 'Gestation'],
    [(k, it) => it.type === 'mech' && /^(sprites\.|drawSize|soundsLike)/.test(k), 'Look'],
    [(k, it) => it.type === 'mech' && k !== 'preset', 'Mechanoid'],
    [(k, it) => it.type === 'research', 'Research'],
    [(k, it) => it.type === 'recipe', 'Recipe details'],
    [(k, it) => it.type === 'item' && /^(foodType|preferability|ingestSound|ingestEffect|tasteThought|joy|joyKind|rotDays|drugCategory|high|addict|minTolerance|tolerance|withdraw)/.test(k), 'Eating and effects'],
    [(k, it) => it.type === 'item' && /^(stackLimit|thingCategories|soundDrop|tradeability)$/.test(k), 'In the game'],
    [(k, it) => it.type === 'item' && /^(smelt)/.test(k), 'Item properties'],
    [(k, it) => it.type === 'projectile' && !/^(label|defName|description|sprites\.|drawW|drawH|glow)/.test(k), 'How it hits'],
    [
      (k, it) =>
        /^(passability|pathCost|fillPercent|surface|sittable|designation|sizeX|sizeZ)$/.test(k) || (k === 'research' && it.type === 'building'),
      'In the game',
    ],
    [
      (k) =>
        /^(sprites\.|drawSize|drawW|drawH|rotatable|wornAs|covers|bodyTypes|shellBehindHead|styleGender|gender|narrow|eyeOffsetX|headOffset|angleOffset)/.test(
          k,
        ),
      'Look',
    ],
    [(k) => /^(stats|customStats|projectile|sound|range|warmup|burst|burstTicks|tools|meleeExtra|meleeHediff)/.test(k), 'Item properties'],
    [(k) => k === 'equipOffsets', 'Bonuses to the wearer'],
    [(k) => /^(useStuff|stuffCategories|stuffCount|cost)$/.test(k), 'Materials'],
  ];
  const sectionOf = (k, it) => {
    const r = SECTION_RULES.find(([test]) => test(k, it));
    return r ? r[1] : 'Recipe';
  };

  // which sections the user folded (remembered between sessions)
  const SECS_KEY = 'rsv-closedsections';
  const closedSections = () => {
    try {
      return new Set(JSON.parse(MB.lsGet(SECS_KEY) || '[]'));
    } catch {
      return new Set();
    }
  };

  function fieldRow(it, f) {
    const help = typeof f.help === 'function' ? f.help(it) : f.help;
    const row = el(
      'div',
      { className: 'mrow' },
      el(
        'div',
        { className: 'mhead' },
        el('label', { textContent: f.label }),
        ...(help ? [el('button', { className: 'info', textContent: 'i', title: 'Explain' })] : []),
      ),
    );
    if (help) row.querySelector('.info').dataset.tip = help;
    row.append(MB.control(it, f));
    return row;
  }
  function duplicateItem(it) {
    const c = JSON.parse(JSON.stringify(it));
    c.id = SC.newItem(it.type).id;
    c.defName = '';
    c.label = String(c.label || '').replace(/( copy)+$/, '') + ' copy';
    M.project.items.push(c);
    M.selId = c.id;
    changed(true);
  }
  function renderForm() {
    const box = $m('modForm'),
      it = sel();
    box.textContent = '';
    if (!it) {
      box.append(el('div', { className: 'muted', textContent: 'Select or add an item.' }));
      return;
    }
    box.append(el('h2', { textContent: SC.TYPE_LABELS[it.type] + ': ' + (it.label || it.defName || 'new') }));
    const fold = (all) => {
      const now = all ? new Set(SECTIONS.map(([n]) => n).filter((n) => n !== 'Basics')) : new Set();
      MB.lsSet(SECS_KEY, JSON.stringify([...now]));
      renderForm();
    };
    const fa = el('a', { textContent: 'Fold all sections' }),
      ua = el('a', { textContent: 'Unfold all' });
    fa.addEventListener('click', () => fold(true));
    ua.addEventListener('click', () => fold(false));
    box.append(el('div', { className: 'foldbar' }, fa, ua));
    const closed = closedSections();
    const secs = new Map(
      SECTIONS.map(([n, h]) => {
        const head = el('h3', { textContent: n, title: 'Click to fold or unfold this section' });
        const sec = el(
          'div',
          { className: 'msec' + (closed.has(n) ? ' closed' : '') },
          head,
          el('div', { className: 'small muted', textContent: h }),
        );
        head.addEventListener('click', () => {
          sec.classList.toggle('closed');
          const now = closedSections();
          sec.classList.contains('closed') ? now.add(n) : now.delete(n);
          MB.lsSet(SECS_KEY, JSON.stringify([...now]));
        });
        return [n, sec];
      }),
    );
    const used = new Set();
    for (const f of SC.fieldsFor(it.type)) {
      if (f.show && !f.show(it)) continue;
      if (f.hideRock && it.natural) continue;
      const n = sectionOf(f.k, it);
      used.add(n);
      secs.get(n).append(fieldRow(it, f));
    }
    for (const [n] of SECTIONS) if (used.has(n)) box.append(secs.get(n));
    box.append(
      el(
        'div',
        { className: 'btnrow' },
        btn2('Duplicate', () => duplicateItem(it)),
        btn2(
          'Delete item',
          () => deleteItem(it),
          'danger',
        ),
      ),
    );
  }

  // ---- layer -> mod item (the button in the viewer) --------------------------------------------------------------------------------------
  const LAYER_TO_WORN = { OnSkin: 'torso-skin', Middle: 'torso-middle', Shell: 'torso-shell', Belt: 'belt' };
  const KIND_TO_TYPE = { apparel: 'apparel', weapon: 'weapon', hair: 'hair', beard: 'beard', head: 'head', body: 'body' };
  function fromLayer(l) {
    const type = KIND_TO_TYPE[l.kind];
    if (!type) {
      toast('Layers of type "' + l.kind + '" can\'t become a mod item yet (genes come later).');
      return;
    }
    const it = SC.newItem(type);
    it.label = l.name.replace(/[_]+/g, ' ').trim();
    const s = MB.bakeFit(MB.spriteFromLayer(l, type === 'weapon' ? 'single' : 'facings'), l);
    if (type === 'weapon') {
      it.sprites.main = s;
      it.drawSize = l.drawSize;
    } else if (type === 'apparel') {
      it.sprites.worn = s;
      it.sprites.icon = MB.spriteFromLayer(l, 'single');
      const e = S.game && l.srcBase ? S.game.entries.find((x) => x.base === l.srcBase) : null;
      if (e && e.icon) it.sprites.icon = { single: { kind: 'game', pack: e.pack, rel: e.icon } }; // the game's own thumbnail
      if (e && e.variants) {
        // keep each body type's own art
        it.sprites.wornBy = {};
        for (const vn of e.variantNames) {
          const refs = Object.fromEntries(Object.entries(e.variants[vn]).map(([k, rel]) => [k, { kind: 'game', pack: e.pack, rel }]));
          it.sprites.wornBy[vn] = MB.bakeFit(MB.spriteFromLayer({ images: normalizeImages(refs) }, 'facings'), l);
        }
      }
      it.wornAs =
        l.slot === 'headgear' ? (l.hidesHair ? 'headgear-full' : 'headgear-upper') : LAYER_TO_WORN[l.apparelLayer || 'Middle'] || 'torso-shell';
      if (it.wornAs === 'torso-shell' && !l.apparelLayer) it.wornAs = 'torso-middle';
    } else {
      it.sprites.main = s;
      if (type === 'body') it.headOffset = [...S.headOffset];
    }
    M.project.items.push(it);
    M.selId = it.id;
    persist();
    show(true);
    toast('Added to the mod builder.');
  }

  // ---- export ---------------------------------------------------------------------------------------------------------------------------------
  async function exportMod() {
    refreshOutput();
    const r = M.result;
    if (r.errors.length) {
      toast('Fix the listed problems first.');
      return;
    }
    if (!M.project.items.length) {
      toast('Add at least one item.');
      return;
    }
    const cache = new Map(),
      out = [],
      bad = [];
    for (const f of r.files) {
      if (f.text !== undefined) {
        out.push({ path: f.path, text: f.text });
        continue;
      }
      if (f.base64) {
        out.push({ path: f.path, base64: f.base64 });
        continue;
      }
      const b = await MB.refToBase64(f.sprite, cache, f.keep);
      if (b) out.push({ path: f.path, base64: b });
      else bad.push(f.path);
    }
    if (bad.length) {
      toast('Could not read ' + bad.length + ' sprite(s), e.g. ' + bad[0] + '. Export cancelled.', 9000);
      return;
    }
    const res = await window.api.exportMod({ folder: r.folder, files: out });
    if (res)
      toast(
        (res.existed ? 'Updated ' : 'Created ') + res.count + ' files in ' + res.path + '. Copy this folder into RimWorld/Mods to try it.',
        12000,
      );
  }

  // ---- project buttons: save / open / new ---------------------------------------------------------------------------------------------
  async function saveProject() {
    const json = JSON.stringify(M.project);
    const p = await window.api.saveFile({
      defaultName: GEN.slug(M.project.meta.name) + '.rsvmod.json',
      filters: [{ name: 'Mod project', extensions: ['json'] }],
      text: JSON.stringify(M.project, null, 2),
    });
    if (p) {
      M.savedJson = json;
      lsSet(SAVEDKEY, json);
    }
  }
  async function openProject() {
    if (dirty() && !confirm('The current mod project has changes you have not saved. Open another one anyway?')) return;
    const t = await window.api.openJson();
    if (!t) return;
    try {
      const p = JSON.parse(t);
      if (!p.meta || !Array.isArray(p.items)) throw new Error('not a mod project file');
      M.project = p;
      M.selId = null;
      M.packageEdited = true;
      persist();
      markSaved();
      MB.resetHistory();
      refreshAll();
    } catch (e) {
      toast('Could not open: ' + e.message);
    }
  }
  function newProject() {
    if (dirty() && !confirm('The current mod project has changes you have not saved. Start a new, empty one anyway?')) return;
    M.project = SC.newProject();
    M.selId = null;
    M.packageEdited = false;
    persist();
    markSaved();
    MB.resetHistory();
    refreshAll();
  }

  function init() {
    const syncUndo = () => {
      $m('btnModUndo').disabled = !MB.canUndo();
      $m('btnModRedo').disabled = !MB.canRedo();
    };
    Object.assign(hooks, { renderItems, renderForm, refreshOutput, historyChanged: syncUndo });
    MB.selectItem = selectItem;
    load();
    MB.resetHistory();
    syncUndo();
    $m('btnModUndo').addEventListener('click', () => MB.undo());
    $m('btnModRedo').addEventListener('click', () => MB.redo());
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || $m('modGrid').getClientRects().length === 0) return;
      const t = e.target,
        typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing && !t.readOnly && t.type !== 'search') return; // let text fields keep their own undo
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) (e.preventDefault(), MB.undo());
      else if (k === 'y' || (k === 'z' && e.shiftKey)) (e.preventDefault(), MB.redo());
    });
    $m('btnModOpen').addEventListener('click', () => show(true));
    $m('btnModBack').addEventListener('click', () => show(false));
    buildAddMenu();
    $m('modFilter').addEventListener('input', renderItems);
    $m('btnModExport').addEventListener('click', exportMod);
    $m('btnModSave').addEventListener('click', saveProject);
    $m('btnModLoad').addEventListener('click', openProject);
    $m('btnModNew').addEventListener('click', newProject);
  }
  window.ModBuilder = { fromLayer, show, M, dirty };
  init();
})();
