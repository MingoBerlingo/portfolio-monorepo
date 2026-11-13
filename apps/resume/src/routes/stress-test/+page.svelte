<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import StudioHeader from '$lib/components/StudioHeader.svelte';
  import ResumeEditor from '$lib/components/ResumeEditor.svelte';
  import { listVersions } from '../../history';
  import { normalizeResume, fingerprint } from '../../model';
  import { reviewLabels, type StressReport, type PdfEvidence } from '../../stress-test';
  import type { ResumeDocument, SavedVersion, Locale } from '../../types';

  let source = $state<'pdf' | 'cms' | 'saved'>('pdf');
  let locale = $state<Locale>('en');
  let versions = $state.raw<SavedVersion[]>([]);
  let versionId = $state('');
  let file = $state<File | null>(null);
  let originalPdfUrl = $state('');
  let originalEvidence = $state.raw<PdfEvidence | null>(null);
  onDestroy(() => { if (originalPdfUrl) URL.revokeObjectURL(originalPdfUrl); });
  let job = $state('');
  let loading = $state(false);
  let error = $state('');
  let storageError = $state('');
  let report = $state.raw<StressReport | null>(null);
  let evidence = $state.raw<PdfEvidence | null>(null);
  let initialDocument = $state.raw<ResumeDocument | undefined>();
  let currentDocument = $state.raw<ResumeDocument | undefined>();
  let reviewedFingerprint = $state('');
  let reviewedJob = $state('');
  let reportLanguage = $state<Locale>('en');
  const stale = $derived(Boolean(report && currentDocument && (fingerprint(currentDocument) !== reviewedFingerprint || job !== reviewedJob)));

  onMount(() => {
    try { versions = listVersions(); versionId = versions[0]?.id ?? ''; }
    catch { storageError = 'Saved versions could not be read from this browser. You can still use a PDF or the master resume.'; }
  });
  function selectFile(event: Event) {
    const selected = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
    error = '';
    if (originalPdfUrl) URL.revokeObjectURL(originalPdfUrl);
    originalPdfUrl = '';
    file = selected;
    if (selected && selected.size > 10 * 1024 * 1024) { file = null; error = 'Choose a PDF smaller than 10 MB.'; }
    if (file) originalPdfUrl = URL.createObjectURL(file);
  }
  async function run() {
    if (loading) return;
    loading = true; error = '';
    try {
      let document = currentDocument;
      if (!document && source === 'cms') {
        const response = await fetch(`/api/resume?locale=${locale}`);
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'The master resume could not be loaded.');
        document = normalizeResume(data, locale);
      } else if (!document && source === 'saved') {
        const version = versions.find(item => item.id === versionId);
        if (!version) throw Error('Choose a saved version.');
        document = normalizeResume(version.document);
      }
      const form = new FormData();
      form.set('job', job); form.set('locale', document?.locale ?? locale);
      if (document) form.set('document', JSON.stringify(document));
      else if (file) form.set('pdf', file);
      else throw Error('Choose a PDF or another resume source.');
      const response = await fetch('/api/stress-test', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'The review could not be completed.');
      const imported = normalizeResume(data.document);
      if (!initialDocument) { initialDocument = imported; currentDocument = imported; }
      report = data.report; evidence = data.evidence;
      if (data.evidence.kind === 'uploaded') originalEvidence = data.evidence;
      reportLanguage = imported.locale;
      reviewedFingerprint = fingerprint(imported); reviewedJob = job;
    } catch (cause) { error = cause instanceof Error ? cause.message : 'The review could not be completed.'; }
    finally { loading = false; }
  }
  function downloadReport() {
    if (!report) return;
    const lines = ['# Resume stress test', '', report.summary, '', '## Strengths', ...report.strengths.map(item => `- ${item.claim} — ${item.evidence}`)];
    lines.push('', '## Requirements');
    for (const item of report.requirements) lines.push('', `- ${item.requirement} (${item.status}): ${item.evidence} ${item.explanation}`);
    for (const section of report.sections) {
      lines.push('', `## ${reviewLabels[section.category]}`, '', section.summary);
      for (const finding of section.findings) lines.push('', `### ${finding.title} (${finding.severity})`, '', `Evidence: ${finding.evidence}`, '', finding.explanation, '', `Suggestion: ${finding.suggestion}`);
    }
    if (stale) lines.push('', 'This report predates the current resume or job description edits.');
    lines.push('', 'ATS findings are a limited PDF extraction review, not a guarantee of compatibility with a specific recruiting system.');
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'resume-stress-test.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<svelte:head><title>Stress Test · Resume Studio</title></svelte:head>

{#snippet reportPanel()}
  <details open class="group rounded-xl border border-stone-200 bg-white p-5" aria-label="Stress test report">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-xl font-semibold [&::-webkit-details-marker]:hidden">
      Stress Test report
      <svg aria-hidden="true" class="size-5 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
    </summary>
    {#if report}
      <p class="mt-3 text-sm leading-relaxed">{report.summary}</p>
      {#if stale}<p role="status" class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The resume or job description has changed. Rerun to review your edits.</p>{/if}
      {#if originalPdfUrl}<a class="button mt-4 inline-flex" href={originalPdfUrl} target="_blank" rel="noopener">View original PDF</a>{/if}
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="button primary" disabled={loading || !job.trim()} onclick={run}>{loading ? 'Reviewing…' : 'Rerun stress test'}</button>
        <button class="button" onclick={downloadReport}>Download report</button>
      </div>
      <details class="mt-4"><summary class="cursor-pointer text-sm font-medium">Job description</summary><textarea aria-label="Job description" bind:value={job} maxlength={20000} rows="6" disabled={loading} class="mt-2 w-full rounded-lg border border-stone-300 p-3 text-sm"></textarea></details>
      <h2 class="mt-6 font-semibold">{reportLanguage === 'it' ? 'Punti di forza' : 'Strengths'}</h2>
      <ul class="mt-2 list-disc space-y-2 pl-5 text-sm">{#each report.strengths as strength}<li>{strength.claim}<blockquote class="mt-1 text-xs text-stone-500">{strength.evidence}</blockquote></li>{/each}</ul>
      <h2 class="mt-6 font-semibold">{reportLanguage === 'it' ? 'Requisiti ed evidenze' : 'Requirements and evidence'}</h2>
      {#each report.requirements as item}
        <article class="mt-3 rounded-lg border border-stone-200 p-3 text-sm">
          <span class="text-xs font-medium text-stone-500">{item.status === 'met' ? (reportLanguage === 'it' ? 'Dimostrato' : 'Supported') : item.status === 'partial' ? (reportLanguage === 'it' ? 'Parziale' : 'Partial') : (reportLanguage === 'it' ? 'Non documentato' : 'Not evidenced')}</span>
          <h3 class="mt-1 font-semibold">{item.requirement}</h3>
          <blockquote class="mt-2 text-xs text-stone-500">{item.evidence}</blockquote>
          <p class="mt-2">{item.explanation}</p>
        </article>
      {/each}
      {#each report.sections as section}
        <section class="mt-6 border-t border-stone-200 pt-4">
          <h2 class="font-semibold">{reviewLabels[section.category]}</h2>
          <p class="mt-2 text-sm leading-relaxed text-stone-600">{section.summary}</p>
          {#each section.findings as finding}
            <article class="mt-3 rounded-lg border border-stone-200 p-3">
              <p class="text-xs font-semibold uppercase" class:text-red-700={finding.severity === 'high'}>{finding.severity}</p>
              <h3 class="mt-1 text-sm font-semibold">{finding.title}</h3>
              <blockquote class="mt-2 whitespace-pre-wrap border-l-2 border-stone-300 pl-3 text-sm text-stone-600">{finding.evidence}</blockquote>
              <p class="mt-2 text-sm">{finding.explanation}</p>
              <p class="mt-2 text-sm"><strong>{reportLanguage === 'it' ? 'Suggerimento' : 'Suggestion'}</strong> {finding.suggestion}</p>
            </article>
          {/each}
        </section>
      {/each}
      {#if originalEvidence && evidence?.kind === 'generated'}
        <details class="mt-6 border-t border-stone-200 pt-4">
          <summary class="cursor-pointer text-sm font-medium">Original PDF extraction</summary>
          {#each originalEvidence.pages as page}<details class="mt-3"><summary class="text-sm">Page {page.number} · {page.characters} characters</summary><pre class="mt-2 whitespace-pre-wrap break-words text-xs">{page.text}</pre></details>{/each}
        </details>
      {/if}
      {#if evidence}
        <details class="mt-6 border-t border-stone-200 pt-4">
          <summary class="cursor-pointer text-sm font-medium">PDF extraction evidence</summary>
          <p class="mt-2 text-xs text-stone-500">{evidence.kind === 'uploaded' ? 'Original uploaded PDF' : 'PDF generated from the editable resume'}. Extraction order shown below. This checks the text layer and reading order, not compatibility with a specific ATS.</p>
          {#each evidence.warnings as warning}<p class="mt-2 text-sm text-amber-800">{warning}</p>{/each}
          {#each evidence.pages as page}<details class="mt-3"><summary class="text-sm">Page {page.number} · {page.characters} characters</summary><pre class="mt-2 whitespace-pre-wrap break-words text-xs">{page.text}</pre></details>{/each}
        </details>
      {/if}
    {/if}
    {#if error}<p role="alert" class="mt-4 text-sm text-red-700">{error}</p>{/if}
  </details>
{/snippet}

{#if initialDocument}
  <ResumeEditor {initialDocument} review={reportPanel} ondocumentchange={(document) => currentDocument = document} />
{:else}
  <StudioHeader />
  <main class="mx-auto max-w-3xl px-4 py-10">
    <h1 class="text-3xl font-semibold">Stress test your resume</h1>
    <p class="mt-3 text-stone-600">Check PDF readability, job fit, grammar and consistent terminology. Review suggestions alongside an editable copy.</p>
    <form class="mt-7 grid gap-5 rounded-xl border border-stone-200 bg-white p-6" onsubmit={(event) => { event.preventDefault(); void run(); }}>
      <label class="grid gap-2 text-sm font-medium">Resume source
        <select bind:value={source} disabled={loading} class="rounded-lg border border-stone-300 p-3">
          <option value="pdf">Upload PDF</option><option value="cms">Master resume (CMS)</option><option value="saved">Saved version</option>
        </select>
      </label>
      {#if source === 'pdf'}
        <label class="grid gap-2 text-sm font-medium">PDF resume<input type="file" accept="application/pdf,.pdf" onchange={selectFile} disabled={loading} /></label>
        <p class="text-sm text-stone-500">Up to 10 MB and 12 pages. Use a PDF with selectable text. The editable copy uses Resume Studio’s layout; check the transcription against your original.</p>
      {:else if source === 'saved'}
        {#if storageError}<p role="alert" class="text-sm text-red-700">{storageError}</p>{/if}
        {#if versions.length}<label class="grid gap-2 text-sm font-medium">Saved version<select bind:value={versionId} disabled={loading} class="rounded-lg border border-stone-300 p-3">{#each versions as version}<option value={version.id}>{version.name} · {version.document.locale.toUpperCase()}</option>{/each}</select></label>
        {:else}<p class="text-sm text-stone-500">No saved versions available. Save a version in Base Resume or choose another source.</p>{/if}
      {/if}
      {#if source !== 'saved'}<label class="grid gap-2 text-sm font-medium">Resume language<select bind:value={locale} disabled={loading} class="rounded-lg border border-stone-300 p-3"><option value="en">English</option><option value="it">Italiano</option></select></label>{/if}
      <label class="grid gap-2 text-sm font-medium">Job description<textarea bind:value={job} maxlength={20000} rows="9" required disabled={loading} class="rounded-lg border border-stone-300 p-3" placeholder="Paste the job description here"></textarea></label>
      <p class="text-sm text-stone-600">Running this review sends the resume’s extracted text, including any contact details in the PDF, and the job description to OpenAI. PDF extraction happens locally. Suggested corrections are reviewed manually in the editor.</p>
      <button class="button primary justify-self-start" disabled={loading || !job.trim() || (source === 'pdf' && !file) || (source === 'saved' && !versionId)}>{loading ? 'Inspecting PDF and reviewing resume…' : 'Run stress test'}</button>
      {#if loading}<p role="status" class="text-sm text-stone-600">This can take a minute. Keep this page open.</p>{/if}
      {#if error}<p role="alert" class="text-sm text-red-700">{error}</p>{/if}
    </form>
  </main>
{/if}
