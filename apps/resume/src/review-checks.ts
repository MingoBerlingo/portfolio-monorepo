import type { ResumeDocument } from './types';
import type { StressReport, PdfEvidence, ReviewFinding } from './stress-test';

const normalize = (text: string) => text.replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Language suggestions must point to actual source wording. These local checks
 * also catch punctuation and common term variants independently of the model. */
export function addSourceChecks(report: StressReport, document: ResumeDocument, pdf: PdfEvidence): StressReport {
  const source = pdf.pages.map(page => page.text).join('\n');
  const normalized = normalize(source);
  const italian = document.locale === 'it';
  const grammar = report.sections.find(section => section.category === 'grammar')!;
  const terminology = report.sections.find(section => section.category === 'terminology')!;
  for (const section of [grammar, terminology]) {
    section.findings = section.findings.filter(finding => {
      const quotes = [...finding.evidence.matchAll(/[“"]([^“”"]{8,})[”"]/g)].map(match => match[1]);
      const excerpts = quotes.length ? quotes : [finding.evidence];
      return excerpts.some(excerpt => normalize(excerpt).length >= 8 && normalized.includes(normalize(excerpt)));
    });
  }
  const add = (target: typeof grammar, finding: ReviewFinding) => {
    if (!target.findings.some(item => normalize(item.evidence) === normalize(finding.evidence))) target.findings.unshift(finding);
  };
  if (!document.hiddenSections.includes('experience') && !document.deletedSections?.includes('experience')) {
    for (const entry of document.experiences) {
      for (const activity of entry.activities.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
        if (!activity.endsWith('.') && normalized.includes(normalize(activity)) && !normalized.includes(normalize(activity) + '.')) add(grammar, {
          severity: 'low', title: italian ? 'Punto finale mancante' : 'Missing final period', evidence: activity,
          explanation: italian ? 'I punti elenco delle esperienze devono terminare con un punto.' : 'Experience bullets should consistently end with a period.',
          suggestion: activity.replace(/[!?;:,]+$/, '') + '.',
        });
      }
    }
  }
  if (italian) {
    for (const match of source.matchAll(/\bdel\s+un\b/gi)) add(grammar, {
      severity:'medium', title:'Preposizione non corretta', evidence:match[0],
      explanation:'Davanti all’articolo indeterminativo «un» si usa «di», senza articolo determinativo.', suggestion:'di un',
    });
  }
  for (const variants of [[/\bfrontend\b/gi, /\bfront[ -]end\b/gi], [/\bbackend\b/gi, /\bback[ -]end\b/gi], [/\bfullstack\b/gi, /\bfull[ -]stack\b/gi]]) {
    const found = [...new Set(variants.flatMap(pattern => [...source.matchAll(pattern)].map(match => match[0].toLowerCase())))];
    if (found.length > 1) add(terminology, {
      severity:'low', title:italian ? 'Varianti dello stesso termine' : 'Inconsistent term variants', evidence:found.join(' / '),
      explanation:italian ? 'Il documento usa grafie diverse per lo stesso termine.' : 'The document uses different spellings for the same term.',
      suggestion:italian ? `Uniformare la grafia, per esempio «${found[0]}», in tutto il documento.` : `Use one spelling, for example “${found[0]}”, throughout the document.`,
    });
  }
  // Avoid a model-generated "no errors" summary contradicting verified findings.
  for (const section of [grammar, terminology]) {
    section.summary = section.findings.length ? (italian
      ? `${section.findings.length === 1 ? "Un punto da verificare" : `${section.findings.length} punti da verificare`} nel testo originale. Le correzioni suggerite sono riportate sotto.`
      : `${section.findings.length} ${section.findings.length === 1 ? "item" : "items"} to check against the original text. Suggested corrections are listed below.`)
      : (italian ? 'Nessun problema specifico supportato da un estratto del testo.' : 'No specific issues supported by a source excerpt.');
  }
  return report;
}
