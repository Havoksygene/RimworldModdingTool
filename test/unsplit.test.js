'use strict';
// A real RimWorld 1.7 ".dds.split" sample must rebuild into the exact plain BC7 DDS (verified visually and by size).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DDS = require('../renderer/dds.js');
const fx = path.join(__dirname, 'fixtures');
const split = new Uint8Array(fs.readFileSync(path.join(fx, 'RevenantFleshChunk.png.dds.split')));
const want = new Uint8Array(fs.readFileSync(path.join(fx, 'RevenantFleshChunk.expected.dds')));
const got = DDS.unsplit(split);
assert.strictEqual(got.length, 148 + 343 * 16);
assert.ok(Buffer.from(got).equals(Buffer.from(want)), 'rebuilt DDS differs from expected');
assert.strictEqual(DDS.unsplit(want), want, 'plain DDS must pass through untouched');
console.log('unsplit ok');
