<script lang="ts">
	import ExperienceList from '$lib/components/ExperienceList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const profile = data.profile;
</script>

<section class="mx-auto max-w-5xl px-2 py-4 pb-10">
	<p class="mb-3 text-sm font-normal tracking-normal text-primary">Introduction</p>
	{#if profile.presentationHtml}
		<div
			class="prose max-w-none pb-8 md:prose-lg prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-foreground-1 prose-h1:mb-3 prose-h1:text-sm prose-h1:tracking-normal prose-h1:text-primary prose-h2:mt-0 prose-h2:mb-5 prose-h2:text-3xl sm:prose-h2:text-4xl prose-p:text-xl prose-p:leading-tight prose-p:text-foreground-2 [&_a]:text-primary [&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_strong]:text-foreground-1"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side -->
			{@html profile.presentationHtml}
		</div>
	{/if}

	<p class="mt-10 mb-3 text-sm font-normal tracking-normal text-primary">Experiences</p>
	<ExperienceList experiences={data.experiences} />
</section>
