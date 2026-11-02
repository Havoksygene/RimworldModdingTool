'use strict';
/* RimWorld Sprite Viewer - renderer.
   Layer model: every layer has up to 4 facing images, a draw size (in tiles),
   a per-facing offset (x, z in tiles, z = up), and a per-facing "behind body" flag. */

const FACINGS = ['south', 'east', 'north', 'west'];
const $ = (id) => document.getElementById(id);

const S = {
  game: null, // {roots, entries, bodyTypes}
  layers: [],
  selId: null,
  facing: 'south',
  mode: 'single',
  ppt: 170, // pixels per tile on screen
  bg: 'checker',
  grid: true,
  stretch: true, // the game draws sprites onto a square mesh: non-square images get stretched
  skin: '#e0ac86',
  hair: '#4a3020',
  bodyType: '',
  headOffset: [0, 0],
  tab: 'bodies',
  filter: '',
  flipDds: false, // DDS files stored upside-down
};

const DEFAULT_SIZE = { body: 1.5, head: 1.5, hair: 1.5, beard: 1.5, apparel: 1.5, gene: 1.5, weapon: 1.0 };
const imgCache = new Map(); // abs path -> {img, state}
const tintCache = new Map(); // key -> canvas
let uidN = 1;
const uid = () => 'L' + uidN++;

// ---------- image loading ----------------------------------------------
function absPath(ref) {
  if (!ref) return null;
  if (ref.kind === 'file') return ref.path;
  const root = S.game && S.game.roots.find((r) => r.pack === ref.pack);
  return root ? root.root.replace(/[\\/]+$/, '') + '/' + ref.rel : null;
}
const baseName = (p) => String(p).split(/[\\/]/).pop();

function ddsToCanvas(dec) {
  const c = document.createElement('canvas');
  c.width = dec.width;
  c.height = dec.height;
  const g = c.getContext('2d');
  const data = new ImageData(new Uint8ClampedArray(dec.rgba), dec.width, dec.height);
  if (S.flipDds) {
    // some DDS files are stored upside-down
    const tmp = document.createElement('canvas');
    tmp.width = dec.width;
    tmp.height = dec.height;
    tmp.getContext('2d').putImageData(data, 0, 0);
    g.translate(0, dec.height);
    g.scale(1, -1);
    g.drawImage(tmp, 0, 0);
  } else g.putImageData(data, 0, 0);
  c.naturalWidth = dec.width;
  c.naturalHeight = dec.height; // so canvases behave like <img> everywhere below
  return c;
}

// Share of clearly visible pixels (0..1). ~0 means the sprite is empty / fully transparent.
function opaqueRatio(img) {
  try {
    const w = img.naturalWidth || img.width,
      h = img.naturalHeight || img.height;
    const k = Math.min(1, 96 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k));
    c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
    return n / (c.width * c.height);
  } catch {
    return null;
  }
}

function getImage(ref) {
  const p = absPath(ref);
  if (!p) return null;
  let c = imgCache.get(p);
  if (c) return c.state === 'ok' ? c.img : null;
  c = { img: null, state: 'loading', error: null, opaque: null, bytes: 0, waiters: [] };
  imgCache.set(p, c);
  const done = (img) => {
    c.img = img;
    c.state = 'ok';
    c.opaque = opaqueRatio(img);
    settled(p, false);
  };
  const fail = (msg) => {
    c.state = 'error';
    c.error = msg;
    settled(p, true);
  };
  window.api
    .readImage(p)
    .then((buf) => {
      const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      c.bytes = bytes.byteLength;
      if (!c.bytes) return fail('The file is empty (0 bytes).');
      if (/\.dds(\.split)?$/i.test(p) || DDS.isDDS(bytes)) {
        try {
          done(ddsToCanvas(DDS.decode(bytes)));
        } catch (e) {
          fail(e.message);
        }
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(new Blob([bytes], { type: /\.jpe?g$/i.test(p) ? 'image/jpeg' : 'image/png' }));
      img.onload = () => {
        URL.revokeObjectURL(url);
        done(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        fail('The image could not be decoded (' + c.bytes + ' bytes). Is it a valid PNG/JPG?');
      };
      img.src = url;
    })
    .catch((e) => fail('Could not read the file: ' + ((e && e.message) || e)));
  return null;
}

// Runs cb(img) now if the image is loaded, or as soon as it finishes loading.
function onImageReady(ref, cb) {
  const img = getImage(ref);
  if (img) return cb(img);
  const c = imgCache.get(absPath(ref));
  if (c && c.state === 'loading') c.waiters.push(cb);
}

// Called when an image finished loading or failed.
function settled(p, failed) {
  const c = imgCache.get(p);
  if (!c) return;
  const w = c.waiters;
  c.waiters = [];
  if (!failed) w.forEach((f) => f(c.img));
  requestRender();
  renderLayerList();
  const sl = selLayer(),
    pb = $('propsBody');
  const uses = sl && Object.values(sl.images).some((r) => r && absPath(r) === p);
  if (uses && pb && !pb.contains(document.activeElement)) renderProps();
  if (failed) toast(baseName(p) + ': ' + c.error, 9000);
  else if (c.opaque !== null && c.opaque < 0.001)
    toast(baseName(p) + ' is fully transparent (empty alpha), so nothing will be visible. Is the DDS upside-down or the wrong format?', 9000);
}

function imageState(ref) {
  const p = absPath(ref);
  if (!p) return 'none';
  const c = imgCache.get(p);
  return c ? c.state : 'loading';
}
const imageInfo = (ref) => (ref && imgCache.get(absPath(ref))) || null;

function invalidate(p) {
  imgCache.delete(p);
  for (const k of [...tintCache.keys()]) if (k.startsWith(p + '|')) tintCache.delete(k);
  requestRender();
}

function tinted(ref, color) {
  const img = getImage(ref);
  if (!img) return null;
  if (!color) return img;
  const key = absPath(ref) + '|' + color;
  let c = tintCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(img, 0, 0);
  tintCache.set(key, c);
  return c;
}
