import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResume, isDirty } from '../src/model.ts';
import { applyTextEdit, addBullet, splitBullet, mergeBullet, removeEntry, moveEntry, addEntry } from '../src/inline-model.ts';

const source=()=>normalizeResume({profile:{name:'Ada'},experiences:[{role:'Designer',activities:'First result\nSecond result'}]},'en');
test('inline text and bullet edits change only the working copy',()=>{
 const original=source();let copy=applyTextEdit(original,'profile.name','Ada Maria');
 copy=applyTextEdit(copy,'experiences.0.activities','Changed second result',1);
 assert.equal(copy.profile.name,'Ada Maria');assert.equal(copy.experiences[0].activities,'First result\nChanged second result');
 assert.equal(original.profile.name,'Ada');assert.equal(original.experiences[0].activities,'First result\nSecond result');assert.equal(isDirty(copy,original),true);
});
test('inline empty fields preserve paragraphs and plain pasted text',()=>{
 let copy=applyTextEdit(source(),'profile.presentation','First paragraph\n\nSecond paragraph <script>plain text</script>');
 assert.match(copy.profile.presentation,/\n\nSecond/);assert.match(copy.profile.presentation,/<script>/);
 assert.throws(()=>applyTextEdit(copy,'__proto__.polluted','yes'),/field/);
 assert.throws(()=>applyTextEdit(copy,'experiences.99.role','yes'),/field/);
});
test('bullet Enter splits a line and adding bullet retains existing text',()=>{
 let copy=splitBullet(source(),'experiences.0.activities',0,5);
 assert.equal(copy.experiences[0].activities,'First\n result\nSecond result');
 copy=addBullet(copy,'experiences.0.activities');assert.equal(copy.experiences[0].activities,'First\n result\nSecond result\n');
});
test('entry controls add, move and remove entries without mutating imported source',()=>{
 const original=source();let copy=addEntry(original,'experiences');
 copy=applyTextEdit(copy,'experiences.1.company','New company');copy=moveEntry(copy,'experiences',1,-1);
 assert.equal(copy.experiences[0].company,'New company');copy=removeEntry(copy,'experiences',0);
 assert.equal(copy.experiences.length,1);assert.equal(original.experiences.length,1);
});

test('Backspace merges adjacent bullets without losing text',()=>{const copy=mergeBullet(source(),'experiences.0.activities',1);assert.equal(copy.experiences[0].activities,'First resultSecond result');});
