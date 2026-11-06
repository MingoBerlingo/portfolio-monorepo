import { normalizeCV, validateDocument, isDirty } from '/modules/model.mjs';
import { listVersions, saveVersion, deleteVersion } from '/modules/history.mjs';
import { renderCV } from '/modules/render.mjs';
import { applyTextEdit, addBullet, splitBullet, mergeBullet, addEntry, removeEntry, moveEntry } from '/modules/inline-model.mjs';

const $=id=>document.getElementById(id);
const canvas=$('canvas').attachShadow({mode:'open'});
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const titles={profile:'Profile & contact',introduction:'Introduction',skills:'Skills & languages',experience:'Experience',education:'Education',publications:'Publications',research:'Research',additional:'Additional info'};
const collections={experience:'experiences',education:'education',publications:'publications',research:'research'};
const state={doc:null,baseline:null,section:'profile',name:'',loading:false,printing:false,rendering:false,details:null,render:0};
let noticeTimer,canvasObserver,scale=1;
const dirty=()=>Boolean(state.doc&&isDirty(state.doc,state.baseline));
function notify(message,error=false){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').hidden=!message;if(message&&!error)noticeTimer=setTimeout(()=>$('notice').hidden=true,2200);}
function guard(){return !dirty()||confirm('You have unsaved changes. Discard them and continue? Save a named version first to keep this copy.');}
function lockCanvas(){
 const doc=canvas;if(!doc)return;
 for(const field of doc.querySelectorAll('[data-field]')){const value=state.loading||state.rendering?'false':'plaintext-only';if(field.getAttribute('contenteditable')!==value)field.setAttribute('contenteditable',value);}
 for(const b of doc.querySelectorAll('button')){const i=Number(b.dataset.index),list=state.doc?.[b.dataset.key];b.disabled=state.loading||state.rendering||(b.dataset.action==='up'&&i===0)||(b.dataset.action==='down'&&i===list?.length-1);}
 $('canvas-pane').classList.toggle('loading',state.loading||state.rendering);
}
function updateStatus(){
 $('version-status').textContent=state.loading?'Loading…':!state.doc?'No CV loaded':dirty()?'Unsaved changes':state.name||'CMS copy';
 $('dirty-dot').classList.toggle('dirty',dirty());
 $('save').disabled=!state.doc||state.loading;$('download').disabled=!state.doc||state.loading||state.printing;
 $('reload').disabled=state.loading;$('locale').disabled=state.loading;$('history').disabled=state.loading;
 const index=state.doc?.sectionOrder.indexOf(state.section);
 $('section-controls').querySelectorAll('input,button').forEach(c=>{c.disabled=state.loading||(c.dataset.order==='up'&&index===0)||(c.dataset.order==='down'&&index===state.doc?.sectionOrder.length-1);});
 lockCanvas();
}
function historyCount(){try{$('history-count').textContent=listVersions().length;}catch{$('history-count').textContent='!';}}
function renderNavigation(){
 const keys=['profile',...state.doc.sectionOrder];
 $('sections').innerHTML=keys.map((key,i)=>`<button type="button" data-section="${key}" class="${state.section===key?'active ':''}${state.doc.hiddenSections.includes(key)?'omitted':''}" ${state.section===key?'aria-current="page"':''}><span class="nav-number">${String(i+1).padStart(2,'0')}</span>${titles[key]}</button>`).join('');
 $('section-select').innerHTML=keys.map(key=>`<option value="${key}" ${state.section===key?'selected':''}>${titles[key]}${state.doc.hiddenSections.includes(key)?' (hidden)':''}</option>`).join('');
 const key=collections[state.section];
 $('section-controls').innerHTML=state.section==='profile'?'':`<label><input id="section-visible" type="checkbox" ${state.doc.hiddenSections.includes(state.section)?'':'checked'}> Include in PDF</label><div class="section-order"><button class="button" type="button" data-order="up" aria-label="Move section up">↑ Up</button><button class="button" type="button" data-order="down" aria-label="Move section down">↓ Down</button></div>${key?`<button type="button" class="add-entry" data-action="add" data-key="${key}">+ Add entry</button>`:''}`;
 updateStatus();
}
function selectSection(section,scroll=false){
 if(!Object.hasOwn(titles,section)||!state.doc)return;state.section=section;renderNavigation();
 if(scroll){const frame=$('canvas');const doc=canvas;const target=section==='profile'?doc?.querySelector('main>header'):doc?.querySelector(`[data-section="${section}"]`);if(target)window.scrollTo({top:window.scrollY+frame.getBoundingClientRect().top+target.getBoundingClientRect().top-frame.getBoundingClientRect().top-84,behavior:'smooth'});}
}
function resizeCanvas(){
 const frame=$('canvas'),doc=canvas,main=doc?.querySelector('main');if(!main||$('workspace').hidden)return;
 const width=$('canvas-pane').clientWidth;scale=$('zoom').value==='fit'?Math.min(1,width/834):Number($('zoom').value);
 const height=Math.ceil(main.offsetHeight+40);
 frame.style.height=`${height}px`;frame.style.transform=`scale(${scale})`;
 $('canvas-wrap').style.width=`${834*scale}px`;$('canvas-wrap').style.height=`${height*scale}px`;
}
function focusField(path,line,offset=0){
 const doc=canvas;const selector=`[data-field="${path}"]${line===undefined?'':`[data-line="${line}"]`}`;const node=doc?.querySelector(selector);if(!node)return;
 node.focus({preventScroll:true});
 const selection=doc.getSelection?.()||document.getSelection(),range=document.createRange();const walker=document.createTreeWalker(node,4);let text=walker.nextNode(),remaining=offset;
 while(text&&remaining>text.length){remaining-=text.length;text=walker.nextNode();}
 if(text){range.setStart(text,Math.min(remaining,text.length));range.collapse(true);}else{range.selectNodeContents(node);range.collapse(false);}
 selection.removeAllRanges();selection.addRange(range);
}
function renderCanvas(focus){
 if(!state.doc)return;state.rendering=true;lockCanvas();canvasObserver?.disconnect();
 const html=new DOMParser().parseFromString(renderCV(state.doc,state.doc.locale,{editable:true}),'text/html');
 const styles=html.querySelector('style').textContent.replace(/(^|\s)body(?=\s*\{)/g,'$1.cv-body');
 canvas.innerHTML=`<style>:host { display:block; width:834px; } ${styles}</style><div class="cv-body">${html.body.innerHTML}</div>`;
 state.rendering=false;lockCanvas();resizeCanvas();
 canvasObserver=new ResizeObserver(resizeCanvas);canvasObserver.observe(canvas.querySelector('main'));
 if(focus)focusField(focus.path,focus.line,focus.offset);
 document.fonts.ready.then(resizeCanvas);
}
function adopt(doc,name=''){
 validateDocument(doc);state.doc=structuredClone(doc);state.baseline=structuredClone(doc);state.name=name;$('locale').value=doc.locale;
 $('empty').hidden=true;$('workspace').hidden=false;renderNavigation();renderCanvas();updateStatus();
}
function edited(){updateStatus();resizeCanvas();}
function fieldText(node){return node.dataset.multiline==='true'?node.innerText.replace(/\r\n?/g,'\n'):node.textContent.replace(/[\r\n]+/g,' ');}
function setFromNode(node){state.doc=applyTextEdit(state.doc,node.dataset.field,fieldText(node),node.hasAttribute('data-line')?Number(node.dataset.line):undefined);edited();}
function caretOffset(node){const selection=node.getRootNode().getSelection?.()||node.ownerDocument.getSelection();if(!selection.rangeCount)return 0;const range=selection.getRangeAt(0).cloneRange();range.selectNodeContents(node);range.setEnd(selection.anchorNode,selection.anchorOffset);return range.toString().length;}
function renderBulletList(path,line,offset=0){
 const doc=canvas;const node=doc.querySelector(`[data-field="${path}"][data-line]`);if(!node)return;
 const label=node.getAttribute('aria-label')||'Bullet';const lines=path.split('.').reduce((o,k)=>o[k],state.doc).split('\n');
 node.closest('ul').innerHTML=lines.map((text,i)=>`<li contenteditable="plaintext-only" role="textbox" aria-label="${escape(label)}" data-field="${path}" data-line="${i}" data-placeholder="${escape(label)}">${escape(text)}</li>`).join('');
 focusField(path,line,offset);resizeCanvas();
}
function bindCanvas(doc){
 doc.addEventListener('input',event=>{const node=event.target.closest('[data-field]');if(!node||state.loading||state.rendering)return;try{setFromNode(node);}catch(error){notify(error.message,true);renderCanvas();}});
 doc.addEventListener('paste',event=>{const node=event.target.closest('[data-field]');if(!node)return;event.preventDefault();if(state.loading||state.rendering)return;let text=event.clipboardData.getData('text/plain');if(node.dataset.multiline!=='true')text=text.replace(/[\r\n]+/g,' ');document.execCommand('insertText',false,text);});
 doc.addEventListener('focusin',event=>{const node=event.target.closest('[data-field]');if(node&&!state.rendering)selectSection(node.closest('section')?.dataset.section||'profile');});
 doc.addEventListener('keydown',event=>{
  const node=event.target.closest('[data-field]');if(!node)return;if(state.loading||state.rendering){event.preventDefault();return;}
  if(event.key==='Enter'&&node.hasAttribute('data-line')){
   event.preventDefault();if(!(doc.getSelection?.()||document.getSelection()).isCollapsed)document.execCommand('delete',false);setFromNode(node);const line=Number(node.dataset.line),offset=caretOffset(node);state.doc=splitBullet(state.doc,node.dataset.field,line,offset);edited();renderBulletList(node.dataset.field,line+1,0);
  }else if(event.key==='Backspace'&&node.hasAttribute('data-line')&&Number(node.dataset.line)>0&&(doc.getSelection?.()||document.getSelection()).isCollapsed&&caretOffset(node)===0){
   event.preventDefault();setFromNode(node);const line=Number(node.dataset.line);const text=node.dataset.field.split('.').reduce((o,k)=>o[k],state.doc).split('\n');const offset=text[line-1].length;state.doc=mergeBullet(state.doc,node.dataset.field,line);edited();renderBulletList(node.dataset.field,line-1,offset);
  }else if(event.key==='Enter'&&node.dataset.multiline!=='true'){event.preventDefault();node.blur();}
 });
 doc.addEventListener('click',event=>{
  if(event.target.closest('a'))event.preventDefault();
  const details=event.target.closest('[data-details]'),button=event.target.closest('[data-action]');
  if(state.loading||state.rendering)return;if(details){openDetails(details.dataset.details,details.dataset.path);return;}
  if(button)handleAction(button.dataset);
 });
}
function handleAction({action,key,index,path}){
 if(state.loading)return;
 try{
  let focus;
  if(action==='add'){const i=state.doc[key].length;state.doc=addEntry(state.doc,key);focus={path:`${key}.${i}.${key==='experiences'?'role':'title'}`,offset:0};}
  if(action==='remove'){if(!confirm('Remove this entry from this working copy?'))return;state.doc=removeEntry(state.doc,key,Number(index));}
  if(action==='up'||action==='down'){const i=Number(index),direction=action==='up'?-1:1;if(i+direction<0||i+direction>=state.doc[key].length)return;state.doc=moveEntry(state.doc,key,i,direction);}
  if(action==='bullet-add'){const count=path.split('.').reduce((o,k)=>o[k],state.doc).split('\n').length;state.doc=addBullet(state.doc,path);edited();renderBulletList(path,count,0);return;}
  edited();renderCanvas(focus);
 }catch(error){notify(error.message,true);}
}
function openDetails(type,path){
 const value=path.split('.').reduce((o,k)=>o[k],state.doc);if(!value)return;state.details={type,path};$('details-error').hidden=true;
 const input=(key,label,kind='text',hint='')=>`<label for="detail-${key}">${label}</label><input id="detail-${key}" name="${key}" type="${kind}" value="${escape(kind==='date'?value[key]?.slice(0,10):value[key])}">${hint?`<p class="field-hint">${hint}</p>`:''}`;
 $('details-title').textContent=type==='dates'?'Dates':'Link';
 $('details-fields').innerHTML=type==='dates'?(path.startsWith('research.')?input('date','Date','date'):input('startDate','Start date','date')+input('endDate','End date','date',path.startsWith('experiences.')?'Leave empty for a current role.':'')):input('url','URL','url')+(path.startsWith('profile.')?input('label','Link text'):'');
 $('details-dialog').showModal();
}
$('details-form').addEventListener('submit',event=>{
 event.preventDefault();if(state.loading)return;
 try{
  const {path}=state.details;let next=state.doc;
  for(const input of $('details-fields').querySelectorAll('input')){if(input.name==='url'&&input.value&&!/^https?:\/\//i.test(input.value))throw Error('Use an http or https URL.');next=applyTextEdit(next,`${path}.${input.name}`,input.value);}
  state.doc=next;$('details-dialog').close();edited();renderCanvas();
 }catch(error){$('details-error').textContent=error.message;$('details-error').hidden=false;}
});
$('sections').addEventListener('click',event=>{const b=event.target.closest('[data-section]');if(b)selectSection(b.dataset.section,true);});
$('section-select').addEventListener('change',event=>selectSection(event.target.value,true));
$('section-controls').addEventListener('change',event=>{if(state.loading||event.target.id!=='section-visible')return;state.doc.hiddenSections=event.target.checked?state.doc.hiddenSections.filter(k=>k!==state.section):[...state.doc.hiddenSections,state.section];renderNavigation();edited();renderCanvas();});
$('section-controls').addEventListener('click',event=>{if(state.loading)return;const b=event.target.closest('[data-order]'),action=event.target.closest('[data-action]');if(action){handleAction(action.dataset);return;}if(!b)return;const list=state.doc.sectionOrder,i=list.indexOf(state.section),j=b.dataset.order==='up'?i-1:i+1;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];renderNavigation();edited();renderCanvas();});
async function loadCMS(locale){
 if(state.loading||!guard()){if(state.doc)$('locale').value=state.doc.locale;return;}
 state.loading=true;updateStatus();notify('');
 try{const response=await fetch(`/api/cv?locale=${locale}`);const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load CMS content.');adopt(normalizeCV(data,locale));}
 catch(error){notify(error.message,true);if(state.doc)$('locale').value=state.doc.locale;}
 finally{state.loading=false;updateStatus();}
}
$('reload').addEventListener('click',()=>loadCMS($('locale').value));$('empty-load').addEventListener('click',()=>loadCMS($('locale').value));$('locale').addEventListener('change',()=>loadCMS($('locale').value));
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
    if(load) {if(!guard())return;const version=listVersions().find(v=>v.id===load.dataset.load);if(!version)throw Error('Version is no longer available.');adopt(version.document,version.name);$('history-dialog').close();notify(`Loaded “${version.name}”. `);}
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
    notify('PDF downloaded.');
  } catch(error) {notify(error.message,true);}
  finally {state.printing=false;updateStatus();}
});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
window.addEventListener('storage',()=>{historyCount();if($('history-dialog').open)showHistory();});

$('zoom').addEventListener('change',resizeCanvas);
new ResizeObserver(resizeCanvas).observe($('canvas-pane'));
bindCanvas(canvas);historyCount();updateStatus();loadCMS('en');
