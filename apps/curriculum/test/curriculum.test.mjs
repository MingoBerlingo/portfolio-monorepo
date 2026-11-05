import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCV } from '../src/render.mjs';
import { readCV } from '../src/cms.mjs';

const data = () => ({
  profile: { name: 'Ada', surname: 'Rossi', jobPosition: 'Designer', email: 'ada@example.test' },
  curriculum: { skills: 'Design', languages: 'English', publications: [], research: [] },
  experiences: [{ company: 'Studio', role: 'Developer', startDate: '2020-01-01', activities: [{ activity: 'Build interfaces' }], industries: [] }],
  education: [{ title: 'Design degree', school: 'University', startDate: '2015-01-01', endDate: '2018-01-01' }]
});

test('renders original English records as selectable semantic text and omits blank optional sections', () => {
  const html = renderCV(data(), 'en');
  assert.match(html, /Ada Rossi/);
  assert.match(html, /Build interfaces/);
  assert.match(html, /Present/);
  assert.doesNotMatch(html, /<h2>Publications/);
  assert.match(html, /@page/);
});

test('requires Italian translations instead of silently mixing languages', () => {
  assert.throws(() => renderCV(data(), 'it'), /translation/i);
});

test('uses Italian translations and localized headings and dates', () => {
  const cv = data();
  cv.profile.cvTranslation = { jobPosition: 'Progettista' };
  cv.experiences[0].cvTranslation = { role: 'Sviluppatore', activities: 'Creo interfacce' };
  cv.education[0].cvTranslation = { title: 'Laurea in design' };
  const html = renderCV(cv, 'it');
  assert.match(html, /Esperienza lavorativa/);
  assert.match(html, /Creo interfacce/);
  assert.match(html, /In corso/);
  assert.doesNotMatch(html, /Build interfaces/);
});

test('escapes CMS text and rejects executable links', () => {
  const cv = data();
  cv.profile.name = '<script>alert(1)</script>';
  cv.profile.linkedin = { url: 'javascript:alert(1)' };
  cv.curriculum.research = [{ title: 'Research', description: '<img onerror=bad>', url: 'https://example.test/?a=1&b=2' }];
  const html = renderCV(cv, 'en');
  assert.doesNotMatch(html, /<script>|href="javascript:/);
  assert.match(html, /&lt;img onerror=bad&gt;/);
  assert.match(html, /https:\/\/example.test/);
});

test('rejects unsupported locales', () => assert.throws(() => renderCV(data(), 'fr'), /locale/i));

test('reads all collection pages and disables localized fallback', async () => {
  const urls = [];
  const fetcher = async (url, options) => {
    urls.push(String(url));
    assert.equal(options.headers.Authorization, 'JWT secret');
    const u = new URL(url);
    assert.equal(u.searchParams.get('fallback-locale'), 'none');
    if (u.pathname.includes('/globals/')) return Response.json({});
    const page = Number(u.searchParams.get('page'));
    return Response.json({ docs: [{ id: page }], hasNextPage: page === 1, nextPage: page === 1 ? 2 : null });
  };
  const result = await readCV({ baseURL: 'http://localhost:3000', locale: 'it', token: 'secret', fetcher });
  assert.equal(result.experiences.length, 2);
  assert.equal(result.education.length, 2);
  assert.equal(urls.length, 6);
});

test('reports authentication errors without exposing credentials', async () => {
  await assert.rejects(readCV({ baseURL: 'http://localhost:3000', locale: 'en', token: 'secret', fetcher: async () => new Response('secret', { status: 403 }) }), /403/);
});

test('starts education on a new printed page when experience is present', () => {
  assert.match(renderCV(data(), 'en'), /<section class="new-page"><h2>Education/);
  const cv = data();
  cv.experiences = [];
  assert.doesNotMatch(renderCV(cv, 'en'), /<section class="new-page">/);
});

test('preserves every bullet in oversized entries', () => {
  const cv = data();
  cv.experiences[0].activities = Array.from({ length: 100 }, (_, n) => ({ activity: `Bullet ${n}` }));
  const html = renderCV(cv, 'en');
  assert.match(html, /Bullet 99/);
  assert.equal((html.match(/<li>Bullet /g) ?? []).length, 100);
});

test('rejects pagination that would loop forever', async () => {
  await assert.rejects(readCV({ baseURL: 'http://localhost:3000', locale: 'en', fetcher: async url => Response.json(String(url).includes('/globals/') ? {} : { docs: [], hasNextPage: true, nextPage: 1 }) }), /pagination/);
});

test('does not forward a token through a redirect or remote plaintext request', async () => {
  await assert.rejects(readCV({ baseURL: 'http://example.test', locale: 'en', token: 'secret' }), /HTTPS/);
  await readCV({ baseURL: 'http://localhost:3000', locale: 'en', token: 'secret', fetcher: async (url, options) => {
    assert.equal(options.redirect, 'error');
    return Response.json(String(url).includes('/globals/') ? {} : { docs: [], hasNextPage: false });
  } });
});

test('preserves explicit line breaks and list item boundaries in source introductions', () => {
  const cv = data();
  cv.profile.presentation = { root: { type: 'root', children: [
    { type: 'paragraph', children: [{ text: 'First line' }, { type: 'linebreak' }, { text: 'Second line' }] },
    { type: 'list', children: [
      { type: 'listitem', children: [{ text: 'First item' }] },
      { type: 'listitem', children: [{ text: 'Second item' }] },
    ] },
  ] } };
  const html = renderCV(cv, 'en');
  assert.match(html, /<p>First line<\/p><p>Second line<\/p><p>First item<\/p><p>Second item<\/p>/);
});
