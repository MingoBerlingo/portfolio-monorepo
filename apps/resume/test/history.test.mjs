import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeResume} from '../src/model.ts';
import {HISTORY_KEY,listVersions,saveVersion,deleteVersion,importVersion,VersionNameConflict} from '../src/history.ts';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
test('named versions persist independent complete snapshots and delete by id',()=>{
 const storage=memory(),doc=normalizeResume({},'it');doc.hiddenSections=['education'];
 const saved=saveVersion(storage,doc,'  Job A  ',0);assert.equal(saved.name,'Job A');assert.equal(saved.savedAt,'1970-01-01T00:00:00.000Z');
 doc.profile.name='later';saved.document.profile.name='mutated';
 const versions=listVersions(storage);assert.equal(versions[0].document.profile.name,'');assert.equal(versions[0].document.locale,'it');assert.deepEqual(versions[0].document.hiddenSections,['education']);
 deleteVersion(storage,saved.id);assert.deepEqual(listVersions(storage),[]);
});
test('malformed stored data is reported and never overwritten',()=>{
 for(const value of ['{','{}','[{}]',JSON.stringify([{id:'x',name:'n',savedAt:'bad',document:normalizeResume({})}])]){
 const storage=memory();storage.setItem(HISTORY_KEY,value);assert.throws(()=>listVersions(storage));assert.throws(()=>saveVersion(storage,normalizeResume({}),'New'));assert.equal(storage.getItem(HISTORY_KEY),value);
 }
});
test('duplicate names require a choice and preserve other snapshots', () => {
 const storage = memory();
 const doc = normalizeResume({});
 const original = saveVersion(storage, doc, 'Product Designer', 0);
 doc.profile.presentation = 'Updated introduction';
 assert.throws(() => saveVersion(storage, doc, ' Product Designer ', 1),
   (error) => error instanceof VersionNameConflict && error.versionId === original.id);
 assert.deepEqual(listVersions(storage), [original]);
 const copy = saveVersion(storage, doc, 'Product Designer', 1, 'numbered');
 assert.equal(copy.name, 'Product Designer (2)');
 const next = saveVersion(storage, doc, copy.name, 2, 'numbered');
 assert.equal(next.name, 'Product Designer (3)');
 const replacement = saveVersion(storage, doc, 'Product Designer', 3, { replaceId: original.id });
 assert.equal(replacement.id, original.id);
 assert.equal(replacement.document.profile.presentation, 'Updated introduction');
 assert.deepEqual(listVersions(storage), [replacement, next, copy]);
});
test('exported snapshots can be imported without overwriting history', () => {
 const storage = memory();
 const source = saveVersion(storage, normalizeResume({profile:{name:'Ada'}}, 'it'), 'Designer', 0);
 const exported = JSON.stringify(source);
 const imported = importVersion(storage, exported);
 assert.equal(imported.name, 'Designer (2)');
 assert.notEqual(imported.id, source.id);
 assert.equal(imported.savedAt, source.savedAt);
 assert.deepEqual(imported.document, source.document);
 assert.throws(() => importVersion(storage, JSON.stringify({...source, document:{}})));
 assert.deepEqual(listVersions(storage), [imported, source]);
});
test('invalid names, dates, history overflow and storage failures are explicit',()=>{
 const storage=memory();for(const name of ['', '   ', 'a'.repeat(121)])assert.throws(()=>saveVersion(storage,normalizeResume({}),name));
 assert.throws(()=>saveVersion(storage,normalizeResume({}),'Name',NaN));
 for(let i=0;i<50;i++)saveVersion(storage,normalizeResume({}),`Version ${i}`,i);assert.throws(()=>saveVersion(storage,normalizeResume({}),'Overflow'));
 const quota={getItem:()=>null,setItem:()=>{throw Error('quota')}};assert.throws(()=>saveVersion(quota,normalizeResume({}),'Name'),/quota/);
 assert.throws(()=>listVersions({getItem(){throw Error('blocked')}}),/blocked/);
});
