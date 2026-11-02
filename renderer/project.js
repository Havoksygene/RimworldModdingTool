'use strict';
// RimWorld Sprite Viewer renderer: project save / load and PNG export. Plain script; shares globals with the other renderer files (see index.html for the order).

// ---------- project save/load / png export -------------------------------
function projectJson() {
  return JSON.stringify(
    {
      version: 1,
      bodyType: S.bodyType,
      headOffset: S.headOffset,
      skin: S.skin,
      hair: S.hair,
      bg: S.bg,
      layers: S.layers,
    },
    null,
    2,
  );
}
$('btnSaveProj').addEventListener('click', async () => {
  const saved = snapshot();
  const p = await window.api.saveFile({
    defaultName: 'pawn-preview.json',
    filters: [{ name: 'Project', extensions: ['json'] }],
    text: projectJson(),
  });
  if (p) H.saved = saved;
});
$('btnOpen').addEventListener('click', async () => {
  const t = await window.api.openJson();
  if (!t) return;
  try {
    const p = JSON.parse(t);
    S.layers = (p.layers || []).map((l) => ({ ...newLayer(l.kind || 'apparel', l.name || 'layer', l.images || {}), ...l, id: uid() }));
    S.selId = S.layers.length ? S.layers[S.layers.length - 1].id : null;
    S.bodyType = p.bodyType || '';
    S.headOffset = p.headOffset || [0, 0];
    S.skin = p.skin || S.skin;
    S.hair = p.hair || S.hair;
    S.bg = p.bg || S.bg;
    $('skin').value = S.skin;
    $('hairc').value = S.hair;
    $('bg').value = S.bg;
    $('hoX').value = S.headOffset[0];
    $('hoZ').value = S.headOffset[1];
    $('bodyType').value = S.bodyType;
    afterLayersChanged();
    commit();
    H.saved = snapshot();
  } catch (e) {
    alert('Could not read that project: ' + e.message);
  }
});
$('btnPng').addEventListener('click', async () => {
  const c = document.createElement('canvas');
  paint(c, 'sheet', null);
  const b64 = c.toDataURL('image/png').split(',')[1];
  await window.api.saveFile({ defaultName: 'pawn-preview.png', filters: [{ name: 'PNG', extensions: ['png'] }], base64: b64 });
});

// Real RimWorld 1.7 values (from the game's BodyTypeDefs); used only when no Defs folder was added.
const FALLBACK_BODY_TYPES = [
  { defName: 'Male', headOffset: [0.04, 0.34], bodyNakedGraphicPath: 'Things/Pawn/Humanlike/Bodies/Naked_Male' },
  { defName: 'Female', headOffset: [0.1, 0.34], bodyNakedGraphicPath: 'Things/Pawn/Humanlike/Bodies/Naked_Female' },
  { defName: 'Thin', headOffset: [0.09, 0.34], bodyNakedGraphicPath: 'Things/Pawn/Humanlike/Bodies/Naked_Thin' },
  { defName: 'Hulk', headOffset: [0.1, 0.34], bodyNakedGraphicPath: 'Things/Pawn/Humanlike/Bodies/Naked_Hulk' },
  { defName: 'Fat', headOffset: [0.09, 0.34], bodyNakedGraphicPath: 'Things/Pawn/Humanlike/Bodies/Naked_Fat' },
];
