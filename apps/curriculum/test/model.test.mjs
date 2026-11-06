import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCV, validateDocument, fingerprint, isDirty} from '../src/model.mjs';

test('canonical fields normalize without legacy translation or curriculum fallback', () => {
 const doc = normalizeCV({profile:{name:'Ada',cvTranslation:{it:{name:'Wrong'}},skills:'Design'},curriculum:{phone:'wrong'},experiences:[{industries:[{industry:'Web'},{industry:'Print'}],activities:[{activity:'Build'}]}],research:[{project:{id:4,title:'Project'}}]},'it');
 assert.equal(doc.locale,'it'); assert.equal(doc.profile.name,'Ada'); assert.equal(doc.profile.phone,'');
 assert.equal(doc.experiences[0].industries,'Web\nPrint'); assert.equal(doc.experiences[0].activities,'Build');
 assert.equal(doc.research[0].project,'Project'); assert.equal(validateDocument(doc),doc);
});
test('Lexical presentation preserves paragraphs, line breaks and list items',()=>{
 const text = normalizeCV({profile:{presentation:{root:{children:[{type:'paragraph',children:[{text:'Hello'},{type:'linebreak'},{text:'world'}]},{type:'list',children:[{type:'listitem',children:[{text:'One'}]},{type:'listitem',children:[{text:'Two'}]}]}]}}}}).profile.presentation;
 assert.equal(text,'Hello\nworld\nOne\nTwo');
});
test('edited normalized documents roundtrip exactly with independent copies',()=>{
 const doc=normalizeCV({},'en'); doc.profile.presentation='  edited\ntext  ';doc.sectionOrder.reverse();doc.hiddenSections=['research'];
 const copy=normalizeCV(doc); assert.deepEqual(copy,doc);copy.profile.name='other';assert.equal(doc.profile.name,'');
 assert.equal(isDirty(doc,JSON.parse(JSON.stringify(doc))),false);assert.equal(isDirty(doc,copy),true);
 const reordered=Object.fromEntries(Object.entries(doc).reverse());assert.equal(fingerprint(doc),fingerprint(reordered));
});
test('validation rejects malformed, huge and structurally unsafe documents',()=>{
 const doc=normalizeCV({});
 for(const bad of [null,{}, {...doc,locale:'fr'}, {...doc,profile:{...doc.profile,name:3}}, {...doc,experiences:Array(201).fill({})}, {...doc,profile:{...doc.profile,name:'a'.repeat(50001)}}, {...doc,sectionOrder:['research','research']}, {...doc,hiddenSections:['unknown']}]) assert.throws(()=>validateDocument(bad));
 const giant=normalizeCV({});for(const k of ['name','surname','jobPosition','presentation','email','phone','location','skills','languages','additionalInfo'])giant.profile[k]='💡'.repeat(25000); giant.profile.github.label='💡'.repeat(25000); assert.throws(()=>validateDocument(giant));
});

test('old named history documents upgrade portfolio without losing legacy fields',()=>{
 const old=normalizeCV({profile:{additionalInfo:'Legacy'}});delete old.profile.portfolio;
 assert.equal(validateDocument(old),old);
 const upgraded=normalizeCV(old);assert.deepEqual(upgraded.profile.portfolio,{label:'',url:''});assert.equal(upgraded.profile.additionalInfo,'Legacy');assert.equal(Object.hasOwn(old.profile,'portfolio'),false);
 assert.throws(()=>validateDocument({...upgraded,profile:{...upgraded.profile,portfolio:{label:'x',url:42}}}));
});
