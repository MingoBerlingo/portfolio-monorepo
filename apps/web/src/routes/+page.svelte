<script lang="ts">
	import { resolve } from '$app/paths';
	import AsciiMorph from '$lib/components/AsciiMorph.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section
	class="relative container mx-auto grid gap-8 rounded-xl bg-surface-1 p-5 sm:min-h-[60dvh] md:p-10 lg:grid-cols-2"
>
	<!-- CV Link -->
	<div
		class="absolute top-0 left-0 m-5 w-fit rounded-full bg-surface-3 px-4 py-1.5 font-display text-xl md:m-10 md:px-5 md:py-3"
	>
		CV
	</div>

	<!-- Introduction -->
	<div class="order-last flex flex-col justify-end lg:order-first">
		<h1 class="font-display text-2xl leading-[1.1] xl:text-4xl">
			<span class="sm:whitespace-nowrap"
				>Hey! <br class="block sm:hidden" />I’m Alessandro Quets.</span
			>
			<br />
			<span class="text-foreground-4 sm:whitespace-nowrap">I’m a Digital Designer & Frontend </span>
			<br class="hidden sm:block" />
			<span class="text-foreground-4 sm:whitespace-nowrap">Developer based in Lecco 🇮🇹</span>
		</h1>
	</div>

	<!-- ASCII animation -->
	<AsciiMorph class="mt-8 md:mt-0" />
</section>

<!-- Divider -->
<div class="h-5 md:h-20 xl:h-40"></div>

{#if data?.featuredProjects?.length}
	<section class="container mx-auto px-2 py-4" aria-labelledby="featured-heading">
		<div class="mb-6 flex items-baseline justify-between gap-4">
			<h2 id="featured-heading" class="font-display text-2xl text-foreground-1">
				Featured projects
			</h2>
			<a href={resolve('/projects')} class="text-sm text-primary hover:underline">View all</a>
		</div>
		<ul class="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
			{#each data.featuredProjects as project (project.id)}
				<li class="list-none">
					<ProjectCard {project} />
				</li>
			{/each}
		</ul>
	</section>
{/if}
