import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResume } from '../src/model.ts';
import { validateReport } from '../src/stress-test.ts';
import { reviewResume } from '../src/lib/server/stress-test.ts';
import { addSourceChecks } from '../src/review-checks.ts';
import { inspectPdf, MAX_PDF_BYTES } from '../src/lib/server/pdf-inspection.ts';

const report = () => ({ summary:'Review', strengths:[{claim:'Shipped frontend',evidence:'Built product.'}],requirements:[], sections:['ats','job','grammar','terminology'].map(category=>({category,summary:'Evidence checked',findings:[]})) });
const evidence = {kind:'uploaded',pages:[{number:1,characters:100,text:'A resume with selectable text'}],warnings:[]};

test('requires all review categories and actionable complete findings',()=>{
 assert.equal(validateReport(report()).sections.length,4);
 assert.throws(()=>validateReport({...report(),sections:report().sections.slice(1)}));
 const duplicate=report();duplicate.sections[1].category='ats';assert.throws(()=>validateReport(duplicate));
 const broken=report();broken.sections[0].findings=[{severity:'high',title:'Missing evidence'}];assert.throws(()=>validateReport(broken));
});
test('rejects non-PDF and oversized files before parsing',async()=>{
 await assert.rejects(inspectPdf(new TextEncoder().encode('not a pdf'),'uploaded'),/not a PDF/);
 await assert.rejects(inspectPdf(new Uint8Array(MAX_PDF_BYTES+1),'uploaded'),/10 MB/);
});
test('preserves an existing editable resume and checks visible PDF evidence',async()=>{
 const fetcher=globalThis.fetch;
 const document=normalizeResume({profile:{name:'Ada',presentation:'Original wording'},experiences:[{role:'Developer',activities:'Built product.'}]});
 let request;
 globalThis.fetch=async(_url,options)=>{request=JSON.parse(options.body);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({report:report()})}]}]});};
 try {
  const result=await reviewResume({document,evidence,locale:'en',job:'Designer'},'test-key','test-model');
  assert.deepEqual(result.document,document);
  assert.equal(request.store,false);
  assert.match(request.instructions,/Do not silently apply|Do not invent/);
  assert.equal(JSON.parse(request.input).resume.profile.name,'');
 } finally {globalThis.fetch=fetcher;}
});
test('PDF transcription preserves skill and activity arrays and additional sections',async()=>{
 const fetcher=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({report:report(),document:{profile:{name:'Ada',skills:['Figma','Svelte']},experiences:[{role:'Designer',activities:['Original bullet.','Second bullet.']}],customSections:[{title:'Awards',content:'Original award'}]}})}]}]});
 try {
  const result=await reviewResume({evidence,locale:'it',job:'Designer'},'test-key','test-model');
  assert.equal(result.document.profile.skills,'Figma\nSvelte');
  assert.equal(result.document.experiences[0].activities,'Original bullet.\nSecond bullet.');
  assert.equal(result.document.customSections[0].content,'Original award');
  assert.ok(result.document.sectionOrder.includes('custom-import-0'));
 } finally {globalThis.fetch=fetcher;}
});
test('provider errors do not return a usable-looking review',async()=>{
 const fetcher=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({error:'quota'},{status:429});
 try {await assert.rejects(reviewResume({evidence,locale:'en',job:'Designer'},'test-key','test-model'),/quota/);}
 finally {globalThis.fetch=fetcher;}
});

test('local language checks catch real typos, term variants and bullet punctuation',()=>{
 const document=normalizeResume({experiences:[{activities:'Built frontend'}]},'it');
 const source={...evidence,pages:[{number:1,characters:100,text:'Sviluppo del un prototipo. Built frontend\nA front end developer.'}]};
 const result=addSourceChecks(report(),document,source);
 assert.ok(result.sections[2].findings.some(item=>item.evidence==='del un'));
 assert.ok(result.sections[2].findings.some(item=>item.title==='Punto finale mancante'));
 assert.ok(result.sections[3].findings.some(item=>item.evidence.includes('front end')));
});
test('language review removes findings without a source excerpt',()=>{
 const result=report();result.sections[2].findings=[{severity:'low',title:'Invented typo',evidence:'This phrase does not occur in the resume',explanation:'wrong',suggestion:'wrong'}];
 assert.equal(addSourceChecks(result,normalizeResume({}),evidence).sections[2].findings.length,0);
});
