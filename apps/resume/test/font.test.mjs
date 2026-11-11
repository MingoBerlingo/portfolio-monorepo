import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { printResume } from '../src/pdf.ts';
import { normalizeResume } from '../src/model.ts';

const fontPath = new URL('../static/fonts/dm-sans.woff2', import.meta.url);

test('bundles a real WOFF2 font and its open font license', async () => {
  const font = await readFile(fontPath);
  assert.equal(font.toString('ascii', 0, 4), 'wOF2');
  assert.equal(font.readUInt32BE(8), font.length);
  assert.ok(font.length > 10000);
  assert.match(await readFile(new URL('../static/fonts/OFL.txt', import.meta.url), 'utf8'), /SIL OPEN FONT LICENSE Version 1.1/);
});

test('PDF embeds the bundled font and waits for font loading before printing', async t => {
  const calls = [];
  let html;
  const page = {
    route: async () => {}, emulateMedia: async () => {},
    setContent: async value => { html = value; calls.push('content'); },
    evaluate: async callback => { assert.match(callback.toString(), /fonts.load/); assert.match(callback.toString(), /fonts.ready/); calls.push('fonts'); },
    pdf: async () => { calls.push('pdf'); return Buffer.from('%PDF'); },
  };
  t.mock.method(chromium, 'launch', async () => ({ newPage: async () => page, close: async () => calls.push('close') }));
  await printResume(normalizeResume({ profile: { name: 'Àda' } }, 'it'));
  for (const weight of [400, 500, 600, 700]) {
    const font = await readFile(new URL(`../static/fonts/dm-sans-${weight}.ttf`, import.meta.url));
    assert.equal(font.readUInt32BE(0), 0x00010000);
    const tables = Array.from({ length: font.readUInt16BE(4) }, (_, i) => font.toString('ascii', 12 + 16 * i, 16 + 16 * i));
    assert.ok(tables.includes('glyf'));
    assert.ok(!tables.includes('fvar'), 'PDF fonts must be static instances');
    assert.ok(html.includes(`data:font/ttf;base64,${font.toString('base64')}`));
  }
  assert.deepEqual(calls, ['content', 'fonts', 'pdf', 'close']);
});
