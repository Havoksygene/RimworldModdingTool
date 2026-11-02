'use strict';
// RimWorld Sprite Viewer renderer: info bubbles and the unsaved-work check. Plain script; shares globals with the other renderer files (see index.html for the order).

// small "i" bubbles: click to read the explanation, click anywhere else (or Esc) to close
(function () {
  let tip = null;
  const close = () => {
    if (tip) {
      tip.remove();
      tip = null;
    }
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.info');
    if (!b) {
      close();
      return;
    }
    const same = tip && tip._for === b;
    close();
    if (same) return;
    const r = b.getBoundingClientRect();
    tip = document.createElement('div');
    tip.className = 'tip';
    tip.textContent = b.dataset.tip || '';
    tip._for = b;
    document.body.append(tip);
    tip.style.left = Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, r.left)) + 'px';
    tip.style.top = Math.min(innerHeight - tip.offsetHeight - 8, r.bottom + 6) + 'px';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();

// leaving with unsaved work: the app asks first (main.js shows the question)
window.rsvUnsaved = () => {
  const out = [];
  if (H.idx >= 0 && H.saved !== undefined && H.stack[H.idx] !== H.saved) out.push('pawn preview');
  if (window.ModBuilder && window.ModBuilder.dirty()) out.push('mod project');
  return out;
};
window.addEventListener('beforeunload', (e) => {
  const u = window.rsvUnsaved();
  if (u.length) {
    window.__unsavedWhat = u.join(' and ');
    e.preventDefault();
    e.returnValue = '';
  }
});
