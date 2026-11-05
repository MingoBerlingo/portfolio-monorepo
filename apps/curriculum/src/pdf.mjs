import { chromium } from 'playwright';
import { renderCV } from './render.mjs';
import { validateDocument } from './model.mjs';

export async function printCV(document) {
  validateDocument(document);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // The template has no external assets. Block all network access while printing.
    await page.route('**/*', route => route.abort());
    await page.emulateMedia({ media: 'print' });
    await page.setContent(renderCV(document));
    await page.evaluate(() => globalThis.document.fonts.ready);
    return await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  } finally { await browser.close(); }
}
