import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { validateDocument } from '../../../model';
import { printResume } from '../../../pdf';
import { inspectPdf, MAX_PDF_BYTES } from '$lib/server/pdf-inspection';
import { reviewResume } from '$lib/server/stress-test';
import { TailorProviderError } from '$lib/server/tailor';
import type { ResumeDocument } from '../../../types';

export const POST: RequestHandler = async ({ request }) => {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    return Response.json({ error: 'Use the Stress Test form.' }, { status: 400 });
  if (!env.OPENAI_API_KEY?.trim()) return Response.json({ error: 'Set OPENAI_API_KEY on the Resume Studio server and restart it to use Stress Test.' }, { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Missing request body.' }, { status: 400 });
  let form: FormData;
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_PDF_BYTES + 1500000) {
        await reader.cancel();
        return Response.json({ error: 'The request is too large. Choose a PDF smaller than 10 MB.' }, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData();
  } catch { return Response.json({ error: 'The upload could not be read.' }, { status: 400 }); }
  finally { reader.releaseLock(); }
  const job = form.get('job');
  const locale = form.get('locale');
  if (typeof job !== 'string' || !job.trim() || job.length > 20000 || (locale !== 'en' && locale !== 'it'))
    return Response.json({ error: 'Choose a language and enter a job description of up to 20,000 characters.' }, { status: 400 });
  let document: ResumeDocument | undefined;
  const upload = form.get('pdf');
  let evidence;
  if (upload instanceof File) {
    try { evidence = await inspectPdf(new Uint8Array(await upload.arrayBuffer()), 'uploaded'); }
    catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : 'The PDF could not be read.' }, { status: 400 }); }
  } else {
    try {
      const raw = form.get('document');
      if (typeof raw !== 'string' || raw.length > 1400000) throw Error();
      document = validateDocument(JSON.parse(raw));
      if (document.locale !== locale) throw Error();
    } catch { return Response.json({ error: 'Load a valid resume before running the review.' }, { status: 400 }); }
    try { evidence = await inspectPdf(await printResume(document), 'generated'); }
    catch { return Response.json({ error: 'The resume PDF could not be generated or inspected. Check that the PDF browser is installed and try again.' }, { status: 502 }); }
  }
  try {
    return Response.json(await reviewResume({ document, evidence, locale, job }, env.OPENAI_API_KEY.trim(), env.OPENAI_STRESS_MODEL?.trim() || env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini'));
  } catch (cause) {
    const status = cause instanceof TailorProviderError ? cause.status : cause instanceof Error && cause.name === 'TimeoutError' ? 504 : 502;
    return Response.json({ error: cause instanceof TailorProviderError ? cause.message : status === 504 ? 'The review took too long. Your resume is still available. Try again.' : 'The review could not be completed. Your resume is still available. Try again.' }, { status });
  }
};
