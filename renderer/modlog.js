'use strict';
// Mod builder: the "Game log" tab. Reads RimWorld's Player.log (via the main process) and explains the errors about this mod.
// Analysis itself lives in loganalyzer.js (pure, tested without the app).
(function () {
  const MB = window.MB;
  if (!MB || !window.LogAnalyzer) return;
  const { SC, GEN, M, el, btn2 } = MB;
  const $m = (id) => document.getElementById(id);
  const LA = window.LogAnalyzer;
  let last = null; // last analysis result

  function ago(ms) {
    const d = Math.max(0, Date.now() - ms) / 1000;
    if (d < 90) return 'a moment ago';
    if (d < 5400) return Math.round(d / 60) + ' minutes ago';
    if (d < 129600) return Math.round(d / 3600) + ' hours ago';
    return Math.round(d / 86400) + ' days ago';
  }
  function knownIds() {
    const E = SC.CATALOG.entries || {};
    const out = new Set(Object.keys(SC.CATALOG.defData || {}));
    for (const lk of ['materials', 'hediffs', 'research', 'traits', 'genes', 'workbenches']) for (const e of E[lk] || []) out.add(e.id);
    return [...out];
  }
  function analyzeText(text) {
    const r = GEN.generate(M.project);
    const m = M.project.meta || {};
    const names = [m.name, GEN.slug(m.name), m.packageId].filter(Boolean);
    return LA.analyze(text, { owners: r.owners, texOwners: r.texOwners, fileOwners: r.fileOwners, modNames: names, knownIds: knownIds() });
  }
  function render(box, res, info) {
    const out = box.querySelector('.logout');
    out.textContent = '';
    const s = res.stats;
    const errors = res.findings.filter((f) => f.severity === 'error').length;
    out.append(
      el('div', { className: 'small', textContent: `${info ? info + ' — ' : ''}${s.entries} messages read: ${s.mine} about your mod, ${s.other} about the base game or other mods.` }),
    );
    if (res.modSeen === false)
      out.append(el('div', { className: 'small modWarn', textContent: '! I could not find your mod\'s name in this log. Is the mod enabled in the game, and is this the log of the game session where you tested it?' }));
    if (!res.findings.length) {
      out.append(
        el('div', { className: 'small', style: 'color:var(--accent);margin:6px 0', textContent: s.entries ? '✓ No errors about your mod in this log.' : 'The log is empty.' }),
      );
    } else out.append(el('div', { className: 'small', style: 'margin:6px 0;color:' + (errors ? 'var(--danger)' : '#c90'), textContent: `${res.findings.length} thing(s) to look at${errors ? ` (${errors} error${errors > 1 ? 's' : ''})` : ''}:` }));
    for (const f of res.findings) {
      const card = el('div', { className: 'logcard ' + f.severity });
      card.append(el('div', { className: 't', textContent: (f.severity === 'error' ? '✗ ' : '! ') + f.title + (f.count > 1 ? `  ×${f.count}` : '') }));
      if (f.owner) {
        const a = el('span', { className: 'small item', textContent: `→ ${f.owner.label} (${SC.TYPE_LABELS[f.owner.type] || f.owner.type}): open it` });
        a.addEventListener('click', () => MB.selectItem && MB.selectItem(f.owner.id));
        card.append(a);
      }
      card.append(el('div', { className: 'small', textContent: f.plain }), el('div', { className: 'small fix', textContent: 'What to do: ' + f.fix }));
      const d = el('details', {}, el('summary', { className: 'small muted', textContent: 'Original message' }), el('pre', { textContent: f.raw }));
      card.append(d);
      out.append(card);
    }
    if (res.others.length) {
      const d = el('details', {}, el('summary', { className: 'small muted', textContent: `${s.other} message(s) not about your mod (base game or other mods)` }));
      for (const o of res.others.slice(0, 40)) d.append(el('div', { className: 'small muted', textContent: `${o.count}× ${o.title}` }));
      out.append(d);
    }
    if (res.findings.length) {
      out.append(
        el(
          'div',
          { className: 'btnrow' },
          btn2('Copy report for Claude', async () => {
            try {
              await navigator.clipboard.writeText(LA.toText(res, (M.project.meta || {}).name));
              toast('Copied. Paste it in the chat with Claude.');
            } catch {
              toast('Copy not allowed here.');
            }
          }),
        ),
      );
    }
  }
  async function runWith(box, text, info) {
    last = analyzeText(text);
    render(box, last, info);
  }
  async function readFile(box, f) {
    try {
      const r = await window.api.readLog(f.path);
      await runWith(box, r.text, `${f.name}, written ${ago(f.mtime)}${r.truncated ? ' (only the end of a very big log was read)' : ''}`);
    } catch (e) {
      box.querySelector('.logout').textContent = 'Could not read the log: ' + e.message;
    }
  }
  function build() {
    const box = $m('modLog');
    box.textContent = '';
    box.append(
      el('div', { className: 'small muted', textContent: 'Test the mod in RimWorld first: enable it, start the game and load or start a colony. Then come back here and read the log: I explain what the game complained about.' }),
    );
    const row = el('div', { className: 'btnrow' });
    const logs = el('div', { className: 'small' });
    const out = el('div', { className: 'logout' });
    row.append(
      btn2('Find the game log', async () => {
        logs.textContent = 'Looking…';
        let found = [];
        try {
          found = await window.api.findLogs();
        } catch {
          found = [];
        }
        logs.textContent = '';
        if (!found.length) {
          logs.textContent = 'No log found in the usual places. Use "Choose a file…" (it is called Player.log) or paste the text below.';
          return;
        }
        for (const f of found.slice(0, 4)) {
          const a = el('div', { className: 'small link', textContent: `${f.name}, ${ago(f.mtime)} (${Math.round(f.size / 1024)} KB) — click to read` });
          a.addEventListener('click', () => readFile(box, f));
          logs.append(a);
        }
        readFile(box, found[0]);
      }),
      btn2('Choose a file…', async () => {
        const f = await window.api.pickLog();
        if (f) readFile(box, f);
      }),
    );
    const ta = el('textarea', { rows: 4, placeholder: 'Or paste the log text here…' });
    ta.style.width = '100%';
    const go = btn2('Check pasted text', () => ta.value.trim() && runWith(box, ta.value, 'pasted text'));
    box.append(row, logs, el('details', {}, el('summary', { className: 'small muted', textContent: 'Paste log text instead' }), ta, go), out);
  }
  function init() {
    const tabs = $m('modTabs');
    if (!tabs) return;
    build();
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]');
      if (!b) return;
      for (const x of tabs.querySelectorAll('button')) x.classList.toggle('on', x === b);
      $m('modOut').hidden = b.dataset.tab !== 'check';
      $m('modLog').hidden = b.dataset.tab !== 'log';
    });
  }
  init();
  window.ModLog = { analyzeText };
})();
