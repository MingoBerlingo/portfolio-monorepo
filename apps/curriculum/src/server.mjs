import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readCV, validateLocale } from './cms.mjs';
import { normalizeCV, validateDocument, MAX_DOCUMENT_BYTES } from './model.mjs';
import { printCV } from './pdf.mjs';

const assets = new Map([
  ['/', ['../public/index.html','text/html']], ['/app.css',['../public/app.css','text/css']], ['/app.mjs',['../public/app.mjs','text/javascript']],
  ...['render','model','history','cms'].map(name=>[`/modules/${name}.mjs`,[`${name}.mjs`,'text/javascript']]),
]);
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); }
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Error('Use a JSON request.');
  let size = 0; const parts = [];
  for await (const part of req) { size += part.length; if (size > MAX_DOCUMENT_BYTES) throw Error('The CV exceeds the 1 MB limit.'); parts.push(part); }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw Error('Invalid JSON request.'); }
}
/** Fixed CMS destination. No endpoint writes CV data into the CMS or disk. */
export function createApp({ read = readCV, print = printCV, fixture, fetcher = fetch } = {}) {
  let printing = false;
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-src 'self' about:; connect-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'none'");
    const host = req.headers.host || '';
    if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host)) { json(res,403,{error:'Use the local app address.'}); return; }
    const origin = `http://${host}`;
    const url = new URL(req.url, origin);
    if ((req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') { json(res,403,{error:'Cross-origin requests are not allowed.'}); return; }
    try {
      if (req.method==='GET' && assets.has(url.pathname)) {
        const [path,type]=assets.get(url.pathname);
        res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`});res.end(await readFile(new URL(path,import.meta.url)));return;
      }
      if (req.method==='GET' && url.pathname==='/api/cv') {
        const locale = url.searchParams.get('locale');validateLocale(locale);
        const token = req.headers.authorization?.match(/^JWT (.+)$/)?.[1] || process.env.CMS_TOKEN;
        const cmsHost = new URL(process.env.CMS_API_URL || 'http://localhost:3000').hostname;
        const cookie = cmsHost === host.split(':')[0] ? req.headers.cookie : undefined;
        const data=fixture ? await fixture(locale) : await read({ baseURL:process.env.CMS_API_URL,locale,token,cookie });
        json(res,200,normalizeCV(data,locale));return;
      }
      if (req.method==='POST' && url.pathname==='/api/login') {
        const credentials=await body(req);
        if(typeof credentials.email!=='string'||typeof credentials.password!=='string'||credentials.email.length>320||credentials.password.length>1000)throw Error('Enter your CMS email and password.');
        const base=new URL(process.env.CMS_API_URL || 'http://localhost:3000');
        if(base.username||base.password||!['http:','https:'].includes(base.protocol)||(base.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(base.hostname)))throw Error('Remote CMS login requires HTTPS.');
        const response=await fetcher(`${base.href.replace(/\/$/,'')}/api/users/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:credentials.email,password:credentials.password}),signal:AbortSignal.timeout(30000),redirect:'error'});
        if(!response.ok){json(res,401,{error:'CMS sign-in failed. Check your email and password.'});return;}
        const data=await response.json();if(typeof data.token!=='string')throw Error('CMS did not return a session token.');
        json(res,200,{token:data.token});return;
      }
      if(req.method==='POST' && url.pathname==='/api/pdf') {
        const document=await body(req);validateDocument(document);
        if(printing){json(res,429,{error:'Another PDF is being prepared. Try again in a moment.'});return;}
        printing=true;
        try {
          const pdf=await print(document);
          res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="cv-${document.locale}.pdf"`});res.end(pdf);
        } finally {printing=false;}
        return;
      }
      json(res,404,{error:'Not found.'});
    } catch(error) {
      // Never return upstream bodies or credentials to the browser.
      const message=error instanceof Error?error.message:'Request failed.';
      const auth=/\((401|403)\)/.test(message);
      json(res,auth?401:400,{error:auth?'Connect your CMS account to load private CV content.':message.includes('fetch failed')?'The CMS is unavailable. Start it and try again.':message});
    }
  });
}
export async function startApp({ port=4174, fixture }={}) {
  const server=createApp({fixture});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  console.log(`Curriculum Studio: http://localhost:${server.address().port}`);
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT || 4174);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT must be between 1024 and 65535.');
  const fixture=process.env.CURRICULUM_FIXTURES==='1' ? async locale=>JSON.parse(await readFile(new URL(`../test/fixtures/${locale}.json`,import.meta.url),'utf8')) : undefined;
  startApp({port,fixture}).catch(error=>{console.error(error.message);process.exitCode=1;});
}
