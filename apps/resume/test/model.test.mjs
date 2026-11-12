import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeResume, validateDocument, fingerprint, isDirty} from '../src/model.ts';

test('canonical fields normalize without legacy translation or resume fallback', () => {
 const doc = normalizeResume({profile:{name:'Ada',cvTranslation:{it:{name:'Wrong'}},skills:'Design'},resume:{phone:'wrong'},experiences:[{industries:[{industry:'Web'},{industry:'Print'}],activities:[{activity:'Build'}]}],research:[{project:{id:4,title:'Project'}}]},'it');
 assert.equal(doc.locale,'it'); assert.equal(doc.profile.name,'Ada'); assert.equal(doc.profile.phone,'');
 assert.equal(doc.experiences[0].industries,'Web\nPrint'); assert.equal(doc.experiences[0].activities,'Build');
 assert.equal(doc.research[0].project,'Project'); assert.equal(validateDocument(doc),doc);
});
test('Lexical presentation preserves paragraphs, line breaks and list items',()=>{
 const text = normalizeResume({profile:{presentation:{root:{children:[{type:'paragraph',children:[{text:'Hello'},{type:'linebreak'},{text:'world'}]},{type:'list',children:[{type:'listitem',children:[{text:'One'}]},{type:'listitem',children:[{text:'Two'}]}]}]}}}}).profile.presentation;
 assert.equal(text,'Hello\nworld\nOne\nTwo');
});
test('edited normalized documents roundtrip exactly with independent copies',()=>{
 const doc=normalizeResume({},'en'); doc.profile.presentation='  edited\ntext  ';doc.sectionOrder.reverse();doc.hiddenSections=['research'];
 const copy=normalizeResume(doc); assert.deepEqual(copy,doc);copy.profile.name='other';assert.equal(doc.profile.name,'');
 assert.equal(isDirty(doc,JSON.parse(JSON.stringify(doc))),false);assert.equal(isDirty(doc,copy),true);
 const reordered=Object.fromEntries(Object.entries(doc).reverse());assert.equal(fingerprint(doc),fingerprint(reordered));
});
test('validation rejects malformed, huge and structurally unsafe documents',()=>{
 const doc=normalizeResume({});
 for(const bad of [null,{}, {...doc,locale:'fr'}, {...doc,profile:{...doc.profile,name:3}}, {...doc,experiences:Array(201).fill({})}, {...doc,profile:{...doc.profile,name:'a'.repeat(50001)}}, {...doc,sectionOrder:['research','research']}, {...doc,hiddenSections:['unknown']}]) assert.throws(()=>validateDocument(bad));
 const giant=normalizeResume({});for(const k of ['name','surname','jobPosition','presentation','email','phone','location','skills','languages','additionalInfo'])giant.profile[k]='💡'.repeat(25000); giant.profile.github.label='💡'.repeat(25000); assert.throws(()=>validateDocument(giant));
});

test('old named history documents upgrade portfolio without losing legacy fields',()=>{
 const old=normalizeResume({profile:{additionalInfo:'Legacy'}});delete old.profile.portfolio;
 assert.equal(validateDocument(old),old);
 const upgraded=normalizeResume(old);assert.deepEqual(upgraded.profile.portfolio,{label:'',url:''});assert.equal(upgraded.profile.additionalInfo,'Legacy');assert.equal(Object.hasOwn(old.profile,'portfolio'),false);
 assert.throws(()=>validateDocument({...upgraded,profile:{...upgraded.profile,portfolio:{label:'x',url:42}}}));
});

test('legacy documents preserve arbitrary section order and deleted entries across normalization',()=>{
 const legacy=normalizeResume({profile:{additionalInfo:'Retain me'},experiences:[{company:'Deleted'},{company:'Kept'}]},'it');
 delete legacy.profile.portfolio;
 legacy.sectionOrder=['research','education','skills','additional','publications','introduction','experience'];
 legacy.hiddenSections=['experience','additional','skills'];
 legacy.experiences.splice(0,1);
 const copy=normalizeResume(legacy);
 assert.deepEqual(copy.sectionOrder,['research','education','skills','languages','additional','publications','introduction','experience']);
 assert.deepEqual(copy.hiddenSections,[...legacy.hiddenSections,'languages']);
 assert.deepEqual(copy.experiences.map(entry=>entry.company),['Kept']);
 assert.equal(copy.profile.additionalInfo,'Retain me');
 assert.equal(validateDocument(copy),copy);
 assert.notEqual(copy.experiences,legacy.experiences);
});

test('older saved documents validate unchanged and normalize metadata defaults',()=>{
 const old=normalizeResume({profile:{email:'retain@example.test'}});
 for(const key of ['contactOrder','deletedContacts','deletedSections'])delete old[key];
 assert.equal(validateDocument(old),old);
 const upgraded=normalizeResume(old);
 assert.deepEqual(upgraded.contactOrder,['email','phone','location','linkedin','portfolio','github']);
 assert.deepEqual(upgraded.deletedContacts,[]);assert.deepEqual(upgraded.deletedSections,[]);
 assert.equal(upgraded.profile.email,'retain@example.test');assert.equal(Object.hasOwn(old,'contactOrder'),false);
});
test('contact and deletion metadata roundtrip and reject invalid, duplicate or missing keys',()=>{
 const doc=normalizeResume({});doc.contactOrder.reverse();doc.deletedContacts=['phone'];doc.deletedSections=['skills'];
 assert.deepEqual(normalizeResume(doc),doc);
 for(const [key,value] of [
  ['contactOrder',['email']],['contactOrder',['email','email','location','linkedin','portfolio','github']],
  ['contactOrder',['email','phone','location','linkedin','portfolio','unknown']],
  ['deletedContacts',['unknown']],['deletedContacts',['email','email']],['deletedContacts',null],
  ['deletedSections',['unknown']],['deletedSections',['skills','skills']],['deletedSections',undefined],
 ])assert.throws(()=>validateDocument({...doc,[key]:value}));
 assert.throws(()=>validateDocument({...doc,unexpectedMetadata:[]}));
});

test('CMS education grade is appended only on import and saved titles roundtrip', () => {
 const source = {education:[{title:'Laurea magistrale',grade:'110 / 110 e lode'},{title:'Diploma'}]};
 const doc = normalizeResume(source, 'it');
 assert.equal(doc.education[0].title, 'Laurea magistrale – 110 / 110 e lode');
 assert.equal(doc.education[1].title, 'Diploma');
 assert.equal(source.education[0].title, 'Laurea magistrale');
 assert.deepEqual(normalizeResume(doc), doc);
});
