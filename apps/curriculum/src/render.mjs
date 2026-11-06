import { validateLocale } from './cms.mjs';
import { normalizeCV } from './model.mjs';

const labels = {
  en: { introduction: 'Introduction', skills: 'Skills and competencies', languages: 'Languages', experience: 'Work experience', education: 'Education', publications: 'Publications', research: 'Research projects', additional: 'Additional information', present: 'Present' },
  it: { introduction: 'Introduzione', skills: 'Capacità e competenze', languages: 'Lingue', experience: 'Esperienza lavorativa', education: 'Istruzione', publications: 'Pubblicazioni', research: 'Progetti di ricerca', additional: 'Altre informazioni', present: 'In corso' },
};
const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const lines = value => String(value ?? '').split('\n').map(s => s.trim()).filter(Boolean);
const paragraphs = value => String(value ?? '').trim() ? `<div class="multiline">${String(value).split('\n').map(s => s ? `<p>${escape(s)}</p>` : '<p><br></p>').join('')}</div>` : '';
const bullets = value => lines(value).length ? `<ul>${lines(value).map(s => `<li>${escape(s)}</li>`).join('')}</ul>` : '';
const safeURL = value => {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
};
const link = (url, label) => safeURL(url) ? `<a href="${escape(safeURL(url))}">${escape(label || url)}</a>` : '';
/** Render the exact edited working copy; the browser and PDF use the same template. */
export function renderCV(source, locale = source.locale, options = {}) {
  const editable = options.editable === true;
  const fontURL = String(options.fontURL ?? "/fonts/dm-sans.woff2").replace(/[<>\\"\'\n\r]/g, c => `%${c.charCodeAt(0).toString(16)}`);
  const fontRules = options.fontFaces ? [400,500,600,700].map(weight => {
    const url = String(options.fontFaces[weight] ?? '').replace(/[<>\\"'\n\r]/g,c=>`%${c.charCodeAt(0).toString(16)}`);
    return `@font-face { font-family: 'DM Sans'; font-style: normal; font-weight: ${weight}; font-display: swap; src: url("${url}") format('truetype'); }`;
  }).join('\n') : `@font-face { font-family: 'DM Sans'; font-style: normal; font-weight: 400 700; font-display: swap; src: url("${fontURL}") format('woff2'); }`;
  validateLocale(locale);
  const { profile, experiences, education, publications, research, sectionOrder, hiddenSections } = normalizeCV(source, locale);
  const t = labels[locale];
  const date = value => {
    if (!value) return t.present;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid CV date: ${value}`);
    return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  };
  const field = (path, value, label, multiline = false, tag = 'span', extra = '') => editable
    ? `<${tag} contenteditable="plaintext-only" role="textbox" aria-label="${escape(label)}" data-field="${path}"${multiline ? ' data-multiline="true" aria-multiline="true"' : ''}${extra} data-placeholder="${escape(label)}">${escape(value)}</${tag}>`
    : escape(value);
  const block = (path, value, label) => editable ? field(path,value,label,true,'div') : paragraphs(value);
  const button = (attrs, label) => `<button type="button" class="edit-only" ${attrs} aria-label="${escape(label)}" title="${escape(label)}">${escape(label)}</button>`;
  const details = (type,path,label) => editable ? button(`data-details="${type}" data-path="${path}"`,label) : '';
  const list = (path,value,label) => editable ? `<ul>${String(value).split('\n').map((line,i)=>field(path,line,label,false,'li',` data-line="${i}"`)).join('')}</ul>${button(`data-action="bullet-add" data-path="${path}"`,'+ Bullet')}` : bullets(value);
  const add = key => editable ? button(`data-action="add" data-key="${key}"`, '+ Add entry') : '';
  const entry = (key,index,heading,body,period='') => {
    const path=`${key}.${index}`;
    const controls=editable ? `<div class="edit-controls">${['up','down','remove'].map(action=>button(`data-action="${action}" data-key="${key}" data-index="${index}"`,action)).join('')}</div>` : '';
    return `<article${editable ? ` data-entry="${path}"` : ''}>${controls}${period || (editable && key !== 'publications') ? `<p class="date">${escape(period)}${details('dates',path,'Edit dates')}</p>` : ''}<h3>${heading}</h3>${body}</article>`;
  };
  const experienceHTML = experiences.map((e,i) => entry('experiences',i,
    editable ? `${field(`experiences.${i}.role`,e.role,'Role')} – ${field(`experiences.${i}.company`,e.company,'Company')}` : escape([e.role,e.company].filter(Boolean).join(' – ')),
    block(`experiences.${i}.industries`,e.industries,'Industries') + list(`experiences.${i}.activities`,e.activities,'Activity'),
    [e.startDate ? date(e.startDate) : '',date(e.endDate)].filter(Boolean).join(' – '))).join('') + add('experiences');
  const educationHTML = education.map((e,i) => entry('education',i,field(`education.${i}.title`,e.title,'Qualification'),
    block(`education.${i}.school`,e.school,'School')+list(`education.${i}.details`,e.details,'Education detail'),
    [e.startDate ? date(e.startDate) : '',e.endDate ? date(e.endDate) : ''].filter(Boolean).join(' – '))).join('') + add('education');
  const extras = (entries,key) => entries.map((e,i)=>entry(key,i,field(`${key}.${i}.title`,e.title,'Title'),
    block(`${key}.${i}.description`,e.description,'Description') + (editable ? field(`${key}.${i}.url`,e.url,'URL')+details('link',`${key}.${i}`,'Edit link') : link(e.url)), e.date ? date(e.date) : '')).join('') + add(key);
  const section = (key,body,pageBreak=false) => body || editable ? `<section${pageBreak ? ' class="new-page"' : ''}${editable ? ` data-section="${key}"` : ''}><h2>${escape(t[key])}</h2><div class="section-body">${body}</div></section>` : '';
  const fullName = `${profile.name} ${profile.surname}`.trim();
  const bodies = {
    introduction: block('profile.presentation', profile.presentation, t.introduction),
    skills: block('profile.skills',profile.skills,t.skills) + (profile.languages || editable ? `<p><strong>${t.languages}:</strong> ${field('profile.languages',profile.languages,t.languages)}</p>` : ''),
    experience: experienceHTML, education: educationHTML,
    publications: extras(publications,'publications'), research: extras(research,'research'), additional: block('profile.additionalInfo',profile.additionalInfo,t.additional),
  };
  const visible = sectionOrder.filter(key => !hiddenSections.includes(key) && (editable || bodies[key]));
  const content = visible.map((key, index) => section(key, bodies[key], key === 'education' && index > 0 && visible.slice(0,index).includes('experience'))).join('');
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(fullName)} – CV (${locale})</title><style>
  ${fontRules}
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #161616; font: 9pt/1.4 "DM Sans", Arial, sans-serif; font-variant-ligatures: none; background: white; }
  main { max-width: 186mm; margin: auto; }
  header { margin-bottom: 10mm; break-inside: avoid; }
  h1 { font-size: 15pt; margin: 0; } .role { color: #4234ff; font-size: 12pt; margin: 0 0 3mm; }
  .multiline { white-space: pre-wrap; } .multiline p { margin: 0; }
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
  ${editable ? `
  [contenteditable] { outline: 1px solid transparent; border-radius: 2px; min-width: 1em; white-space: pre-wrap; }
  span[contenteditable] { display: inline-block; max-width: 100%; overflow-wrap: anywhere; }
  [contenteditable]:hover { outline-color: #c8c5ef; }
  [contenteditable]:focus { outline-color: #4234ff; background: #f7f6ff; }
  [contenteditable]:empty::before { content: attr(data-placeholder); color: #9995ad; pointer-events: none; }
  div[contenteditable]:empty, li[contenteditable]:empty { min-height: 1.4em; }
  article { position: relative; }
  .edit-only { font: 7pt "DM Sans",sans-serif; color: #625a91; border: 1px solid #dedbe9; border-radius: 3px; background: #faf9ff; cursor: pointer; padding: 1px 4px; }
  .edit-controls { position: absolute; right: 0; top: -15px; opacity: 0; }
  article:hover > .edit-controls, article:focus-within > .edit-controls { opacity: 1; }
  .edit-controls:focus-within { opacity: 1; }
  .date { position: relative; }
  .edit-only { opacity: 0; pointer-events: none; }
  .edit-only:focus, .date:hover .edit-only, .date:focus-within .edit-only { opacity: 1; pointer-events: auto; }
  .date .edit-only { position: absolute; right: 0; top: 0; }
  .edit-controls { pointer-events: none; }
  article:hover > .edit-controls, article:focus-within > .edit-controls { pointer-events: auto; }
  .edit-controls .edit-only { opacity: 1; pointer-events: inherit; }
  [data-action="bullet-add"] { position: absolute; right: 0; bottom: -12px; }
  article:hover > [data-action="bullet-add"], article:focus-within > [data-action="bullet-add"] { opacity: 1; pointer-events: auto; }
  .section-body { position: relative; }
  .section-body > [data-action="add"] { position: absolute; bottom: -10px; left: 0; }
  .section-body:hover > [data-action="add"], .section-body:focus-within > [data-action="add"] { opacity: 1; pointer-events: auto; }
  .section-body:has(> [data-action="add"]:only-child) { min-height: 1.4em; }
  .contact > .edit-only { display: none; }
  .contact:hover > .edit-only, .contact:focus-within > .edit-only { display: inline; opacity: 1; pointer-events: auto; }
  .section-body > article > [data-details="link"] { position: absolute; right: 0; bottom: 0; }
  .section-body > article:hover > [data-details="link"], .section-body > article:focus-within > [data-details="link"] { opacity: 1; pointer-events: auto; }
  @media print { .edit-only,.edit-controls { display: none !important; } [contenteditable]:empty::before { content: none; } [contenteditable] { outline: none !important; background: none !important; } }
  ` : ''}
  </style></head><body><main><header><h1>${editable ? `${field("profile.name",profile.name,"Name")} ${field("profile.surname",profile.surname,"Surname")}` : escape(fullName)}</h1><p class="role">${field("profile.jobPosition",profile.jobPosition,"Job position")}</p><div class="contact">${block("profile.email",profile.email,"Email")}${block("profile.phone",profile.phone,"Phone")}${block("profile.location",profile.location,"Location")}${editable ? ["linkedin","github"].map(key=>field(`profile.${key}.label`,profile[key].label,key === "linkedin" ? "LinkedIn" : "GitHub")+details("link",`profile.${key}`,"Edit link")).join(" ") : link(profile.linkedin?.url, profile.linkedin?.label || "LinkedIn")+" "+link(profile.github?.url, profile.github?.label || "GitHub")}</div></header>
  ${content}
  </main></body></html>`;
}
