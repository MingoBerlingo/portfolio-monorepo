<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const project = data.project;

	const parsedYear = new Date(project.year);
	const year = Number.isNaN(parsedYear.getTime()) ? project.year : String(parsedYear.getFullYear());
	const collaborators = project.collaborators?.map((c) => c.name).join(', ');

	function isVideoAsset(
		asset: { mimeType?: string | null; url?: string | null } | null | undefined
	) {
		if (!asset?.url) return false;
		const mimeType = asset.mimeType?.toLowerCase() ?? '';
		if (mimeType.startsWith('video/')) return true;
		return /\.(mp4|webm|ogg|mov)$/i.test(asset.url);
	}
</script>

<article class="mx-auto max-w-5xl space-y-10 pb-20">
	<section class="pt-8" aria-label="Project intro">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
			<div class="space-y-5">
				<p class="text-lg text-foreground-2">{project.shortTitle} • {year}</p>
				<h1 class="md:text-6xl max-w-4xl text-4xl tracking-tight text-foreground-1 sm:text-5xl">
					{project.tagline}
				</h1>
			</div>

			{#if project.links?.length}
				<div class="flex flex-wrap gap-x-5 gap-y-2 sm:shrink-0 sm:justify-end">
					{#each project.links as link (link.url)}
						<a
							href={link.url}
							class="text-base inline-flex items-center gap-1.5 underline-offset-4 transition-colors hover:underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							{link.label}
							<Icon name="launch" size={16} fill="currentColor" />
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</section>

	{#if typeof project.videoCover === 'object' && project.videoCover?.url && isVideoAsset(project.videoCover)}
		<figure class="overflow-hidden rounded-xl border border-border bg-surface-1">
			<video
				src={project.videoCover.url}
				poster={typeof project.featuredImage === 'object' && project.featuredImage?.url
					? project.featuredImage.url
					: undefined}
				autoplay
				muted
				loop
				playsinline
				preload="metadata"
				class="aspect-[16/10] w-full object-cover"
			></video>
		</figure>
	{:else if typeof project.featuredImage === 'object' && project.featuredImage?.url}
		<figure class="overflow-hidden rounded-xl border border-border bg-surface-1">
			<img
				src={project.featuredImage.url}
				alt={project.featuredImage.alt}
				width={project.featuredImage.width ?? undefined}
				height={project.featuredImage.height ?? undefined}
				loading="lazy"
				class="aspect-[16/10] w-full object-cover"
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
				id="content"
				class="prose max-w-none md:prose-lg prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-foreground-1 prose-h1:mb-3 prose-h1:text-sm prose-h1:tracking-normal prose-h1:text-primary prose-h2:mt-0 prose-h2:mb-5 prose-h2:text-3xl sm:prose-h2:text-4xl prose-p:text-xl prose-p:leading-tight prose-p:text-foreground-2 [&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_video]:block [&_video]:w-full [&_video]:rounded-xl [&_video]:border [&_video]:border-border"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side -->
				{@html project.contentHtml}
			</div>
		</section>
	{/if}

	{#if collaborators}
		<section class="border-t border-border pt-8" aria-label="Collaborators">
			<p class="text-base text-foreground-3">Collaborators</p>
			<p class="mt-2 text-lg text-foreground-1">{collaborators}</p>
		</section>
	{/if}
</article>
