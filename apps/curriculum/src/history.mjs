import { validateDocument } from './model.mjs';
export const HISTORY_KEY = 'portfolio.curriculum.versions.v1';
const MAX_HISTORY_BYTES = 50 * 1024 * 1024 + 100000;
const clone = value => JSON.parse(JSON.stringify(value));
function validateVersion(v) {
 if(!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).sort().join(',')!=='document,id,name,savedAt' || typeof v.id!=='string' || !v.id || v.id.length>160 || typeof v.name!=='string' || !v.name.trim() || v.name!==v.name.trim() || v.name.length>120 || typeof v.savedAt!=='string' || !Number.isFinite(Date.parse(v.savedAt)) || new Date(v.savedAt).toISOString()!==v.savedAt)throw Error('Invalid saved CV version');
 validateDocument(v.document);
}
export function listVersions(storage=globalThis.localStorage) {
 if(!storage || typeof storage.getItem!=='function')throw Error('Browser version storage is unavailable');
 const raw=storage.getItem(HISTORY_KEY);
 if(raw===null)return [];
 if(typeof raw!=='string' || raw.length>MAX_HISTORY_BYTES)throw Error('Saved CV history is too large');
 let versions;try{versions=JSON.parse(raw);}catch{throw Error('Saved CV history is not valid JSON');}
 if(!Array.isArray(versions) || versions.length>50)throw Error('Invalid saved CV history');
 versions.forEach(validateVersion);
 if(new Set(versions.map(v=>v.id)).size!==versions.length)throw Error('Duplicate saved CV version IDs');
 return versions;
}
export function saveVersion(storage,document,name,now=Date.now()) {
 validateDocument(document);
 if(typeof name!=='string' || !name.trim() || name.trim().length>120)throw Error('Enter a version name of 1–120 characters');
 if(typeof now!=='number' || !Number.isFinite(now) || !Number.isFinite(new Date(now).getTime()))throw Error('Invalid save date');
 const versions=listVersions(storage);
 if(versions.length>=50)throw Error('History contains 50 versions; delete a version before saving');
 const id=globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`;
 const version={id,name:name.trim(),savedAt:new Date(now).toISOString(),document:clone(document)};
 storage.setItem(HISTORY_KEY,JSON.stringify([version,...versions]));
 return clone(version);
}
export function deleteVersion(storage,id) {
 if(typeof id!=='string')throw Error('Invalid version ID');
 const versions=listVersions(storage);
 storage.setItem(HISTORY_KEY,JSON.stringify(versions.filter(v=>v.id!==id)));
}
