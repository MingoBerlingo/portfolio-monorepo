import { validateDocument } from './model.mjs';
const templates = {
  experiences: {company:'',role:'',startDate:'',endDate:'',industries:'',activities:''},
  education: {title:'',school:'',startDate:'',endDate:'',details:''},
  publications: {title:'',description:'',url:''},
  research: {title:'',date:'',description:'',url:'',project:''},
};
const clone = document => {validateDocument(document);return structuredClone(document);};
function field(document,path) {
  if(typeof path!=='string')throw Error('Invalid editable field');
  const parts=path.split('.');
  const valid=parts[0]==='profile' && (parts.length===2 || parts.length===3 && ['github','linkedin'].includes(parts[1])) || parts.length===3 && Object.hasOwn(templates,parts[0]) && /^(0|[1-9]\d*)$/.test(parts[1]);
  if(!valid || parts.some(p=>['__proto__','prototype','constructor'].includes(p)))throw Error('Invalid editable field');
  let parent=document;
  for(const key of parts.slice(0,-1)) {if(!parent||!Object.hasOwn(parent,key))throw Error('Invalid editable field');parent=parent[key];}
  const key=parts.at(-1);
  if(!Object.hasOwn(parent,key)||typeof parent[key]!=='string')throw Error('Invalid editable field');
  return {parent,key};
}
export function applyTextEdit(document,path,value,line) {
  if(typeof value!=='string')throw Error('Editable text must be plain text');
  const copy=clone(document);const {parent,key}=field(copy,path);
  if(line===undefined) parent[key]=value.replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ');
  else {
    const lines=parent[key].split('\n');
    if(!Number.isInteger(line)||line<0||line>=lines.length)throw Error('Invalid bullet line');
    lines[line]=value.replace(/[\r\n]+/g,' ');parent[key]=lines.join('\n');
  }
  return validateDocument(copy);
}
export function addBullet(document,path) {
  const copy=clone(document);const {parent,key}=field(copy,path);parent[key]+='\n';return validateDocument(copy);
}
export function splitBullet(document,path,line,offset) {
  const copy=clone(document);const {parent,key}=field(copy,path);const lines=parent[key].split('\n');
  if(!Number.isInteger(line)||line<0||line>=lines.length||!Number.isInteger(offset)||offset<0||offset>lines[line].length)throw Error('Invalid bullet position');
  const text=lines[line];lines.splice(line,1,text.slice(0,offset),text.slice(offset));parent[key]=lines.join('\n');return validateDocument(copy);
}
export function mergeBullet(document,path,line) {
  const copy=clone(document);const {parent,key}=field(copy,path);const lines=parent[key].split('\n');
  if(!Number.isInteger(line)||line<=0||line>=lines.length)throw Error('Invalid bullet position');
  lines.splice(line-1,2,lines[line-1]+lines[line]);parent[key]=lines.join('\n');return validateDocument(copy);
}
function collection(document,key) {if(!Object.hasOwn(templates,key))throw Error('Invalid CV collection');return document[key];}
export function addEntry(document,key) {const copy=clone(document);const list=collection(copy,key);if(list.length>=200)throw Error('This section has reached 200 entries');list.push({...templates[key]});return validateDocument(copy);}
export function removeEntry(document,key,index) {const copy=clone(document);const list=collection(copy,key);if(!Number.isInteger(index)||index<0||index>=list.length)throw Error('Invalid CV entry');list.splice(index,1);return validateDocument(copy);}
export function moveEntry(document,key,index,direction) {const copy=clone(document);const list=collection(copy,key);const next=index+direction;if(!Number.isInteger(index)||![-1,1].includes(direction)||index<0||index>=list.length||next<0||next>=list.length)throw Error('Invalid CV entry position');[list[index],list[next]]=[list[next],list[index]];return validateDocument(copy);}
