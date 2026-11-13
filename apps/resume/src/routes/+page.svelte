<script lang="ts">
  import StudioHeader from '$lib/components/StudioHeader.svelte';
  import StudioIllustration from '$lib/components/StudioIllustration.svelte';

  const sections = [
    { href: '/base', title: 'Base Resume', kind: 'base' as const, description: 'Load your master resume from the CMS, open a saved version or import a JSON file. Edit, save and export your resume.', action: 'Open Base Resume', color: 'text-indigo-600', background: 'bg-indigo-50/60' },
    { href: '/tailor', title: 'Tailor Resume', kind: 'tailor' as const, description: 'Compare your experience with a job description and create a tailored draft grounded in your existing experience.', action: 'Tailor your resume', color: 'text-violet-600', background: 'bg-violet-50/60' },
    { href: '/stress-test', title: 'Stress Test', kind: 'review' as const, description: 'Check ATS readability, job fit, grammar and terminology. Review the findings alongside an editable resume.', action: 'Stress test your resume', color: 'text-teal-700', background: 'bg-teal-50/60' },
  ];
</script>

<svelte:head><title>Resume Studio</title></svelte:head>

<StudioHeader />
<main class="mx-auto max-w-6xl px-4 py-12 md:px-7 md:py-20">
  <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Your next application starts here</h1>
  <p class="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">Build your resume, adapt it to a role or give it a closer review.</p>
  <div class="mt-9 grid gap-5 md:grid-cols-3">
    {#each sections as section}
      <a href={section.href} class="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
        <div class={`border-b border-stone-100 px-4 py-3 ${section.color} ${section.background}`}><StudioIllustration kind={section.kind} /></div>
        <div class="flex flex-1 flex-col p-6">
          <h2 class="text-xl font-semibold">{section.title}</h2>
          <p class="mt-3 flex-1 text-sm leading-relaxed text-stone-600">{section.description}</p>
          <span class={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${section.color}`}>{section.action}<span aria-hidden="true" class="transition-transform group-hover:translate-x-1">→</span></span>
        </div>
      </a>
    {/each}
  </div>
</main>
