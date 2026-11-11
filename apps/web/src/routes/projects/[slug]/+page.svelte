<script lang="ts">
	import MediaFrame from '$lib/components/MediaFrame.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import ProjectGallery from '$lib/components/ProjectGallery.svelte';
	import { scrambleExternalLinks } from '$lib/actions/scrambleHover';
	import ScrambleLinkText from '$lib/components/ScrambleLinkText.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let article = $state<HTMLElement>();
	const project = $derived(data.project);

	const parsedYear = $derived(new Date(project.year));
	const year = $derived(Number.isNaN(parsedYear.getTime()) ? project.year : String(parsedYear.getFullYear()));

	function isVideoAsset(
		asset: { mimeType?: string | null; url?: string | null } | null | undefined
	) {
		if (!asset?.url) return false;
		const mimeType = asset.mimeType?.toLowerCase() ?? '';
		if (mimeType.startsWith('video/')) return true;
		return /\.(mp4|webm|ogg|mov)$/i.test(asset.url);
	}
</script>

<article bind:this={article} class="mx-auto max-w-5xl space-y-10 pb-20">
	<section class="pt-8" aria-label="Project intro">
		<div class="space-y-5">
			<div class="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
				<p class="text-lg text-foreground-2">{project.shortTitle} • {year}</p>

				{#if project.links?.length}
					<div class="flex flex-wrap gap-x-5 gap-y-2">
						{#each project.links as link (link.url)}
							<a
								href={link.url}
								class="text-base inline-flex items-center gap-1.5 underline-offset-4 transition-colors hover:underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								<ScrambleLinkText text={link.label} />
								<Icon name="launch" size={16} fill="currentColor" />
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<h1 class="md:text-6xl max-w-4xl text-4xl tracking-tight text-foreground-1 sm:text-5xl">
				{project.tagline}
			</h1>
		</div>
	</section>

	{#if typeof project.videoCover === 'object' && project.videoCover?.url && isVideoAsset(project.videoCover)}
		<figure class="overflow-hidden rounded-xl border border-border bg-surface-1">
			<MediaFrame
				asset={project.videoCover}
				video
				eager
				instant
				class="block aspect-[16/10] w-full object-cover"
			/>
		</figure>
	{:else if typeof project.featuredImage === 'object' && project.featuredImage?.url}
		<figure class="overflow-hidden rounded-xl border border-border bg-surface-1">
			<MediaFrame
				asset={project.featuredImage}
				eager
				instant
				class="block aspect-[16/10] w-full object-cover"
			/>
		</figure>
	{/if}

	<section class="border-b border-border pb-8" aria-label="Project metadata">
		<dl class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#if project.role}
				<div>
					<dt class="mb-3 text-sm font-normal tracking-normal text-primary">Role</dt>
					<dd class="mt-1 text-lg text-foreground-1">{project.role}</dd>
				</div>
			{/if}
			{#if project.output}
				<div>
					<dt class="mb-3 text-sm font-normal tracking-normal text-primary">Output</dt>
					<dd class="mt-1 text-lg text-foreground-1">{project.output}</dd>
				</div>
			{/if}
			{#if project.client}
				<div>
					<dt class="mb-3 text-sm font-normal tracking-normal text-primary">Client</dt>
					<dd class="mt-1 text-lg text-foreground-1">{project.client}</dd>
				</div>
			{/if}
			<div>
				<dt class="mb-3 text-sm font-normal tracking-normal text-primary">Year</dt>
				<dd class="mt-1 text-lg text-foreground-1">{year}</dd>
			</div>
		</dl>
	</section>

	{#if project.contentHtml}
		<section id="overview" class="pt-2">
			<div
				use:scrambleExternalLinks
				id="content"
				class="rich-text rich-text--project prose md:prose-lg"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side -->
				{@html project.contentHtml}
			</div>
		</section>
	{/if}

	{#if data.suggestedProjects.length}
		<section class="pt-20 md:pt-28" aria-labelledby="other-projects-heading">
			<h2 id="other-projects-heading" class="mb-6 font-display text-2xl text-foreground-1">Other projects</h2>
			<ul class="grid grid-cols-2 gap-4 md:gap-6">
				{#each data.suggestedProjects as suggestion (suggestion.id)}
					<li class="min-w-0 list-none"><ProjectCard project={suggestion} /></li>
				{/each}
			</ul>
		</section>
	{/if}
</article>

{#key project.id}
	<ProjectGallery root={article} />
{/key}
