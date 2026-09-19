<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import { cn } from '$lib/utils/cn';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="mx-auto max-w-5xl px-2 py-4 pb-10" aria-labelledby="projects-heading">
	<h1 id="projects-heading" class="sr-only">Projects</h1>
	<ul class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
		{#each data.projects as project (project.id)}
			<li class={cn('list-none', project.isFeatured && 'md:col-span-2')}>
				<ProjectCard {project} />
			</li>
		{/each}
	</ul>
</section>
