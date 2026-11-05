import { validateLocale } from './cms.mjs';

const labels = {
  en: { introduction: 'Introduction', skills: 'Skills and competencies', languages: 'Languages', experience: 'Work experience', education: 'Education', publications: 'Publications', research: 'Research projects', additional: 'Additional information', present: 'Present' },
  it: { introduction: 'Introduzione', skills: 'Capacità e competenze', languages: 'Lingue', experience: 'Esperienza lavorativa', education: 'Istruzione', publications: 'Pubblicazioni', research: 'Progetti di ricerca', additional: 'Altre informazioni', present: 'In corso' },
};
const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const lines = value => String(value ?? '').split('\n').map(s => s.trim()).filter(Boolean);
const paragraphs = value => lines(value).map(s => `<p>${escape(s)}</p>`).join('');
const bullets = value => lines(value).length ? `<ul>${lines(value).map(s => `<li>${escape(s)}</li>`).join('')}</ul>` : '';
const safeURL = value => {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
};
const link = (url, label) => safeURL(url) ? `<a href="${escape(safeURL(url))}">${escape(label || url)}</a>` : '';
const richText = node => {
  if (!node) return '';
  if (node.text) return node.text;
  const separator = node.type === 'root' ? '\n' : '';
  return (node.children ?? []).map(richText).join(separator);
};

/** Semantic HTML only: every CMS string is escaped, including translated text. */
export function renderCV({ profile, curriculum = {}, experiences = [], education = [] }, locale) {
  validateLocale(locale);
  if (!profile?.name || !profile?.surname || !profile?.email || !profile?.jobPosition) throw new Error('Complete the CMS Profile name, surname, email and job position before exporting.');
  const t = labels[locale];
  const translated = (record, field, original, context) => {
    const value = record.cvTranslation?.[field];
    if (value?.trim()) return value;
    if (locale === 'en' || !original?.trim()) return original ?? '';
    throw new Error(`Missing ${locale} translation: ${context}.${field}. Fill CV translation in the CMS.`);
  };
  const date = value => {
    if (!value) return t.present;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid CV date: ${value}`);
    return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  };
  const section = (title, body) => body ? `<section><h2>${escape(title)}</h2><div class="section-body">${body}</div></section>` : '';
  const entry = (heading, body, period = '') => `<article>${period ? `<p class="date">${escape(period)}</p>` : ''}<h3>${escape(heading)}</h3>${body}</article>`;
  const title = translated(profile, 'jobPosition', profile.jobPosition, 'Profile');
  const intro = translated(profile, 'presentation', richText(profile.presentation?.root), 'Profile');
  const experienceHTML = experiences.map(e => {
    const role = translated(e, 'role', e.role, `Experience ${e.company}`);
    const industries = translated(e, 'industries', (e.industries ?? []).map(x => x.industry).join('\n'), `Experience ${e.company}`);
    const activities = translated(e, 'activities', (e.activities ?? []).map(x => x.activity).join('\n'), `Experience ${e.company}`);
    return entry(`${role} – ${e.company}`, paragraphs(industries) + bullets(activities), `${date(e.startDate)} – ${date(e.endDate)}`);
  }).join('');
  const educationHTML = education.map(e => entry(translated(e, 'title', e.title, `Education ${e.school}`), paragraphs(e.school) + bullets(translated(e, 'details', e.details, `Education ${e.school}`)), `${date(e.startDate)} – ${date(e.endDate)}`)).join('');
  const extras = key => (curriculum[key] ?? []).map(e => entry(e.title, paragraphs(e.description) + link(e.url), e.date ? date(e.date) : '')).join('');
  const fullName = `${profile.name} ${profile.surname}`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(fullName)} – CV (${locale})</title><style>
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #161616; font: 9pt/1.4 Arial, sans-serif; background: white; }
  main { max-width: 186mm; margin: auto; }
  header { margin-bottom: 10mm; break-inside: avoid; }
  h1 { font-size: 15pt; margin: 0; } .role { color: #4234ff; font-size: 12pt; margin: 0 0 3mm; }
  .contact { font-size: 8pt; } .contact p { margin: 0; }
  section { display: block; position: relative; padding-left: 48mm; margin: 0 0 7mm; }
  h2 { position: absolute; left: 0; top: 0; width: 43mm; color: #4234ff; font-size: 9pt; font-weight: normal; margin: 0; break-after: avoid; }
  h3 { font-size: 9pt; margin: 0; break-after: avoid; } p { margin: 0 0 1mm; }
  article { margin-bottom: 4mm; } article:last-child { margin-bottom: 0; }
  .date { color: #4234ff; font-size: 8pt; break-after: avoid; }
  ul { padding-left: 4mm; margin: 1mm 0 0; } li { margin-bottom: 1mm; break-inside: avoid; }
  p { orphans: 3; widows: 3; } a { color: inherit; text-decoration: underline; overflow-wrap: anywhere; } h1,h2,h3,p,li { overflow-wrap: anywhere; }
  @media screen { body { background: #e8e8e8; padding: 12mm; } main { background: white; padding: 15mm 12mm; max-width: 210mm; min-height: 297mm; } }
  @media screen and (max-width: 650px) { body { padding: 8px; } main { padding: 16px; } section { padding-left: 0; } h2 { position: static; width: auto; margin-bottom: 8px; } }
  </style></head><body><main><header><h1>${escape(fullName)}</h1><p class="role">${escape(title)}</p><div class="contact">${paragraphs(profile.email)}${paragraphs(curriculum.phone)}${paragraphs(curriculum.location)}${link(profile.linkedin?.url, profile.linkedin?.label || 'LinkedIn')} ${link(profile.github?.url, profile.github?.label || 'GitHub')}</div></header>
  ${section(t.introduction, paragraphs(intro))}
  ${section(t.skills, paragraphs(curriculum.skills) + (curriculum.languages ? `<p><strong>${t.languages}:</strong> ${escape(curriculum.languages)}</p>` : ''))}
  ${section(t.experience, experienceHTML)}${section(t.education, educationHTML)}${section(t.publications, extras('publications'))}${section(t.research, extras('research'))}${section(t.additional, paragraphs(curriculum.additionalInfo))}
  </main></body></html>`;
}
