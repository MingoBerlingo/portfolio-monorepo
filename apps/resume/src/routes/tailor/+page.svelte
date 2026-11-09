<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import StudioHeader from "$lib/components/StudioHeader.svelte";
  import ResumeEditor from "$lib/components/ResumeEditor.svelte";
  import { tailorPrompt } from "$lib/tailor-prompt";
  import type { ResumeDocument, Locale } from "../../types";

  type Assessment = {
    score: number;
    scoreExplanation: string;
    strengths: { requirement: string; evidence: string }[];
    gaps: string[];
    sectionSuggestions: { section: string; reason: string }[];
  };
  type Result = Assessment & { document: ResumeDocument; changes: string[] };
  let source = $state<"cms" | "paste">("cms");
  let locale = $state<Locale>("en");
  let cmsResume = $state.raw<ResumeDocument | null>(null);
  let pastedResume = $state("");
  let job = $state("");
  let notes = $state("");
  let fitNotes = $state("");
  let notesOpen = $state(false);
  let step = $state<"source" | "job" | "clarify">("source");
  let questions = $state<string[]>([]);
  let answers = $state<string[]>([]);
  let loading = $state(false);
  let error = $state("");
  let assessment = $state.raw<Assessment | null>(null);
  let pendingDraft = $state.raw<Result | null>(null);
  let result = $state.raw<Result | null>(null);

  const steps = ["Starting Resume", "Job details", "Job fit", "Review draft"];
  const activeStep = $derived(result ? 3 : step === "source" ? 0 : step === "job" ? 1 : 2);

  async function chooseSource(event: SubmitEvent) {
    event.preventDefault();
    if (loading) return;
    error = "";
    if (source === "paste") {
      if (pastedResume.trim()) step = "job";
      return;
    }
    loading = true;
    try {
      const response = await fetch(`/api/resume?locale=${locale}`);
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "The CMS resume could not be loaded.");
      cmsResume = data;
      step = "job";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "The CMS resume could not be loaded.";
    } finally {
      loading = false;
    }
  }

  async function generate(skip = false) {
    if (loading) return;
    if (step === "clarify" && pendingDraft && !fitNotes.trim()) {
      result = pendingDraft;
      return;
    }
    loading = true;
    error = "";
    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          locale,
          cmsResume: source === "cms" ? cmsResume : undefined,
          pastedResume: source === "paste" ? pastedResume : "",
          job,
          notes,
          fitNotes: step === "clarify" ? fitNotes.trim() : undefined,
          clarifications: step === "clarify"
            ? questions.map((question, index) => ({ question, answer: skip ? "" : answers[index] }))
            : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "The draft could not be generated.");
      if (step === "job") {
        assessment = data;
        questions = data.questions ?? [];
        pendingDraft = "document" in data ? data : null;
        answers = questions.map(() => "");
        step = "clarify";
      } else {
        if (!("document" in data)) throw Error("No draft was returned. Try again.");
        result = data;
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "The draft could not be generated.";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Tailor Resume · Resume Studio</title></svelte:head>

{#snippet progress()}
  <ol aria-label="Tailoring progress" class="mb-5 grid grid-cols-4 gap-2 text-xs sm:gap-4">
    {#each steps as label, index}
      {@const completed = index < activeStep}
      <li aria-current={index === activeStep ? "step" : undefined}
        class="flex min-w-0 flex-col items-start gap-1.5 border-t-2 pt-2 sm:flex-row sm:items-center
          {index === activeStep ? 'border-indigo-600 font-semibold text-indigo-700' : completed ? 'border-indigo-200 text-stone-700' : 'border-stone-200 text-stone-500'}">
        <span aria-hidden="true" class="grid size-6 shrink-0 place-items-center rounded-full
          {index === activeStep ? 'bg-indigo-600 text-white' : completed ? 'bg-indigo-100 text-indigo-700' : 'bg-stone-100'}">
          {#if completed}<Icon name="check" />{:else}{index + 1}{/if}
        </span>
        <span>{label}</span>
      </li>
    {/each}
  </ol>
{/snippet}

{#snippet jobFit(fit: Assessment, preliminary = false, showScore = true)}
  <div class="grid gap-4 text-sm">
    <div>
      {#if showScore}<h2 class="text-lg font-semibold">{fit.score}% estimated match</h2>{/if}
      {#if preliminary}<p class="mt-1 text-xs text-stone-500">Based on the information available so far</p>{/if}
      <p class="mt-2 max-w-3xl">{fit.scoreExplanation}</p>
    </div>
    <div>
      <h3 class="font-semibold">Why you match</h3>
      {#if fit.strengths.length}
        <ul class="mt-1 list-disc space-y-1 pl-5">
          {#each fit.strengths as strength}
            <li><strong>{strength.requirement}</strong> — {strength.evidence}</li>
          {/each}
        </ul>
      {:else}
        <p class="mt-1 text-stone-600">No clear matches were found in the available Resume evidence.</p>
      {/if}
    </div>
    {#if fit.gaps.length}
      <div>
        <h3 class="font-semibold">Requirements to review</h3>
        <ul class="mt-1 list-disc space-y-1 pl-5">
          {#each fit.gaps as gap}<li>{gap}</li>{/each}
        </ul>
      </div>
    {/if}
    {#if fit.sectionSuggestions.length}
      <div>
        <h3 class="font-semibold">Sections to consider leaving out</h3>
        <ul class="mt-1 list-disc space-y-1 pl-5">
          {#each fit.sectionSuggestions as suggestion}
            <li><strong>{suggestion.section}</strong> — {suggestion.reason}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
{/snippet}

{#if result}
  {@const draft = result}
  <ResumeEditor initialDocument={draft.document}>
    {#snippet overview()}
      <section aria-labelledby="fit-heading" class="border-b border-stone-200 bg-white px-4 py-5 md:px-7">
        {@render progress()}
        <h1 id="fit-heading" class="mb-3 text-lg font-semibold">Review draft</h1>
        <details class="group max-w-3xl rounded-lg border border-stone-200">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {draft.score}% estimated match
            <span class="group-open:rotate-180"><Icon name="down" /></span>
          </summary>
          <div class="px-3 pb-3">{@render jobFit(draft, false, false)}</div>
        </details>
        {#if draft.changes.length}
          <h2 class="mt-4 text-sm font-semibold">What changed</h2>
          <ul class="mt-1 max-w-3xl list-disc space-y-1 pl-5 text-sm">
            {#each draft.changes as change}<li>{change}</li>{/each}
          </ul>
        {/if}
      </section>
    {/snippet}
  </ResumeEditor>
{:else}
  <StudioHeader />
  <main class="mx-auto max-w-3xl px-4 py-8 md:px-7">
    <h1 class="mb-5 text-2xl font-semibold">Tailor Resume</h1>
    {@render progress()}
    <div class="rounded-xl border border-stone-200 bg-white p-5 md:p-7">
      {#if step === "source"}
        <form class="grid gap-4" onsubmit={chooseSource}>
          <fieldset disabled={loading} class="grid gap-3">
            <legend class="mb-3 font-semibold">Choose a starting resume</legend>
            <label class="flex items-center gap-2"><input type="radio" bind:group={source} value="cms" /> Load from CMS</label>
            <label class="flex items-center gap-2"><input type="radio" bind:group={source} value="paste" /> Paste Resume</label>
          </fieldset>
          <label class="grid justify-items-start gap-2 text-sm">
            Resume language
            <select bind:value={locale} disabled={loading}><option value="en">🇬🇧 EN</option><option value="it">🇮🇹 IT</option></select>
          </label>
          {#if source === "paste"}
            <label class="grid gap-2 text-sm">
              Resume text
              <textarea required bind:value={pastedResume} maxlength={30000} rows="9"
                class="rounded-lg border border-stone-300 p-3"></textarea>
            </label>
          {/if}
          <button class="button primary justify-self-start" disabled={loading || (source === "paste" && !pastedResume.trim())}>Continue</button>
        </form>
      {:else if step === "job"}
        <form class="grid gap-4" onsubmit={(event) => { event.preventDefault(); void generate(); }}>
          <h2 class="font-semibold">Add the job description</h2>
          <label class="grid gap-2 text-sm">
            Job description
            <textarea required bind:value={job} maxlength={20000} rows="9" disabled={loading}
              class="rounded-lg border border-stone-300 p-3"></textarea>
          </label>
          <div>
            <button type="button" class="button" aria-expanded={notesOpen} aria-controls="tailor-notes"
              onclick={() => { notesOpen = !notesOpen; }}>
              <Icon name={notesOpen ? "subtract" : "add"} />
              {notesOpen ? "Hide notes" : notes.trim() ? "Show notes" : "Add notes"}
            </button>
            <label id="tailor-notes" hidden={!notesOpen} class="mt-3 grid gap-2 text-sm">
              Additional notes (optional)
              <textarea bind:value={notes} maxlength={4000} rows="3" disabled={loading}
                class="rounded-lg border border-stone-300 p-3"></textarea>
            </label>
          </div>
          <p class="text-sm text-stone-600">
            {source === "paste"
              ? "Submitting sends the pasted resume, job description and notes to OpenAI. Remove any personal details you prefer to keep private before continuing."
              : "Submitting sends Resume work and education details, the job description and notes to OpenAI. Contact fields stay in Resume Studio."}
          </p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="button" disabled={loading} onclick={() => { error = ""; step = "source"; }}>Back</button>
            <button class="button primary" disabled={loading || !job.trim()}>Tailor Resume</button>
          </div>
        </form>
      {:else if assessment}
        {@render jobFit(assessment, questions.length > 0)}
        <form class="mt-5 grid gap-4 border-t border-stone-200 pt-5" onsubmit={(event) => { event.preventDefault(); void generate(); }}>
          {#if questions.length}
            <h2 class="font-semibold">Clarifications</h2>
            {#each questions as question, index}
              <label class="grid gap-2 text-sm">
                {question}
                <textarea bind:value={answers[index]} maxlength={2000} rows="2" disabled={loading}
                  class="rounded-lg border border-stone-300 p-3"></textarea>
              </label>
            {/each}
          {/if}
          <label class="grid gap-2 text-sm">
            Notes (optional)
            <textarea bind:value={fitNotes} maxlength={4000} rows="3" disabled={loading}
              placeholder="Add relevant experience, tools, or context the assessment may have missed."
              class="rounded-lg border border-stone-300 p-3"></textarea>
          </label>
          <div class="flex flex-wrap gap-2">
            {#if questions.length}
              <button type="button" class="button" disabled={loading} onclick={() => generate(true)}>Skip questions</button>
              <button class="button primary" disabled={loading || (!fitNotes.trim() && !answers.some((answer) => answer.trim()))}>Continue with details</button>
            {:else}
              <button class="button primary" disabled={loading}>{fitNotes.trim() ? "Update draft with notes" : "Review draft"}</button>
            {/if}
          </div>
        </form>
      {/if}
      {#if step !== "source"}
        <details class="mt-5 border-t border-stone-200 pt-4 text-sm">
          <summary class="cursor-pointer font-medium">Tailoring prompt</summary>
          <div class="mt-3 whitespace-pre-wrap break-words rounded-lg bg-stone-50 p-4 text-stone-700">{tailorPrompt}</div>
        </details>
      {/if}
      {#if loading}<p role="status" class="mt-4 text-sm">{step === "source" ? "Loading your CMS resume…" : "Working on your resume…"}</p>{/if}
    </div>
  </main>
{/if}

{#if error}
  <div class="notice error flex w-max items-start gap-3">
    <p role="alert">{error}</p>
    <button type="button" class="icon-button shrink-0" aria-label="Dismiss error"
      onclick={() => { error = ""; }}><Icon name="close" /></button>
  </div>
{/if}
