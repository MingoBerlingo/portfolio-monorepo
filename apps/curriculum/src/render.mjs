import { validateLocale } from './cms.mjs';
import { normalizeCV } from './model.mjs';

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
/** Render the exact edited working copy; the browser and PDF use the same template. */
export function renderCV(source, locale = source.locale) {
  validateLocale(locale);
  const { profile, experiences, education, publications, research, sectionOrder, hiddenSections } = normalizeCV(source, locale);
  const t = labels[locale];
  const date = value => {
    if (!value) return t.present;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid CV date: ${value}`);
    return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  };
  const section = (title, body, pageBreak = false) => body ? `<section${pageBreak ? ' class="new-page"' : ''}><h2>${escape(title)}</h2><div class="section-body">${body}</div></section>` : '';
  const entry = (heading, body, period = '') => `<article>${period ? `<p class="date">${escape(period)}</p>` : ''}<h3>${escape(heading)}</h3>${body}</article>`;
  const experienceHTML = experiences.map(e => entry([e.role, e.company].filter(Boolean).join(' – '), paragraphs(e.industries) + bullets(e.activities), [e.startDate ? date(e.startDate) : '', date(e.endDate)].filter(Boolean).join(' – '))).join('');
  const educationHTML = education.map(e => entry(e.title, paragraphs(e.school) + bullets(e.details), [e.startDate ? date(e.startDate) : '', e.endDate ? date(e.endDate) : ''].filter(Boolean).join(' – '))).join('');
  const extras = entries => entries.map(e => entry(e.title, paragraphs(e.description) + link(e.url), e.date ? date(e.date) : '')).join('');
  const fullName = `${profile.name} ${profile.surname}`.trim();
  const bodies = {
    introduction: paragraphs(profile.presentation),
    skills: paragraphs(profile.skills) + (profile.languages ? `<p><strong>${t.languages}:</strong> ${escape(profile.languages)}</p>` : ''),
    experience: experienceHTML, education: educationHTML,
    publications: extras(publications), research: extras(research), additional: paragraphs(profile.additionalInfo),
  };
  const visible = sectionOrder.filter(key => !hiddenSections.includes(key) && bodies[key]);
  const content = visible.map((key, index) => section(t[key], bodies[key], key === 'education' && index > 0 && visible.slice(0,index).includes('experience'))).join('');
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
  @media print { .new-page { break-before: page; } }
  @media screen { body { background: #eae9f0; padding: 20px; width: 834px; } main { background: white; padding: 15mm 12mm; width: 794px; max-width: none; min-height: 1123px; box-shadow: 0 2px 8px #22113312; } }
  </style></head><body><main><header><h1>${escape(fullName)}</h1><p class="role">${escape(profile.jobPosition)}</p><div class="contact">${paragraphs(profile.email)}${paragraphs(profile.phone)}${paragraphs(profile.location)}${link(profile.linkedin?.url, profile.linkedin?.label || 'LinkedIn')} ${link(profile.github?.url, profile.github?.label || 'GitHub')}</div></header>
  ${content}
  </main></body></html>`;
}
