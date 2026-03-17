<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const project = data.project;

	const year = new Date(project.year).getFullYear();
</script>

<article>
	<a href="/" class="mb-6 inline-block text-sm text-primary hover:underline">&larr; Back to projects</a>

	{#if typeof project.featuredImage === 'object' && project.featuredImage?.url}
		<img
			src={project.featuredImage.url}
			alt={project.featuredImage.alt}
			width={project.featuredImage.width ?? undefined}
			height={project.featuredImage.height ?? undefined}
			class="mb-6 w-full rounded-lg object-cover"
		/>
	{/if}

	<h1 class="font-display text-2xl font-bold text-foreground-1">{project.title}</h1>

	<div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground-4">
		<span>{year}</span>
		{#if project.client}
			<span>Client: {project.client}</span>
		{/if}
		{#if project.role}
			<span>Role: {project.role}</span>
		{/if}
		{#if project.isFeatured}
			<span class="text-warning-dark font-medium">Featured</span>
		{/if}
	</div>

	{#if project.collaborators?.length}
		<div class="mt-4 text-sm text-foreground-3">
			<span class="font-medium">Collaborators:</span>
			{project.collaborators.map((c) => c.name).join(', ')}
		</div>
	{/if}

	{#if project.links?.length}
		<div class="mt-3 flex flex-wrap gap-3">
			{#each project.links as link}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
				<a href={link.url} class="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">{link.label}</a>
			{/each}
		</div>
	{/if}

	{#if project.contentHtml}
		<div class="prose mt-8">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side -->
			{@html project.contentHtml}
		</div>
	{/if}
</article>
