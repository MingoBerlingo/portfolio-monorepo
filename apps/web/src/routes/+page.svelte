<script lang="ts">
	import { entrance } from '$lib/actions/entrance';
	import ScrambleLinkText from '$lib/components/ScrambleLinkText.svelte';
	import RevealText from '$lib/components/RevealText.svelte';
	import { resolve } from '$app/paths';
	import AsciiMorph from '$lib/components/AsciiMorph.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import ScrollIntroduction from '$lib/components/ScrollIntroduction.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section use:entrance class="mx-auto max-w-5xl px-2 pt-4 md:pt-6 xl:pt-8" aria-label="Introduction">
	<div class="w-full">
		<div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 lg:gap-8">
			<h1 data-enter class="font-display text-2xl leading-[1.15] md:text-4xl md:leading-[1.15]">
				<RevealText text={data?.hero?.greeting || 'Hey!'} />
				<span class="whitespace-nowrap md:whitespace-normal"
					><RevealText text={data?.hero?.nameLine || 'I’m Alessandro Quets.'} /></span
				>
				<br />
				<RevealText
					text={data?.hero?.introduction ||
						'I’m a Digital Designer & Frontend Developer based in Lecco, Italy 🇮🇹'}
				/>
			</h1>

		</div>

		<div data-enter class="py-8 md:py-12 xl:py-14">
			<AsciiMorph
				class="text-[clamp(0.6rem,3.2vw,1.5rem)] leading-[1.2] sm:text-[clamp(0.6rem,3.2vw,1.5rem)] md:text-[clamp(0.6rem,3.2vw,1.5rem)] lg:text-[clamp(0.65rem,1.7vw,1.5rem)]"
			/>
		</div>
	</div>
</section>

<ScrollIntroduction hero={data?.hero} />

{#if data?.featuredProjects?.length}
	<section class="mx-auto max-w-5xl px-2 py-4 pb-10" aria-labelledby="featured-heading">
		<div class="mb-6 flex items-baseline justify-between gap-4">
			<h2 id="featured-heading" class="font-display text-2xl text-foreground-1">
				Featured projects
			</h2>
			<a
				href={resolve('/projects')}
				class="text-sm text-foreground-1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
				><ScrambleLinkText text="View all" /></a
			>
		</div>
		<ul class="flex flex-col gap-6 md:gap-8">
			{#each data.featuredProjects as project (project.id)}
				<li class="list-none">
					<ProjectCard {project} />
				</li>
			{/each}
		</ul>
	</section>
{/if}
