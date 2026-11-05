import { normalizeCV, validateDocument, isDirty } from '/modules/model.mjs';
import { listVersions, saveVersion, deleteVersion } from '/modules/history.mjs';
import { renderCV } from '/modules/render.mjs';

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const sections = [
  ['profile', 'Profile & contact'], ['introduction', 'Introduction'], ['skills', 'Skills & languages'], ['experience', 'Experience'], ['education', 'Education'], ['publications', 'Publications'], ['research', 'Research'], ['additional', 'Additional info'],
];
const field = (path, label, type = 'text', hint = '', rows = 4) => {
  const value = path.split('.').reduce((obj, key) => obj?.[key], state.doc);
  const id = `edit-${path.replaceAll('.', '-')}`;
  return `<div class="field"><label for="${id}">${label}</label>${type === 'textarea' ? `<textarea id="${id}" data-path="${path}" rows="${rows}">${escape(value)}</textarea>` : `<input id="${id}" data-path="${path}" type="${type}" value="${escape(type === 'date' ? value?.slice(0,10) : value)}">`}${hint ? `<p class="field-hint">${hint}</p>` : ''}</div>`;
};
const row = (...fields) => `<div class="field-row">${fields.join('')}</div>`;
const state = { doc: null, baseline: null, section: 'profile', name: '', token: '', loading: false, printing: false, loginAttempt: 0, loginController: null };
let previewTimer;
function dirty() { return Boolean(state.doc && isDirty(state.doc, state.baseline)); }
function notify(message, error = false) { $('notice').textContent = message; $('notice').classList.toggle('error', error); $('notice').hidden = !message; }
function guard() { return !dirty() || confirm('You have unsaved changes. Discard them and continue? Save a named version first to keep this copy.'); }
function updateStatus() {
  const changed = dirty();
  $('version-status').textContent = state.loading ? 'Loading from CMS…' : state.doc ? changed ? 'Unsaved changes' : state.name ? state.name : 'Loaded from CMS · not saved' : 'No version loaded';
  $('dirty-dot').classList.toggle('dirty', changed);
  $('save').disabled = !state.doc || state.loading;
  $('download').disabled = !state.doc || state.loading || state.printing;
  $('reload').disabled = state.loading;
  $('locale').disabled = state.loading;
  $('editor-fields').disabled = state.loading;
  $('section-controls').querySelectorAll('input,button').forEach(control=>control.disabled=state.loading);
  $('connect').disabled = state.loading;
  $('history').disabled = state.loading;
}
function historyCount() { try { $('history-count').textContent = listVersions().length; } catch { $('history-count').textContent = '!'; } }
function preview() {
  clearTimeout(previewTimer);
  try { $('preview').srcdoc = renderCV(state.doc, state.doc.locale); } catch (error) { notify(error.message, true); }
}
function changed() { updateStatus(); clearTimeout(previewTimer); previewTimer = setTimeout(preview, 160); }
function adopt(doc, name = '', saved = false) {
  validateDocument(doc);
  state.doc = structuredClone(doc);
  state.baseline = structuredClone(doc);
  state.name = name;
  $('locale').value = doc.locale;
  $('empty').hidden = true;
  $('workspace').hidden = false;
  renderNavigation(); renderEditor(); updateStatus(); preview(); sizePreview();
}
function renderNavigation() {
  $('sections').innerHTML = sections.map(([key, title], i) => `<button type="button" data-section="${key}" class="${state.section === key ? 'active' : ''}" ${state.section === key ? 'aria-current="page"' : ''}><span class="nav-number">${String(i+1).padStart(2,'0')}</span>${title}</button>`).join('');
}
function renderEditor() {
  if (!state.doc) return;
  const section = state.section;
  const index = sections.findIndex(([key]) => key === section);
  $('section-title').textContent = sections[index][1];
  $('section-index').textContent = `${String(index+1).padStart(2,'0')} / YOUR CURRICULUM`;
  let html = '';
  if (section === 'profile') html = row(field('profile.name','First name'), field('profile.surname','Last name')) + field('profile.jobPosition','Professional title') + row(field('profile.email','Email','email'),field('profile.phone','Phone','tel')) + field('profile.location','Location') + field('profile.linkedin.url','LinkedIn URL','url') + field('profile.linkedin.label','LinkedIn label') + field('profile.github.url','GitHub URL','url') + field('profile.github.label','GitHub label');
  if (section === 'introduction') html = field('profile.presentation', 'Introduction', 'textarea', 'Focus on the experience and strengths most relevant to this opportunity.', 12);
  if (section === 'skills') html = field('profile.skills','Skills & competencies','textarea','Separate related skills into short lines.',7) + field('profile.languages','Languages','textarea','Include your level for each language.',4);
  if (section === 'additional') html = field('profile.additionalInfo','Additional information','textarea','Optional details for this version.',9);
  const key = section === 'experience' ? 'experiences' : section;
  if (['experiences','education','publications','research'].includes(key)) {
    html = state.doc[key].map((entry, i) => {
      const path = `${key}.${i}`;
      let fields = '';
      if (key === 'experiences') fields = field(`${path}.company`,'Company') + field(`${path}.role`,'Role') + row(field(`${path}.startDate`,'Start date','date'),field(`${path}.endDate`,'End date','date','Leave empty for a current position.')) + field(`${path}.industries`,'Industries','textarea','One industry per line.',2) + field(`${path}.activities`,'Activities & achievements','textarea','One bullet per line. Lead with relevant results.',6);
      if (key === 'education') fields = field(`${path}.title`,'Qualification') + field(`${path}.school`,'School / institution') + row(field(`${path}.startDate`,'Start date','date'),field(`${path}.endDate`,'End date','date')) + field(`${path}.details`,'Details','textarea','One bullet per line.',4);
      if (['publications','research'].includes(key)) fields = field(`${path}.title`,'Title') + (key === 'research' ? field(`${path}.date`,'Date','date') : '') + field(`${path}.description`,'Description','textarea','Keep it concise and relevant.',4) + field(`${path}.url`,'Link','url');
      return `<article class="entry-card"><div class="entry-top"><h3>${sections[index][1]} ${i+1}</h3><div class="entry-actions"><button type="button" class="icon-button" data-action="up" data-key="${key}" data-index="${i}" aria-label="Move entry ${i+1} up" ${i===0?'disabled':''}>↑</button><button type="button" class="icon-button" data-action="down" data-key="${key}" data-index="${i}" aria-label="Move entry ${i+1} down" ${i===state.doc[key].length-1?'disabled':''}>↓</button><button type="button" class="icon-button danger" data-action="remove" data-key="${key}" data-index="${i}" aria-label="Remove entry ${i+1}">×</button></div></div>${fields}</article>`;
    }).join('') + `<button type="button" class="add-entry" data-action="add" data-key="${key}">+ Add ${key === 'experiences' ? 'experience' : key === 'publications' ? 'publication' : key === 'research' ? 'research project' : 'education'}</button>`;
  }
  $('editor-fields').innerHTML = html;
  $('section-controls').innerHTML = section === 'profile' ? '<p>Contact details are included at the top of your CV.</p>' : `<label><input id="section-visible" type="checkbox" ${state.doc.hiddenSections.includes(section)?'':'checked'}> Include this section in the PDF</label><div class="section-order"><span>Section order</span><div><button type="button" class="button" data-order="up" ${state.doc.sectionOrder.indexOf(section)===0?'disabled':''}>↑ Move up</button><button type="button" class="button" data-order="down" ${state.doc.sectionOrder.indexOf(section)===state.doc.sectionOrder.length-1?'disabled':''}>↓ Move down</button></div></div>`;
  if(state.loading)$('section-controls').querySelectorAll('input,button').forEach(control=>control.disabled=true);
}
$('sections').addEventListener('click', event => { const b=event.target.closest('[data-section]');if(!b)return;state.section=b.dataset.section;renderNavigation();renderEditor(); });
$('editor-fields').addEventListener('input', event => {
  const path = event.target.dataset.path;
  if (!path || state.loading) return;
  const parts = path.split('.');
  const property = parts.pop();
  const parent = parts.reduce((obj,key)=>obj[key],state.doc);
  parent[property] = event.target.value;
  changed();
});
$('editor-fields').addEventListener('click', event => {
  const b=event.target.closest('[data-action]');if(!b || state.loading)return;
  const {action,key}=b.dataset;const list=state.doc[key];const i=Number(b.dataset.index);
  if(action==='add') {
    const templates={experiences:{company:'',role:'',startDate:'',endDate:'',industries:'',activities:''},education:{title:'',school:'',startDate:'',endDate:'',details:''},publications:{title:'',description:'',url:''},research:{title:'',date:'',description:'',url:'',project:''}};
    if(list.length>=200){notify('This section has reached 200 entries.',true);return;}
    list.push({...templates[key]});
  } else if(action==='remove') { if(!confirm('Remove this entry from this working copy?'))return;list.splice(i,1); }
  else {const j=action==='up'?i-1:i+1;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];}
  renderEditor();changed();
});
$('section-controls').addEventListener('change',event=>{if(state.loading||event.target.id!=='section-visible')return;state.doc.hiddenSections=event.target.checked?state.doc.hiddenSections.filter(k=>k!==state.section):[...state.doc.hiddenSections,state.section];changed();});
$('section-controls').addEventListener('click',event=>{const b=event.target.closest('[data-order]');if(!b||state.loading)return;const list=state.doc.sectionOrder;const i=list.indexOf(state.section),j=b.dataset.order==='up'?i-1:i+1;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];renderEditor();changed();});
async function loadCMS(locale, confirmed = false) {
  if(state.loading || (!confirmed && !guard())) { if(state.doc)$('locale').value=state.doc.locale;return; }
  state.loading=true;updateStatus();notify('Loading your content from the CMS…');
  try {
    const response=await fetch(`/api/cv?locale=${locale}`,{headers:state.token?{Authorization:`JWT ${state.token}`}:{}});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Unable to load CMS content.');
    adopt(normalizeCV(data,locale));
    notify('Loaded from the CMS. Edit your copy, then save a named version to keep it in this browser.');
  } catch(error) {notify(error.message,true);if(state.doc)$('locale').value=state.doc.locale;}
  finally {state.loading=false;updateStatus();}
}
$('reload').addEventListener('click',()=>loadCMS($('locale').value));
$('empty-load').addEventListener('click',()=>loadCMS($('locale').value));
$('locale').addEventListener('change',()=>loadCMS($('locale').value));
$('connect').addEventListener('click',()=>{if(!guard())return;$('connect-error').hidden=true;$('connect-submit').disabled=false;$('connect-dialog').showModal();});
$('connect-form').addEventListener('submit', async event=>{
  event.preventDefault();$('connect-submit').disabled=true;$('connect-error').hidden=true;
  const attempt=++state.loginAttempt;
  const controller=new AbortController();state.loginController=controller;
  try {
    const response=await fetch('/api/login',{signal:controller.signal,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value,password:$('password').value})});
    const data=await response.json();if(attempt!==state.loginAttempt||!$('connect-dialog').open)return;if(!response.ok)throw Error(data.error||'CMS login failed.');
    state.token=data.token;$('password').value='';$('connect-dialog').close();$('connect').textContent='CMS connected';await loadCMS($('locale').value,true);
  } catch(error) {if(attempt===state.loginAttempt && error.name!=='AbortError'){$('connect-error').textContent=error.message;$('connect-error').hidden=false;}}
  finally {if(attempt===state.loginAttempt){$('connect-submit').disabled=false;state.loginController=null;}}
});
function cancelLogin(){state.loginAttempt++;state.loginController?.abort();state.loginController=null;$('password').value='';}
$('connect-dialog').addEventListener('close',cancelLogin);
$('connect-dialog').addEventListener('cancel',cancelLogin);
$('save').addEventListener('click',()=>{$('version-name').value=state.name;$('save-error').hidden=true;$('save-dialog').showModal();$('version-name').focus();});
$('save-form').addEventListener('submit', event=>{
  event.preventDefault();
  try {
    const version=saveVersion(localStorage,state.doc,$('version-name').value);
    state.baseline=structuredClone(version.document);state.name=version.name;
    $('save-dialog').close();updateStatus();historyCount();notify(`“${version.name}” saved in this browser.`);
  } catch(error) {$('save-error').textContent=`Could not save: ${error.message}. Your current edits are still here.`;$('save-error').hidden=false;}
});
function showHistory() {
  try {
    const versions=listVersions();
    $('history-list').innerHTML=versions.length?versions.map(v=>`<article class="history-item"><div><h3>${escape(v.name)}</h3><p>${escape(new Date(v.savedAt).toLocaleString())} · ${v.document.locale==='it'?'🇮🇹 IT':'🇬🇧 EN'}</p></div><div><button class="button" data-load="${escape(v.id)}">Load</button><button class="icon-button danger" data-delete="${escape(v.id)}" aria-label="Delete ${escape(v.name)}">×</button></div></article>`).join(''):'<p class="history-empty">No saved versions yet. Use Save version to keep a named copy for later.</p>';
  } catch(error) {$('history-list').textContent=`History could not be opened: ${error.message}. Existing browser data has not been changed.`;}
}
$('history').addEventListener('click',()=>{showHistory();$('history-dialog').showModal();});
$('history-list').addEventListener('click',event=>{
  const load=event.target.closest('[data-load]'),remove=event.target.closest('[data-delete]');
  try {
    if(load) {if(!guard())return;const version=listVersions().find(v=>v.id===load.dataset.load);if(!version)throw Error('Version is no longer available.');adopt(version.document,version.name,true);$('history-dialog').close();notify(`Loaded “${version.name}”. It includes your saved edits and language.`);}
    if(remove) {if(!confirm('Delete this saved version from this browser? This cannot be undone.'))return;deleteVersion(localStorage,remove.dataset.delete);showHistory();historyCount();}
  } catch(error) {notify(error.message,true);}
});
$('download').addEventListener('click',async()=>{
  if(!state.doc || state.printing)return;
  const snapshot=structuredClone(state.doc);state.printing=true;updateStatus();notify('Preparing your PDF…');
  try {
    const response=await fetch('/api/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});
    if(!response.ok){const error=await response.json();throw Error(error.error||'PDF download failed.');}
    const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`cv-${snapshot.locale}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    notify('PDF downloaded. Use Save version if you also want to keep this editable copy in history.');
  } catch(error) {notify(error.message,true);}
  finally {state.printing=false;updateStatus();}
});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
window.addEventListener('storage',()=>{historyCount();if($('history-dialog').open)showHistory();});
$('preview-toggle').addEventListener('click',()=>{const visible=$('workspace').classList.toggle('show-preview');$('preview-toggle').textContent=visible?'Show editor':'Show preview';sizePreview();});
function sizePreview() {const frame=$('preview');const viewport=frame.parentElement;const width=viewport.clientWidth;if(width){const scale=width/834;frame.style.transform=`scale(${scale})`;frame.style.height=`${viewport.clientHeight/scale}px`;}}
new ResizeObserver(sizePreview).observe($('preview').parentElement);
historyCount();updateStatus();
// Start with the source language. A failed connection keeps history available.
loadCMS('en');
