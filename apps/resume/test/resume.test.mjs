import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderResume } from '../src/render.ts';
import { readResume } from '../src/cms.ts';
import { normalizeResume } from '../src/model.ts';
import { readFile } from 'node:fs/promises';

const data = () => ({
  profile: { name: 'Ada', surname: 'Rossi', jobPosition: 'Designer', email: 'ada@example.test', skills: 'Design', languages: 'English' },
  publications: [], research: [],
  experiences: [{ company: 'Studio', role: 'Developer', startDate: '2020-01-01', activities: [{ activity: 'Build interfaces' }], industries: [] }],
  education: [{ title: 'Design degree', school: 'University', startDate: '2015-01-01', endDate: '2018-01-01' }]
});

test('renders original English records as selectable semantic text and omits blank optional sections', () => {
  const html = renderResume(data(), 'en');
  assert.match(html, /Ada Rossi/);
  assert.match(html, /Build interfaces/);
  assert.match(html, /Present/);
  assert.doesNotMatch(html, /<h2>Publications/);
  assert.match(html, /@page/);
});

test('missing localized content stays empty and editable', () => {
  const resume = data(); resume.profile.jobPosition = null; resume.experiences[0].role = null;
  const normalized = normalizeResume(resume, 'it');
  assert.equal(normalized.profile.jobPosition, ''); assert.equal(normalized.experiences[0].role, '');
  const html = renderResume(normalized);
  assert.match(html, /Esperienza lavorativa/); assert.doesNotMatch(html, /Designer|Developer/);
});

test('uses canonical Italian fields and localized headings and dates', () => {
  const resume = data();
  resume.profile.jobPosition = 'Progettista';
  resume.experiences[0].role = 'Sviluppatore'; resume.experiences[0].activities = [{ activity: 'Creo interfacce' }];
  resume.education[0].title = 'Laurea in design';
  const html = renderResume(resume, 'it');
  assert.match(html, /Esperienza lavorativa/);
  assert.match(html, /Creo interfacce/);
  assert.match(html, /In corso/);
  assert.match(html, /Gennaio 2020/); assert.match(html, /Laurea in design/); assert.match(html, /Progettista/);
  assert.doesNotMatch(html, /Build interfaces/);
});

test('escapes CMS text and rejects executable links', () => {
  const resume = data();
  resume.profile.name = '<script>alert(1)</script>';
  resume.profile.linkedin = { url: 'javascript:alert(1)' };
  resume.research = [{ title: 'Research', description: '<img onerror=bad>', url: 'https://example.test/?a=1&b=2' }];
  const html = renderResume(resume, 'en');
  assert.doesNotMatch(html, /<script>|href="javascript:/);
  assert.match(html, /&lt;img onerror=bad&gt;/);
  assert.match(html, /https:\/\/example.test/);
});

test('rejects unsupported locales', () => assert.throws(() => renderResume(data(), 'fr'), /locale/i));

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
  const result = await readResume({ baseURL: 'http://localhost:3000', locale: 'it', token: 'secret', fetcher });
  assert.equal(result.experiences.length, 2);
  assert.equal(result.education.length, 2);
  assert.equal(result.publications.length, 2);
  assert.equal(result.research.length, 2);
  assert.equal(urls.length, 9);
  assert.ok(urls.every(url => new URL(url).searchParams.get('locale') === 'it'));
  assert.ok(urls.every(url => !new URL(url).pathname.includes('resume')));
});

test('reports authentication errors without exposing credentials', async () => {
  await assert.rejects(readResume({ baseURL: 'http://localhost:3000', locale: 'en', token: 'secret', fetcher: async () => new Response('secret', { status: 403 }) }), /403/);
});

test('allows education to flow naturally after experience', () => {
  assert.doesNotMatch(renderResume(data(), 'en'), /class="new-page"|break-before: page/);
  const resume = data();
  resume.experiences = [];
  assert.doesNotMatch(renderResume(resume, 'en'), /<section class="new-page">/);
});

test('preserves every bullet in oversized entries', () => {
  const resume = data();
  resume.experiences[0].activities = Array.from({ length: 100 }, (_, n) => ({ activity: `Bullet ${n}` }));
  const html = renderResume(resume, 'en');
  assert.match(html, /Bullet 99/);
  assert.equal((html.match(/<li>Bullet /g) ?? []).length, 100);
});

test('rejects pagination that would loop forever', async () => {
  await assert.rejects(readResume({ baseURL: 'http://localhost:3000', locale: 'en', fetcher: async url => Response.json(String(url).includes('/globals/') ? {} : { docs: [], hasNextPage: true, nextPage: 1 }) }), /pagination/);
});

test('does not forward a token through a redirect or remote plaintext request', async () => {
  await assert.rejects(readResume({ baseURL: 'http://example.test', locale: 'en', token: 'secret' }), /HTTPS/);
  await readResume({ baseURL: 'http://localhost:3000', locale: 'en', token: 'secret', fetcher: async (url, options) => {
    assert.equal(options.redirect, 'error');
    return Response.json(String(url).includes('/globals/') ? {} : { docs: [], hasNextPage: false });
  } });
});

test('preserves explicit line breaks and list item boundaries in source introductions', () => {
  const resume = data();
  resume.profile.presentation = { root: { type: 'root', children: [
    { type: 'paragraph', children: [{ text: 'First line' }, { type: 'linebreak' }, { text: 'Second line' }] },
    { type: 'list', children: [
      { type: 'listitem', children: [{ text: 'First item' }] },
      { type: 'listitem', children: [{ text: 'Second item' }] },
    ] },
  ] } };
  const html = renderResume(resume, 'en');
  assert.match(html, /<p>First line<\/p><p>Second line<\/p><p>First item<\/p><p>Second item<\/p>/);
});


test('renders changed local copies without changing the imported source', () => {
  const source = data(); const working = normalizeResume(source, 'en');
  working.profile.name = 'Edited'; working.experiences[0].activities = 'Custom achievement';
  working.education[0].endDate = '2026-11-05';
  const html = renderResume(working);
  assert.match(html, /Edited Rossi/); assert.match(html, /Custom achievement/); assert.match(html, /November 2026/);
  assert.doesNotMatch(html, /Build interfaces/); assert.equal(source.profile.name, 'Ada');
  assert.equal(source.experiences[0].activities[0].activity, 'Build interfaces');
});

test('respects reordered and hidden sections with natural pagination', () => {
  const working = normalizeResume(data(), 'en');
  working.sectionOrder = ['education', 'experience', 'skills', 'languages', 'introduction', 'publications', 'research', 'additional'];
  let html = renderResume(working);
  assert.ok(html.indexOf('<h2>Education') < html.indexOf('<h2>Work experience'));
  assert.doesNotMatch(html, /<section class="new-page">/);
  working.hiddenSections = ['experience', 'skills']; html = renderResume(working);
  assert.doesNotMatch(html, /Build interfaces|Work experience|<h2>Skills/);
  assert.match(html, /<h2>Languages<\/h2>/);
  assert.match(html, /Design degree/);
});

test('renders CMS skills as individual bullets and languages as a separate section', () => {
  const source = { profile: {
    digitalSkills: ['Figma', 'Adobe suite (Illustrator, Photoshop)'],
    professionalSkills: ['Product design'],
    languages: ['Italian (Native)', 'English (C1)'],
  } };
  const doc = normalizeResume(source);
  assert.equal(doc.profile.skills, 'Figma\nAdobe suite (Illustrator, Photoshop)\nProduct design');
  const expected = /<li>Figma<\/li><li>Adobe suite \(Illustrator, Photoshop\)<\/li><li>Product design<\/li>/;
  assert.match(renderResume(doc), expected);
  doc.profile.skills = 'Digital skills: Figma, Adobe suite (Illustrator, Photoshop)\nProfessional skills: Product design';
  assert.match(renderResume(doc), expected);
  doc.hiddenSections = ['languages'];
  assert.doesNotMatch(renderResume(doc), /<h2>Languages<\/h2>|English \(C1\)/);
  assert.match(renderResume(doc), expected);
});

test('canonical fixtures render their supplied language content', async () => {
  for (const [locale, expected, absent] of [['en', 'Design and implementation', 'Progettazione e sviluppo'], ['it', 'Progettazione e sviluppo', 'Design and implementation']]) {
    const fixture = JSON.parse(await readFile(new URL(`./fixtures/${locale}.json`, import.meta.url), 'utf8'));
    const html = renderResume(fixture, locale);
    assert.ok(html.includes(expected)); assert.ok(!html.includes(absent));
    assert.ok(html.includes(fixture.profile.location)); assert.match(html, /example.test\/research/);
  }
});

test('invalid edited dates are reported instead of printed as misleading values', () => {
  const working = normalizeResume(data(), 'en'); working.experiences[0].startDate = 'invalid';
  assert.throws(() => renderResume(working), /Invalid Resume date/);
});
