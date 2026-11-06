import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCV} from '../src/model.ts';
import {HISTORY_KEY,listVersions,saveVersion,deleteVersion} from '../src/history.ts';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
test('named versions persist independent complete snapshots and delete by id',()=>{
 const storage=memory(),doc=normalizeCV({},'it');doc.hiddenSections=['education'];
 const saved=saveVersion(storage,doc,'  Job A  ',0);assert.equal(saved.name,'Job A');assert.equal(saved.savedAt,'1970-01-01T00:00:00.000Z');
 doc.profile.name='later';saved.document.profile.name='mutated';
 const versions=listVersions(storage);assert.equal(versions[0].document.profile.name,'');assert.equal(versions[0].document.locale,'it');assert.deepEqual(versions[0].document.hiddenSections,['education']);
 deleteVersion(storage,saved.id);assert.deepEqual(listVersions(storage),[]);
});
test('malformed stored data is reported and never overwritten',()=>{
 for(const value of ['{','{}','[{}]',JSON.stringify([{id:'x',name:'n',savedAt:'bad',document:normalizeCV({})}])]){
 const storage=memory();storage.setItem(HISTORY_KEY,value);assert.throws(()=>listVersions(storage));assert.throws(()=>saveVersion(storage,normalizeCV({}),'New'));assert.equal(storage.getItem(HISTORY_KEY),value);
 }
});
test('invalid names, dates, history overflow and storage failures are explicit',()=>{
 const storage=memory();for(const name of ['', '   ', 'a'.repeat(121)])assert.throws(()=>saveVersion(storage,normalizeCV({}),name));
 assert.throws(()=>saveVersion(storage,normalizeCV({}),'Name',NaN));
 for(let i=0;i<50;i++)saveVersion(storage,normalizeCV({}),`Version ${i}`,i);assert.throws(()=>saveVersion(storage,normalizeCV({}),'Overflow'));
 const quota={getItem:()=>null,setItem:()=>{throw Error('quota')}};assert.throws(()=>saveVersion(quota,normalizeCV({}),'Name'),/quota/);
 assert.throws(()=>listVersions({getItem(){throw Error('blocked')}}),/blocked/);
});
