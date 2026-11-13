export type ReviewCategory = 'ats' | 'job' | 'grammar' | 'terminology';
export type ReviewFinding = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  evidence: string;
  explanation: string;
  suggestion: string;
};
export type ReviewSection = {
  category: ReviewCategory;
  summary: string;
  findings: ReviewFinding[];
};
export type StressReport = {
  summary: string;
  strengths: { claim: string; evidence: string }[];
  requirements: { requirement: string; status: 'met' | 'partial' | 'not_evidenced'; evidence: string; explanation: string }[];
  sections: ReviewSection[];
};
export type PdfEvidence = {
  kind: 'uploaded' | 'generated';
  pages: { number: number; characters: number; text: string }[];
  warnings: string[];
};
export const reviewLabels: Record<ReviewCategory, string> = {
  ats: 'ATS readability', job: 'Job description matching',
  grammar: 'Grammar and punctuation', terminology: 'Terminology consistency',
};
export function validateReport(value: unknown): StressReport {
  const report = value as StressReport;
  const text = (v: unknown) => typeof v === 'string' && v.length <= 12000;
  if (!report || !text(report.summary) || !Array.isArray(report.strengths) ||
    report.strengths.length > 12 || !report.strengths.every(item => item && text(item.claim) && text(item.evidence)) ||
    !Array.isArray(report.requirements) || report.requirements.length > 20 || !report.requirements.every(item => item &&
      text(item.requirement) && ['met', 'partial', 'not_evidenced'].includes(item.status) && text(item.evidence) && text(item.explanation)) || !Array.isArray(report.sections) || report.sections.length !== 4)
    throw Error('The review response was incomplete. Please try again.');
  const categories = new Set<string>();
  for (const section of report.sections) {
    if (!section || !Object.hasOwn(reviewLabels, section.category) || categories.has(section.category) ||
      !text(section.summary) || !Array.isArray(section.findings) || section.findings.length > 15)
      throw Error('The review response was incomplete. Please try again.');
    categories.add(section.category);
    for (const finding of section.findings) {
      if (!finding || !['high', 'medium', 'low'].includes(finding.severity) ||
        !['title', 'evidence', 'explanation', 'suggestion'].every(key => text(finding[key as keyof ReviewFinding])))
        throw Error('The review response was incomplete. Please try again.');
    }
  }
  return report;
}
