'use strict';
// Searchable, scrollable pick list with a permanent "your own ID" entry. Used by the mod builder for every list
// (stats, workbenches, materials, research, projectiles, sounds, tags...). No game knowledge in here.
(function () {
  const el = (tag, props, ...kids) => {
    const e = Object.assign(document.createElement(tag), props || {});
    for (const k of kids) if (k != null) e.append(k);
    return e;
  };
  const ID_RE = /^[A-Za-z0-9_]+$/;

  // o = { title, entries: () => [{id,label,group,v,custom,scope}], multi, selected: [ids] | id, store, lk, onDone(ids|id), notify }
  function open(o) {
    const sel = new Set(o.multi ? o.selected || [] : []);
    let q = '',
      editing = null;
    const ov = el('div', { className: 'pickov' }),
      box = el('div', { className: 'pick' });
    ov.append(box);
    const close = () => ov.remove();
    ov.addEventListener('mousedown', (ev) => {
      if (ev.target === ov) close();
    });
    const search = el('input', { type: 'text', placeholder: 'Search by name or ID…', className: 'picksearch' });
    const list = el('div', { className: 'picklist' });
    const add = el('div', { className: 'pickadd' });
    const head = el(
      'div',
      { className: 'pickhead' },
      el('b', { textContent: o.title || 'Choose' }),
      el('button', { textContent: '×', className: 'pickx', onclick: close }),
    );
    box.append(head, search, list, add);
    if (o.multi)
      box.append(
        el(
          'div',
          { className: 'btnrow' },
          el('button', {
            textContent: 'Done',
            onclick: () => {
              o.onDone([...sel]);
              close();
            },
          }),
        ),
      );

    const finishSingle = (id) => {
      o.onDone(id);
      close();
    };
    function addCustom(id, label, scope) {
      id = String(id || '').trim();
      label = String(label || '').trim();
      if (!ID_RE.test(id)) {
        (o.notify || (() => {}))('An ID can only contain letters, digits and underscores (no spaces).');
        return false;
      }
      if (o.entries().some((e) => e.id === id)) {
        (o.notify || (() => {}))('That ID is already in the list.');
        return false;
      }
      o.store.add(o.lk, { id, label: label || id }, scope);
      return true;
    }

    function row(e) {
      if (editing === e.id + '|' + e.scope) {
        const i = el('input', { type: 'text', value: e.id, size: 16 }),
          n = el('input', { type: 'text', value: e.label, size: 16 });
        return el(
          'div',
          { className: 'pickrow editing' },
          i,
          n,
          el('button', {
            textContent: 'Save',
            onclick: () => {
              if (!ID_RE.test(i.value.trim())) {
                (o.notify || (() => {}))('Invalid ID.');
                return;
              }
              o.store.update(o.lk, e.id, e.scope, { id: i.value.trim(), label: n.value.trim() || i.value.trim() });
              editing = null;
              render();
            },
          }),
          el('button', {
            textContent: 'Cancel',
            onclick: () => {
              editing = null;
              render();
            },
          }),
        );
      }
      const r = el('div', { className: 'pickrow' });
      if (o.multi) r.append(el('input', { type: 'checkbox', checked: sel.has(e.id) }));
      r.append(el('span', { className: 'pl', textContent: e.label }));
      if (e.id !== e.label) r.append(el('span', { className: 'pid', textContent: e.id }));
      if (e.kind) r.append(el('span', { className: 'pkind ' + e.kind, textContent: e.kind === 'item' ? 'item' : 'wearer' }));
      if (!e.v && !e.custom) r.append(el('span', { className: 'punv', textContent: '?', title: 'Name not verified in the 1.7 game files' }));
      if (e.custom) {
        r.append(
          el('span', { className: 'pscope', textContent: e.scope === 'app' ? 'all projects' : 'this project' }),
          el('button', {
            textContent: '✎',
            title: 'Edit',
            className: 'pmini',
            onclick: (ev) => {
              ev.stopPropagation();
              editing = e.id + '|' + e.scope;
              render();
            },
          }),
          el('button', {
            textContent: '×',
            title: 'Remove from my list',
            className: 'pmini',
            onclick: (ev) => {
              ev.stopPropagation();
              o.store.remove(o.lk, e.id, e.scope);
              sel.delete(e.id);
              render();
            },
          }),
        );
      }
      r.addEventListener('click', (ev) => {
        if (ev.target.closest('button,input[type=text]')) return;
        if (o.multi) {
          sel.has(e.id) ? sel.delete(e.id) : sel.add(e.id);
          render();
        } else finishSingle(e.id);
      });
      return r;
    }

    function render() {
      list.textContent = '';
      const term = q.trim().toLowerCase();
      const all = o.entries().filter((e) => !term || e.label.toLowerCase().includes(term) || e.id.toLowerCase().includes(term));
      const groups = new Map();
      for (const e of all) {
        const g = e.custom ? 'Your own entries' : e.group || 'List';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(e);
      }
      const order = [...groups.keys()].sort((a, b) => (a === 'Your own entries') - (b === 'Your own entries'));
      for (const g of order) {
        list.append(el('div', { className: 'pickgroup', textContent: g }));
        for (const e of groups.get(g)) list.append(row(e));
      }
      if (!all.length) list.append(el('div', { className: 'muted small', textContent: 'Nothing matches.' }));
      const t = q.trim();
      if (t && ID_RE.test(t) && !o.entries().some((e) => e.id === t)) {
        list.append(
          el('div', {
            className: 'pickrow usecustom',
            textContent: `Use “${t}” as my own ID`,
            onclick: () => {
              if (addCustom(t, '', 'project')) {
                if (o.multi) {
                  sel.add(t);
                  q = '';
                  search.value = '';
                  render();
                } else finishSingle(t);
              }
            },
          }),
        );
      }
    }

    // always-present "my own entry" form
    const idI = el('input', { type: 'text', placeholder: 'ID (exact defName)', size: 18 }),
      nameI = el('input', { type: 'text', placeholder: 'Friendly name (optional)', size: 18 });
    const scopeS = el(
      'select',
      {},
      el('option', { value: 'project', textContent: 'Save in this project' }),
      el('option', { value: 'app', textContent: 'Save for all my projects' }),
    );
    add.append(
      el('div', { className: 'small muted', textContent: 'Not in the list? Add your own ID (for example from another mod):' }),
      el(
        'div',
        { className: 'row' },
        idI,
        nameI,
        scopeS,
        el('button', {
          textContent: 'Add',
          onclick: () => {
            if (addCustom(idI.value, nameI.value, scopeS.value)) {
              const id = idI.value.trim();
              idI.value = nameI.value = '';
              if (o.multi) sel.add(id);
              else {
                finishSingle(id);
                return;
              }
              render();
            }
          },
        }),
      ),
    );
    search.addEventListener('input', () => {
      q = search.value;
      render();
    });
    document.body.append(ov);
    render();
    search.focus();
  }
  window.Picker = { open, ID_RE };
})();
