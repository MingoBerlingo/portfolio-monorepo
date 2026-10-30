<script lang="ts">
	import { resolve } from '$app/paths';

	type MediaAsset = {
		url?: string | null;
		alt?: string | null;
		width?: number | null;
		height?: number | null;
		mimeType?: string | null;
	};

	type ProjectCardProps = {
		project: {
			slug: string;
			title: string;
			shortTitle: string;
			tagline: string;
			year: string | Date | null;
			videoCover?: MediaAsset | string | null;
			featuredImage?: MediaAsset | string | null;
		};
	};

	let { project }: ProjectCardProps = $props();

	const coverAsset = $derived(getCoverAsset());
	const year = $derived(formatYear(project.year));

	function getCoverAsset(): MediaAsset | null {
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

<a href={resolve(`/projects/${project.slug}`)} class="project-card group block">
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
					class="project-cover block aspect-video w-full object-cover"
				></video>
			{:else if coverAsset?.url}
				<img
					src={coverAsset.url}
					alt={coverAsset.alt ?? `${project.title} cover`}
					width={coverAsset.width ?? undefined}
					height={coverAsset.height ?? undefined}
					loading="lazy"
					class="project-cover block aspect-video w-full object-cover"
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
			<span class="project-indicator h-1.5 w-3 shrink-0 rounded-full bg-foreground-1"></span>
			<span
				class="line-clamp-1 text-ellipsis transition-colors motion-base group-hover:text-foreground-1 group-focus-visible:text-foreground-1"
				>{project.tagline}</span
			>
		</p>
		<p
			class="mx-2 whitespace-nowrap transition-colors motion-base group-hover:text-foreground-1 group-focus-visible:text-foreground-1 sm:shrink-0"
		>
			{project.shortTitle}{year ? ` • ${year}` : ''}
		</p>
	</div>
</a>

<style>
	.project-cover {
		transition: transform 200ms var(--motion-ease-interactive);
	}
	.project-indicator {
		opacity: 0;
		transform: scale(0.5);
		transition:
			opacity 200ms var(--motion-ease-interactive),
			transform 200ms var(--motion-ease-interactive);
	}
	.project-card:focus-visible .project-indicator {
		opacity: 1;
		transform: none;
		transition: none;
	}
	@media (hover: hover) and (pointer: fine) {
		.project-card:hover .project-cover {
			transform: scale(1.03);
		}
		.project-card:hover .project-indicator {
			opacity: 1;
			transform: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.project-cover,
		.project-card:hover .project-cover {
			transform: none;
			transition: none;
		}
		.project-indicator {
			transform: none;
			transition-property: opacity;
		}
	}
</style>
