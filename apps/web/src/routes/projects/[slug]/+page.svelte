<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const project = data.project;

	const parsedYear = new Date(project.year);
	const year = Number.isNaN(parsedYear.getTime()) ? project.year : String(parsedYear.getFullYear());
	const collaborators = project.collaborators?.map((c) => c.name).join(', ');
	const collaboratorsCount = project.collaborators?.length ?? 0;
	const teamLabel = collaboratorsCount
		? `${collaboratorsCount} collaborator${collaboratorsCount > 1 ? 's' : ''}`
		: 'Solo';

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
	<section class="space-y-5 pt-8" aria-label="Project intro">
		<p class="text-base text-foreground-2">{project.client ?? 'Project'} • {year}</p>
		<h1 class="md:text-6xl max-w-4xl text-4xl tracking-tight text-foreground-1 sm:text-5xl">
			{project.title}
		</h1>
		{#if project.role}
			<p class="max-w-4xl text-lg text-foreground-3 md:text-xl">
				A {project.role.toLowerCase()} project crafted to make the core experience clearer, faster, and
				easier to navigate.
			</p>
		{/if}
		{#if project.links?.length}
			<div class="flex flex-wrap gap-3 pt-1">
				{#each project.links as link (link.url)}
					<a
						href={link.url}
						class="text-base inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-5 py-2.5 text-foreground-1 transition-colors hover:border-border-contrast"
						target="_blank"
						rel="noopener noreferrer"
					>
						{link.label}
						<Icon name="arrow-up-right" size={16} fill="currentColor" />
					</a>
				{/each}
			</div>
		{/if}
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
					<dt class="text-base text-foreground-3">Role</dt>
					<dd class="mt-1 text-xl text-foreground-1">{project.role}</dd>
				</div>
			{/if}
			<div>
				<dt class="text-base text-foreground-3">Timeline</dt>
				<dd class="mt-1 text-xl text-foreground-1">{year}</dd>
			</div>
			<div>
				<dt class="text-base text-foreground-3">Team</dt>
				<dd class="mt-1 text-xl text-foreground-1">{teamLabel}</dd>
			</div>
			{#if project.client}
				<div>
					<dt class="text-base text-foreground-3">Client</dt>
					<dd class="mt-1 text-xl text-foreground-1">{project.client}</dd>
				</div>
			{/if}
		</dl>
	</section>

	{#if project.contentHtml}
		<section id="overview" class="space-y-5 pt-2">
			<p class="text-sm tracking-wide text-primary">Overview</p>
			<h2 class="max-w-4xl text-3xl leading-tight tracking-tight text-foreground-1 sm:text-4xl">
				{project.title}
			</h2>
			<div
				id="content"
				class="prose max-w-none md:prose-lg prose-headings:tracking-tight prose-headings:text-foreground-1 prose-p:leading-relaxed prose-p:text-foreground-2"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side -->
				{@html project.contentHtml}
			</div>
		</section>
	{/if}

	{#if collaborators}
		<section class="border-t border-border pt-8" aria-label="Collaborators">
			<p class="text-base text-foreground-3">Collaborators</p>
			<p class="mt-2 text-xl text-foreground-1">{collaborators}</p>
		</section>
	{/if}
</article>
