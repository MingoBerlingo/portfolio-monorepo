import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { renderCV } from '../src/render.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const child = spawn(process.execPath, ['apps/curriculum/src/cli.mjs', 'preview', '--locale', 'it', '--fixture', 'apps/curriculum/test/fixtures/it.json', '--port', '14174'], { cwd: root });
try {
 await new Promise((resolve,reject) => { const timeout = setTimeout(()=>reject(new Error('Preview timeout')),10000); child.stdout.once('data',()=>{clearTimeout(timeout);resolve();}); child.once('exit',()=>{clearTimeout(timeout);reject(new Error('Preview exited'));}); });
 const r = await fetch('http://127.0.0.1:14174');
 assert.equal(r.status,200); assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
 assert.match(await r.text(), /Esperienza lavorativa/);
 assert.equal((await fetch('http://127.0.0.1:14174/nope')).status,404);
 console.log('Local preview HTTP/CSP/Italian content/404 checks passed.');
} finally { child.kill('SIGTERM'); }
const cv=JSON.parse(await readFile(`${root}/apps/curriculum/test/fixtures/en.json`));
cv.experiences = [cv.experiences[0]];
cv.experiences[0].activities=Array.from({length:100},(_,n)=>({activity:`Stress bullet ${n}: An accessible interface and consistent design system.`}));
const directory = await mkdtemp(resolve(tmpdir(), 'curriculum-smoke-'));
const browser=await chromium.launch();
try {
 const page=await browser.newPage();
 await page.setContent(renderCV(cv,'en'));
 await page.pdf({path:resolve(directory, 'stress.pdf'),preferCSSPageSize:true,printBackground:true});
 console.log('Long-content PDF generated.');
} finally {await browser.close(); await rm(directory, { recursive: true, force: true });}
