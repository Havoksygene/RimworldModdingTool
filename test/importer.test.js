'use strict';
// Art importer: fake game with a core Assets.zip (Resources/Textures) and a DLC Assets.zip (Textures), deflated + stored entries.
// usage: node test/importer.test.js <scratchDir>
const path = require('path'); const fs = require('fs'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { importAssets, findArchives } = require('../lib/importer'); const idx = require('../lib/indexer');
(async () => {
  const root = path.join(process.argv[2], 'imp'); fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(root, { recursive: true });
  execFileSync('python3', ['-I', '-c', `
import zipfile,os,sys
root=sys.argv[1]; g=root+'/game'; os.makedirs(g+'/Data/Royalty',exist_ok=True); os.makedirs(g+'/Data/Core',exist_ok=True)
dds=b'DDS '+bytes(124)+b'DX10'+bytes(200)
H='Things/Pawn/Humanlike/'
core=[H+'Hairs/Afro_south.png.dds.split',H+'Hairs/Afro_east.psd.dds.split',H+'Hairs/Afro_north.png.dds.split',H+'Bodies/Naked_Male_south.png.dds.split',
 H+'Apparel/AdvancedHelmet/AdvancedHelmet_south.png.dds.split',H+'Apparel/Cape/Cape_Male_south.psd.dds.split',H+'Apparel/Hood/Hood_south.psd.dds.split',
 'Things/Item/Equipment/WeaponRanged/Revolver.png.dds.split','Things/Building/Furniture/Table2x2_north.psd.dds.split','Things/Building/Production/TableMachining_northm.psd.dds.split','Damage/Corner.psd.dds.split']
with zipfile.ZipFile(g+'/Assets.zip','w',zipfile.ZIP_DEFLATED) as z:
    for n in core: z.writestr('Resources/Textures/'+n,dds)
    z.writestr('Resources/Sounds/a.ogg',b'x'); z.writestr('bake.manifest','x')
with zipfile.ZipFile(g+'/Data/Royalty/Assets.zip','w',zipfile.ZIP_STORED) as z:
    z.writestr('Textures/'+H+'Beards/Fancy_south.png.dds.split',dds); z.writestr('Textures/'+H+'Heads/Male/Cult_south.png.dds.split',dds)
    z.writestr('Textures/'+H+'BodyAttachments/FurTail/FurTail_south.png.dds.split',dds); z.writestr('Sounds/b.ogg',b'x')
`, root]);
  const game = path.join(root, 'game'), lib = path.join(root, 'lib');
  const arch = findArchives(game); assert.deepStrictEqual(arch.map((a) => a.name).sort(), ['Core', 'Royalty']); console.log('ok - finds core + DLC archives');
  assert.deepStrictEqual(findArchives(path.join(game, 'Data')).map((a) => a.name).sort(), ['Core', 'Royalty']); console.log('ok - also works when the Data folder is chosen');
  const prog = []; const r = await importAssets({ gameDir: game, libDir: lib, onProgress: (p) => prog.push(p) });
  const has = (p) => fs.existsSync(path.join(lib, ...p.split('/')));
  for (const p of ['Hair/Afro_south.png.dds', 'Hair/Afro_east.png.dds', 'Bodies/Naked_Male_south.png.dds', 'Apparel-Head/AdvancedHelmet/AdvancedHelmet_south.png.dds', 'Apparel-Body/Cape/Cape_Male_south.png.dds', 'Apparel-Head/Hood/Hood_south.png.dds', 'Weapons/WeaponRanged/Revolver.png.dds', 'Beards/Fancy_south.png.dds', 'Heads/Male/Cult_south.png.dds', 'Genes/FurTail/FurTail_south.png.dds']) assert.ok(has(p), 'missing ' + p);
  console.log('ok - sprites sorted into Library folders, .split and .psd names normalised');
  assert.ok(!fs.existsSync(path.join(lib, 'Damage')) && !has('Weapons/Table2x2_north.png.dds'), 'unwanted files copied'); console.log('ok - sounds, buildings, masks, UI skipped');
  assert.strictEqual(r.errors.length, 0); assert.strictEqual(Object.values(r.imported).reduce((a, b) => a + b, 0), 11); assert.ok(prog.some((p) => p.phase === 'done')); console.log('ok - counts and progress');
  const r2 = await importAssets({ gameDir: game, libDir: lib }); assert.strictEqual(r2.skipped, 11); assert.strictEqual(Object.keys(r2.imported).length, 0); console.log('ok - second run skips existing files');
  const s = idx.scan([{ path: path.join(lib, 'Hair'), category: 'hair', library: true }, { path: path.join(lib, 'Apparel-Head'), category: 'apparel-head', library: true }]);
  assert.ok(s.entries.some((e) => /Afro/.test(e.base) && e.facings && Object.keys(e.facings).length >= 3), 'hair not indexed as a 3-facing entry'); assert.ok(s.entries.some((e) => /AdvancedHelmet/.test(e.base)));
  console.log('ok - the viewer indexer picks the imported files up');
  // other compression methods: zstd (93) is read; lzma (14) is reported clearly while the rest still imports
  const zlib = require('zlib'); const crc = zlib.crc32;
  function makeZip(file, ents) {
    const parts = [], cds = []; let off = 0;
    for (const e of ents) {
      const name = Buffer.from(e.name), data = e.method === 93 ? zlib.zstdCompressSync(e.data) : e.data;
      const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(e.method, 8); lh.writeUInt32LE(crc(e.data), 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(e.data.length, 22); lh.writeUInt16LE(name.length, 26);
      const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(e.method, 10); cd.writeUInt32LE(crc(e.data), 16); cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(e.data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(off, 42);
      parts.push(lh, name, data); cds.push(cd, name); off += 30 + name.length + data.length;
    }
    const cdBuf = Buffer.concat(cds), eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(ents.length, 8); eo.writeUInt16LE(ents.length, 10); eo.writeUInt32LE(cdBuf.length, 12); eo.writeUInt32LE(off, 16);
    fs.writeFileSync(file, Buffer.concat([...parts, cdBuf, eo]));
  }
  const g2 = path.join(root, 'game2'); fs.mkdirSync(g2, { recursive: true });
  const D = Buffer.from('DDS ' + 'x'.repeat(300));
  makeZip(path.join(g2, 'Assets.zip'), [{ name: 'Resources/Textures/Things/Pawn/Humanlike/Hairs/Z_south.png.dds.split', method: 93, data: D }, { name: 'Resources/Textures/Things/Pawn/Humanlike/Hairs/L_south.png.dds.split', method: 14, data: D }, { name: 'Resources/Textures/Things/Pawn/Humanlike/Hairs/S_south.png.dds.split', method: 0, data: D }]);
  const lib2 = path.join(root, 'lib2'); const r3 = await importAssets({ gameDir: g2, libDir: lib2 });
  assert.ok(fs.readFileSync(path.join(lib2, 'Hair', 'Z_south.png.dds')).equals(D), 'zstd entry not read'); assert.ok(fs.existsSync(path.join(lib2, 'Hair', 'S_south.png.dds')));
  assert.ok(!fs.existsSync(path.join(lib2, 'Hair', 'L_south.png.dds')) && r3.errors.length === 1 && /method 14 \(lzma\)/.test(r3.errors[0]) && r3.methods[14] === 1, JSON.stringify(r3.errors));
  console.log('ok - zstd read; lzma reported with its method number while the rest imports'); console.log('IMPORTER_OK');
})().catch((e) => { console.error(e); process.exit(1); });
