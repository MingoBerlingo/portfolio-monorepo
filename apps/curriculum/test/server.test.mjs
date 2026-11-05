import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';

async function request(path, options = {}, dependencies = {}) {
  const server = createApp(dependencies);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await fetch(`http://127.0.0.1:${server.address().port}${path}`, options); }
  finally { server.closeAllConnections(); server.close(); }
}

test('serves the editor without fetching or modifying CMS content', async () => {
  const res = await request('/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Curriculum/);
  assert.match(res.headers.get('cache-control'), /no-store/);
});

test('only imports canonical CMS content for supported locales', async () => {
  let calls = 0;
  const read = async ({ locale, token }) => { calls++; assert.equal(locale, 'it'); assert.equal(token, 'session'); return { profile: { name: 'Ada' } }; };
  const result = await request('/api/cv?locale=it', { headers: { Authorization: 'JWT session' } }, { read });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).profile.name, 'Ada');
  const bad = await request('/api/cv?locale=fr', {}, { read });
  assert.equal(bad.status, 400);
  assert.equal(calls, 1);
});

test('rejects cross-origin PDF requests before rendering', async () => {
  const res = await request('/api/pdf', { method: 'POST', headers: { Origin: 'https://example.test', 'Content-Type': 'application/json' }, body: '{}' }, { print: () => { throw new Error('must not print'); } });
  assert.equal(res.status, 403);
});

test('does not serve arbitrary files or allow CMS writes', async () => {
  assert.equal((await request('/src/../../package.json')).status, 404);
  assert.equal((await request('/api/cv?locale=en', { method: 'POST' })).status, 404);
});

test('rejects malformed documents before PDF generation', async () => {
  const res = await request('/api/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: 'fr' }) });
  assert.equal(res.status, 400);
});
