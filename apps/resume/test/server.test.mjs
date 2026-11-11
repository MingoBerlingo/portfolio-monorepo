import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandlers } from '../src/lib/server/api.ts';
import { requestViolation } from '../src/lib/server/security.ts';
import { normalizeResume, MAX_DOCUMENT_BYTES } from '../src/model.ts';
const pdfRequest = body => new Request('http://127.0.0.1:4174/api/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

test('imports canonical CMS content without forwarding browser credentials', async () => {
  let options;
  const handlers = createHandlers({ read: async args => { options = args; return { profile: { name: 'Ada' } }; } });
  const response = await handlers.resume(new URL('http://127.0.0.1:4174/api/resume?locale=en'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).profile.name, 'Ada');
  assert.deepEqual(options, { locale: 'en' });
  assert.equal((await handlers.resume(new URL('http://127.0.0.1:4174/api/resume?locale=fr'))).status, 400);
});

test('rejects external hosts, cross-origin requests and cross-site browser requests', () => {
  const req = headers => new Request('http://127.0.0.1:4174/api/pdf', { headers });
  assert.equal(requestViolation(req({ Host: '127.0.0.1:4174', Origin: 'http://127.0.0.1:4174' })), null);
  assert.match(requestViolation(req({ Host: 'evil.test:4174' })), /local/);
  assert.match(requestViolation(req({ Origin: 'https://evil.test' })), /Cross-origin/);
  assert.match(requestViolation(req({ 'Sec-Fetch-Site': 'cross-site' })), /Cross-origin/);
});

test('rejects malformed, oversized and non-JSON documents before printing', async () => {
  const handlers = createHandlers({ print: async () => { assert.fail('must not print'); } });
  assert.equal((await handlers.pdf(pdfRequest('{'))).status, 400);
  assert.equal((await handlers.pdf(pdfRequest(JSON.stringify({ locale: 'fr' })))).status, 400);
  assert.equal((await handlers.pdf(pdfRequest(' '.repeat(MAX_DOCUMENT_BYTES + 1)))).status, 413);
  assert.equal((await handlers.pdf(new Request('http://127.0.0.1:4174/api/pdf', { method: 'POST', body: '{}' }))).status, 400);
});

test('sanitizes unexpected CMS and PDF exceptions', async () => {
  const secret = 'private mongodb://credential';
  const handlers = createHandlers({ read: async () => { throw Error(secret); }, print: async () => { throw Error(secret); } });
  const cms = await handlers.resume(new URL('http://127.0.0.1:4174/api/resume?locale=it'));
  assert.equal(cms.status, 503); assert.doesNotMatch(await cms.text(), /credential/);
  const pdf = await handlers.pdf(pdfRequest(JSON.stringify(normalizeResume({}, 'it'))));
  assert.equal(pdf.status, 500); assert.doesNotMatch(await pdf.text(), /credential/);
});

test('allows one PDF at a time and releases the guard after printing', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const handlers = createHandlers({ print: async () => { started(); await gate; return Buffer.from('%PDF'); } });
  const body = JSON.stringify(normalizeResume({}, 'en'));
  const first = handlers.pdf(pdfRequest(body)); await ready;
  assert.equal((await handlers.pdf(pdfRequest(body))).status, 429);
  release(); const response = await first;
  assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition'), /resume-en.pdf/);
  assert.equal((await handlers.pdf(pdfRequest(body))).status, 200);
});

test('releases the PDF guard when printing fails', async () => {
  let calls = 0;
  const handlers = createHandlers({ print: async () => { if (++calls === 1) throw Error('printer failure'); return Buffer.from('%PDF'); } });
  const body = JSON.stringify(normalizeResume({}, 'en'));
  assert.equal((await handlers.pdf(pdfRequest(body))).status, 500);
  assert.equal((await handlers.pdf(pdfRequest(body))).status, 200);
});
