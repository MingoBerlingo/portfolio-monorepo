import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCV} from '../src/model.ts';
import {renderCV} from '../src/render.ts';
const document=()=>normalizeCV({profile:{name:'Ada'},experiences:[{role:'Designer',company:'Studio',activities:'First\n\nThird'}],education:[{}],publications:[{}],research:[{}]},'en');
test('editable canvas exposes canonical fields, stable bullet indexes and contextual controls',()=>{
 const html=renderCV(document(),'en',{editable:true});
 for(const path of ['profile.name','profile.surname','profile.jobPosition','profile.presentation','profile.skills','profile.languages','profile.email','profile.phone','profile.location','profile.portfolio.label','profile.linkedin.label','experiences.0.company','experiences.0.role','education.0.title','education.0.school','publications.0.description']) assert.ok(html.includes(`data-field="${path}"`),path);
 assert.match(html,/contenteditable="plaintext-only" role="textbox" aria-label=/);
 assert.match(html,/data-field="experiences.0.activities"[^>]*data-line="1"[^>]*><\/li>/);
 assert.match(html,/data-action="bullet-add" data-path="experiences.0.activities"/);
 assert.match(html,/data-details="dates" data-path="education.0"/);
 assert.match(html,/data-details="link" data-path="profile.linkedin"/);
 assert.match(html,/data-entry="research.0"/);
 for(const action of ['up','down','remove'])assert.ok(html.includes(`data-action="${action}" data-key="research" data-index="0"`));
 assert.match(html,/data-multiline="true"/);
 assert.doesNotMatch(html,/data-field="research.0.project"/);
});
test('empty visible sections and collections remain reachable while hidden sections stay absent',()=>{
 const doc=normalizeCV({},'it');doc.hiddenSections=['research'];const html=renderCV(doc,'it',{editable:true});
 assert.match(html,/data-section="introduction"/);assert.match(html,/data-section="experience"/);
 assert.match(html,/data-action="add" data-key="experiences"/);assert.doesNotMatch(html,/data-section="research"/);
 assert.match(html,/data-placeholder=/);
});
test('print output has no editable controls or placeholders and uses local DM Sans',()=>{
 const html=renderCV(document());assert.doesNotMatch(html,/contenteditable|data-field=|data-placeholder=|<button/);
 assert.match(html,/@font-face/);assert.match(html,/DM Sans/);assert.match(html,/\/fonts\/dm-sans.woff2/);
 assert.match(renderCV(document(),'en',{fontURL:'data:font/woff2;base64,AA=='}),/data:font\/woff2;base64,AA==/);
});
test('editable content and custom font URLs cannot inject markup or scripts',()=>{
 const doc=document();doc.profile.name='<script>bad()</script>';doc.experiences[0].activities='<img src=x onerror=bad>';
 const html=renderCV(doc,'en',{editable:true,fontURL:'bad"</style><script>bad()</script>'});
 assert.doesNotMatch(html,/<script|<img|<\/style><script/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);
});

test('annotated layout labels contacts, sectors and competency lines without legacy additional section',()=>{
 const doc=document();Object.assign(doc.profile,{email:'ada@example.test',phone:'123',location:'Rome',skills:'Design: Systems\nTools: Figma',languages:'English',additionalInfo:'Legacy secret',linkedin:{label:'',url:'https://linkedin.com/in/ada'},portfolio:{label:'',url:'https://ada.test'}});doc.experiences[0].industries='Web\nPrint';
 for(const editable of [false,true]) {
  const html=renderCV(doc,'en',{editable});
  assert.match(html,/Sectors:<\/span> /);assert.match(html,editable ? /<strong><span[^>]*data-field="profile.email"/ : /<strong>ada@example.test<\/strong>/);assert.match(html,/Web, Print/);
  for(const label of ['Mail','Tel','Location','LinkedIn','Portfolio'])assert.ok(html.includes(`${label}:</span>`));
  assert.match(html,/linkedin.com\/in\/ada/);assert.match(html,/ada.test/);
  assert.match(html,/<strong>Design:<\/strong> Systems/);
  assert.ok(html.indexOf('<strong>Languages:</strong>') < html.indexOf('<strong>Design:</strong>'));
  assert.doesNotMatch(html,/Legacy secret|data-section="additional"|data-field="profile.additionalInfo"/);
  if(editable)assert.match(html,/data-section-drag="skills"/);
 }
 assert.match(renderCV(doc,'it'),/Settore:<\/span>/);assert.match(renderCV(doc,'it'),/Località:<\/span>/);
});

test('edited profile link labels remain visible in canvas and print',()=>{
 const doc=document();doc.profile.portfolio={label:'My selected work',url:'https://ada.test'};
 for(const editable of [true,false])assert.match(renderCV(doc,'en',{editable}),/>My selected work</);
});

test('editable skills keep replacement tokens literal and escape markup',()=>{
 const doc=document();doc.profile.skills="Tools: $& $` $' <script>bad()</script>";
 const html=renderCV(doc,'en',{editable:true});
 assert.match(html,/<strong>Tools:<\/strong> \$&amp; \$` \$&#39; &lt;script&gt;bad\(\)&lt;\/script&gt;/);
 assert.doesNotMatch(html,/<script>/);
});

test('contact metadata controls order and deletion without erasing values',()=>{
 const doc=document();Object.assign(doc.profile,{email:'retain@example.test',phone:'12345',location:'Rome',github:{label:'GitHub name',url:'https://github.com/ada'}});
 doc.contactOrder=['github','location','phone','email','linkedin','portfolio'];doc.deletedContacts=['phone'];
 for(const editable of [false,true]){
  const html=renderCV(doc,'en',{editable});
  assert.ok(html.indexOf('GitHub:</span>')<html.indexOf('Location:</span>'));
  assert.ok(html.indexOf('Location:</span>')<html.indexOf('Mail:</span>'));
  assert.doesNotMatch(html,/12345|data-field="profile.phone"/);
 }
 assert.equal(doc.profile.phone,'12345');
});
test('deleted and hidden sections stay absent from print and editable rendering',()=>{
 const doc=document();doc.profile.presentation='Deleted introduction';doc.hiddenSections=['skills'];doc.deletedSections=['introduction'];
 for(const editable of [false,true])assert.doesNotMatch(renderCV(doc,'en',{editable}),/Deleted introduction|data-section="introduction"|data-section="skills"/);
 assert.equal(doc.profile.presentation,'Deleted introduction');
});
test('empty contact values remain omitted from print',()=>{
 const html=renderCV(normalizeCV({}));
 for(const label of ['Mail','Tel','Location','LinkedIn','Portfolio','GitHub'])assert.ok(!html.includes(label+':</span>'));
});
