'use strict';
// Shows an "Update available" button when a newer release exists on GitHub (checked once at start, silently).
(function () {
  if (!window.api || !window.api.checkUpdate) return;
  window.api
    .checkUpdate()
    .then((u) => {
      if (!u) return;
      for (const id of ['btnUpdate', 'btnUpdate2']) {
        const b = document.getElementById(id);
        if (!b) continue;
        b.textContent = 'Update available: v' + u.version;
        b.title = 'Opens the download page' + (u.notes ? '\n\n' + u.notes : '');
        b.hidden = false;
        b.addEventListener('click', () => window.api.openUpdate(u.url));
      }
    })
    .catch(() => {});
})();
