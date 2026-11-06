/** Plain, bounded CV documents shared by the editor, history and PDF endpoint. */
export const SECTION_ORDER = Object.freeze(['introduction', 'skills', 'experience', 'education', 'publications', 'research', 'additional']);
export const MAX_DOCUMENT_BYTES = 1024 * 1024;
const profileFields = ['name','surname','jobPosition','presentation','email','phone','location','skills','languages','additionalInfo'];
const entries = {experiences:['company','role','startDate','endDate','industries','activities'],education:['title','school','startDate','endDate','details'],publications:['title','description','url'],research:['title','date','description','url','project']};
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const fail = message => { throw new Error(`Invalid CV document: ${message}`); };
const string = v => typeof v === 'string' ? v : '';
function bounded(value) {
 let json;
 try { json = JSON.stringify(value); } catch { fail('must be serializable'); }
 if (!json || new TextEncoder().encode(json).length > MAX_DOCUMENT_BYTES) fail('exceeds 1 MB');
}
function text(value) { if(typeof value !== 'string' || value.length > 50000) fail('text must be a string of at most 50000 characters'); }
function keys(value, allowed) { if(!object(value) || Object.keys(value).some(k=>!allowed.includes(k)) || allowed.some(k=>!Object.hasOwn(value,k))) fail('unexpected or missing fields'); }
export function validateDocument(doc) {
 bounded(doc);
 keys(doc,['locale','profile',...Object.keys(entries),'sectionOrder','hiddenSections']);
 if(!['en','it'].includes(doc.locale)) fail('unsupported locale');
 keys(doc.profile,[...profileFields,'github','linkedin',...(Object.hasOwn(doc.profile,'portfolio')?['portfolio']:[])]);
 profileFields.forEach(k=>text(doc.profile[k]));
 for(const k of ['github','linkedin',...(Object.hasOwn(doc.profile,'portfolio')?['portfolio']:[])]) { keys(doc.profile[k],['label','url']);text(doc.profile[k].label);text(doc.profile[k].url); }
 for(const [key,fields] of Object.entries(entries)) {
  if(!Array.isArray(doc[key]) || doc[key].length>200) fail(`${key} must contain at most 200 entries`);
  for(const entry of doc[key]) { keys(entry,fields);fields.forEach(k=>text(entry[k])); }
 }
 for(const key of ['sectionOrder','hiddenSections']) {
  const list=doc[key];if(!Array.isArray(list) || list.some(k=>!SECTION_ORDER.includes(k)) || new Set(list).size!==list.length) fail(`invalid ${key}`);
 }
 if(doc.sectionOrder.length!==SECTION_ORDER.length) fail('sectionOrder must include all sections');
 return doc;
}
function lexical(value,depth=0) {
 if(depth>40) fail('rich text nesting too deep');
 if(!object(value)) return '';
 if(value.type==='linebreak')return '\n';
 if(typeof value.text==='string')return value.text;
 const children=Array.isArray(value.children)?value.children:[];
 return children.map(child=>lexical(child,depth+1)+( ['paragraph','listitem','heading','quote'].includes(child?.type)?'\n':'')).join('');
}
function multiline(value, field) {
 if(typeof value==='string')return value;
 if(Array.isArray(value)) return value.map(v=>typeof v==='string'?v:string(v?.[field])).join('\n');
 if(object(value))return lexical(value.root ?? value).replace(/\n$/,'');
 return '';
}
const link = value => ({label:string(value?.label),url:string(value?.url)});
export function normalizeCV(source={}, locale=source?.locale ?? 'en') {
 bounded(source);
 if(source?.sectionOrder !== undefined || source?.hiddenSections !== undefined) {
  validateDocument(source);const copy=JSON.parse(JSON.stringify(source));copy.profile.portfolio ??= link();return copy;
 }
 if(!object(source)) fail('source must be an object');
 const p=object(source.profile)?source.profile:{};
 const doc={locale,profile:Object.fromEntries(profileFields.map(k=>[k,k==='presentation'?multiline(p[k]):string(p[k])]))};
 doc.profile.github=link(p.github);doc.profile.linkedin=link(p.linkedin);doc.profile.portfolio=link(p.portfolio);
 for(const [key,fields] of Object.entries(entries)) {
  const sourceEntries=source[key]?.docs ?? source[key] ?? [];
  if(!Array.isArray(sourceEntries) || sourceEntries.length>200)fail(`invalid ${key}`);
  doc[key]=sourceEntries.map(entry=>Object.fromEntries(fields.map(k=>[k,
   ['industries','activities','details'].includes(k)?multiline(entry?.[k],k==='industries'?'industry':'activity'):
   k==='project' && object(entry?.[k])?string(entry[k].title):string(entry?.[k])])));
 }
 doc.sectionOrder=[...SECTION_ORDER];doc.hiddenSections=[];
 return validateDocument(doc);
}
function stable(value) {
 if(Array.isArray(value))return value.map(stable);
 if(object(value))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
 return value;
}
export function fingerprint(document) { validateDocument(document);return JSON.stringify(stable(document)); }
export function isDirty(current,baseline) { return baseline == null || fingerprint(current)!==fingerprint(baseline); }
