import type { PdfEvidence } from '../../stress-test';

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export async function inspectPdf(bytes: Uint8Array, kind: PdfEvidence['kind']): Promise<PdfEvidence> {
  if (!bytes.length || bytes.length > MAX_PDF_BYTES) throw Error('Choose a PDF smaller than 10 MB.');
  if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw Error('The file is not a PDF.');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 12) throw Error('Choose a resume with 12 pages or fewer.');
    const pages: PdfEvidence['pages'] = [];
    let total = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
      total += text.length;
      if (total > 60000) throw Error('The resume contains too much text. Use a shorter PDF.');
      pages.push({ number, characters: text.length, text });
      page.cleanup();
    }
    if (total < 40) throw Error('This PDF has too little extractable text. Upload a text-based PDF or load a CMS or saved resume. Scanned PDFs require OCR before import.');
    const warnings = pages.filter(page => page.characters < 100).map(page => `Page ${page.number} has little extractable text (${page.characters} characters).`);
    if (pages.some(page => page.text.includes('\uFFFD'))) warnings.push('Text extraction contains replacement characters that may indicate font encoding problems.');
    return { kind, pages, warnings };
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') throw Error('This PDF is password protected. Upload an unlocked copy.');
    throw error;
  } finally { await task.destroy(); }
}
