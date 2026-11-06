import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCV} from '../src/model.mjs';
import {renderCV} from '../src/render.mjs';
const document=()=>normalizeCV({profile:{name:'Ada'},experiences:[{role:'Designer',company:'Studio',activities:'First\n\nThird'}],education:[{}],publications:[{}],research:[{}]},'en');
test('editable canvas exposes canonical fields, stable bullet indexes and contextual controls',()=>{
 const html=renderCV(document(),'en',{editable:true});
 for(const path of ['profile.name','profile.surname','profile.jobPosition','profile.presentation','profile.skills','profile.languages','profile.additionalInfo','profile.email','profile.phone','profile.location','profile.github.label','profile.linkedin.label','experiences.0.company','experiences.0.role','education.0.title','education.0.school','publications.0.description']) assert.ok(html.includes(`data-field="${path}"`),path);
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
