import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { readCV, validateLocale } from './cms.mjs';
import { renderCV } from './render.mjs';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { locale: { type: 'string', default: 'it' }, fixture: { type: 'string' }, port: { type: 'string', default: '4174' }, help: { type: 'boolean' } },
});
const command = positionals[0];
if (values.help || !['pdf', 'preview'].includes(command) || positionals.length !== 1) {
  console.log('Usage: pnpm --filter curriculum <pdf|preview> --locale it|en [--fixture path.json] [--port 4174]');
  process.exit(values.help ? 0 : 1);
}

try {
  validateLocale(values.locale);
  const cv = values.fixture ? JSON.parse(await readFile(resolve(values.fixture), 'utf8')) : await readCV({
    baseURL: process.env.CMS_API_URL, locale: values.locale, token: process.env.CMS_TOKEN,
  });
  const html = renderCV(cv, values.locale);
  if (command === 'preview') {
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Preview port must be between 1024 and 65535.');
    const server = createServer((req, res) => {
      if (req.url !== '/' || req.method !== 'GET') { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(html);
    });
    server.on('error', () => { console.error('Preview could not start. Check whether the selected port is already in use.'); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`CV preview: http://127.0.0.1:${port} — Ctrl+C to stop. Restart after CMS edits.`));
  } else {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.emulateMedia({ media: 'print' });
      await page.evaluate(() => document.fonts.ready);
      const output = resolve(dirname(fileURLToPath(import.meta.url)), '../output');
      await mkdir(output, { recursive: true, mode: 0o700 });
      // Files are local to this workspace and never written into apps/web/static.
      const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
      const path = resolve(output, `cv-${values.locale}.pdf`);
      await writeFile(path, pdf, { mode: 0o600 });
      await writeFile(resolve(output, `cv-${values.locale}.html`), html, { mode: 0o600 });
      console.log(`Generated ${path}`);
    } finally { await browser.close(); }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Curriculum generation failed.');
  process.exitCode = 1;
}
