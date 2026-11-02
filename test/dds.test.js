'use strict';
// Checks the DDS decoder against Pillow's own decoding of the same files.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const DDS = require('../renderer/dds.js');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dds-'));
// Make test DDS files + Pillow's reference decode (raw RGBA) for each.
execFileSync('python3', ['-I', '-c', `
import sys, math
from PIL import Image, ImageDraw
d = sys.argv[1]
def art(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    for y in range(h):
        for x in range(w):
            im.putpixel((x, y), (int(255 * x / max(1, w - 1)), int(255 * y / max(1, h - 1)), (x * 7 + y * 3) % 256, 255))
    g.ellipse([w * .2, h * .2, w * .8, h * .8], fill=(30, 200, 60, 140))
    g.rectangle([0, 0, w // 4, h // 4], fill=(0, 0, 0, 0))
    return im
for name, size, fmt in [('dxt1', (64, 64), 'DXT1'), ('dxt3', (64, 64), 'DXT3'), ('dxt5', (64, 64), 'DXT5'),
                        ('dxt5_odd', (30, 18), 'DXT5'), ('dxt1_odd', (13, 7), 'DXT1')]:
    im = art(*size); im.save(f'{d}/{name}.dds', pixel_format=fmt)
    ref = Image.open(f'{d}/{name}.dds').convert('RGBA'); open(f'{d}/{name}.raw', 'wb').write(ref.tobytes())
im = art(40, 24); im.save(f'{d}/raw.dds'); ref = Image.open(f'{d}/raw.dds').convert('RGBA'); open(f'{d}/raw.raw', 'wb').write(ref.tobytes())
`, dir]);

function compare(name, tol) {
  const bytes = new Uint8Array(fs.readFileSync(path.join(dir, name + '.dds')));
  const ref = fs.readFileSync(path.join(dir, name + '.raw'));
  const got = DDS.decode(bytes);
  assert.strictEqual(got.rgba.length, ref.length, name + ': size');
  let worst = 0;
  for (let i = 0; i < ref.length; i++) worst = Math.max(worst, Math.abs(got.rgba[i] - ref[i]));
  assert.ok(worst <= tol, `${name}: worst channel difference ${worst} > ${tol}`);
  console.log(`ok - ${name} (${got.width}x${got.height}, ${got.label}) max diff ${worst}`);
}
compare('dxt1', 2); compare('dxt3', 2); compare('dxt5', 2); compare('dxt5_odd', 2); compare('dxt1_odd', 2); compare('raw', 0);

// DX10-header variant: wrap the DXT5 payload in a DX10 header (DXGI_FORMAT_BC3_UNORM = 77)
{
  const src = new Uint8Array(fs.readFileSync(path.join(dir, 'dxt5.dds')));
  const out = new Uint8Array(src.length + 20);
  out.set(src.subarray(0, 128), 0);
  const dv = new DataView(out.buffer);
  dv.setUint32(84, 0x30315844, true);   // 'DX10'
  dv.setUint32(128, 77, true); dv.setUint32(132, 3, true); dv.setUint32(140, 1, true);
  out.set(src.subarray(128), 148);
  const a = DDS.decode(out), b = DDS.decode(src);
  assert.deepStrictEqual(Array.from(a.rgba), Array.from(b.rgba));
  console.log('ok - DX10 header (BC3) decodes the same as a legacy DXT5 header');
}

// error handling: bad files give clear messages, never a crash
assert.throws(() => DDS.decode(new Uint8Array(200)), /Not a DDS file/);
assert.throws(() => DDS.decode(new Uint8Array(fs.readFileSync(path.join(dir, 'dxt5.dds'))).subarray(0, 300)), /truncated/);
{
  const src = new Uint8Array(fs.readFileSync(path.join(dir, 'dxt5.dds')));
  const bad = src.slice(); new DataView(bad.buffer).setUint32(84, 0x31495441, true);   // 'ATI1' (BC4), unsupported
  assert.throws(() => DDS.decode(bad), /Unsupported DDS format \(ATI1\)/);
}
console.log('ok - bad / truncated / unsupported files fail with clear messages');
console.log('dds tests passed');
