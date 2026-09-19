<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type MediaAsset = {
		url?: string | null;
		alt?: string | null;
		width?: number | null;
		height?: number | null;
		mimeType?: string | null;
	};

	function getCoverAsset(project: {
		videoCover?: MediaAsset | string | null;
		featuredImage?: MediaAsset | string | null;
	}): MediaAsset | null {
		if (typeof project.videoCover === 'object' && project.videoCover?.url)
			return project.videoCover;
		if (typeof project.featuredImage === 'object' && project.featuredImage?.url)
			return project.featuredImage;
		return null;
	}

	function isVideoAsset(
		asset: { mimeType?: string | null; url?: string | null } | null | undefined
	) {
		if (!asset?.url) return false;
		const mimeType = asset.mimeType?.toLowerCase() ?? '';
		if (mimeType.startsWith('video/')) return true;
		return /\.(mp4|webm|ogg|mov)$/i.test(asset.url);
	}

	function formatYear(value: string | Date | null | undefined) {
		if (!value) return '';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return String(value);
		return String(parsed.getFullYear());
	}
</script>

<section class="mx-auto max-w-7xl px-2 py-4 pb-10" aria-labelledby="projects-heading">
	<h1 id="projects-heading" class="sr-only">Projects</h1>
	<ul class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
		{#each data.projects as project (project.id)}
			{@const coverAsset = getCoverAsset(project)}
			{@const year = formatYear(project.year)}
			<li class="list-none">
				<a href={resolve(`/projects/${project.slug}`)} class="group block">
					<div class="overflow-clip rounded-xl border border-border bg-surface-1">
						<div class="bg-white ring-primary/30 group-focus-visible:ring-2 dark:bg-surface-1">
							{#if coverAsset?.url && isVideoAsset(coverAsset)}
								<video
									src={coverAsset.url}
									poster={typeof project.featuredImage === 'object' && project.featuredImage?.url
										? project.featuredImage.url
										: undefined}
									autoplay
									muted
									loop
									playsinline
									preload="metadata"
									class="block aspect-video w-full object-cover transition-transform motion-base group-hover:scale-110 group-focus-visible:scale-110"
								></video>
							{:else if coverAsset?.url}
								<img
									src={coverAsset.url}
									alt={coverAsset.alt ?? `${project.title} cover`}
									width={coverAsset.width ?? undefined}
									height={coverAsset.height ?? undefined}
									loading="lazy"
									class="block aspect-video w-full object-cover transition-transform motion-base group-hover:scale-110 group-focus-visible:scale-110"
								/>
							{:else}
								<div class="block aspect-video w-full bg-surface-2" aria-hidden="true"></div>
							{/if}
						</div>
					</div>
					<div
						class="mt-2 flex flex-col items-start gap-1 text-sm leading-snug text-foreground-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3.5"
					>
						<p class="m-0 flex items-center gap-2 sm:flex-1">
							<span
								class="h-1.5 w-0 shrink-0 rounded-full bg-foreground-1 opacity-0 transition-all motion-base group-hover:w-3 group-hover:opacity-100 group-focus-visible:w-3 group-focus-visible:opacity-100"
							></span>
							<span
								class="line-clamp-1 text-ellipsis transition-colors motion-base group-hover:text-foreground-1 group-focus-visible:text-foreground-1"
								>{project.tagline}</span
							>
						</p>
						<p
							class="mr-2 whitespace-nowrap transition-colors motion-base group-hover:text-foreground-1 group-focus-visible:text-foreground-1 sm:shrink-0"
						>
							{project.shortTitle}{year ? ` • ${year}` : ''}
						</p>
					</div>
				</a>
			</li>
		{/each}
	</ul>
</section>
