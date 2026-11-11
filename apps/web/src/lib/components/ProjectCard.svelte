<script lang="ts">
	import MediaFrame from './MediaFrame.svelte';
	import { resolve } from '$app/paths';

	type MediaAsset = {
		previewDataURL?: string | null;
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

<a href={resolve(`/projects/${project.slug}`)} class="group block">
	<div class="overflow-clip rounded-xl border border-border bg-surface-1">
		<div class="bg-white ring-primary/30 group-focus-visible:ring-2 dark:bg-surface-1">
			{#if coverAsset?.url && isVideoAsset(coverAsset)}
				<MediaFrame
					asset={coverAsset}
					video
					class="block aspect-video w-full object-cover transition-transform motion-base group-hover:scale-110 group-focus-visible:scale-110"
				/>
			{:else if coverAsset?.url}
				<MediaFrame
					asset={{ ...coverAsset, alt: coverAsset.alt ?? `${project.title} cover` }}
					class="block aspect-video w-full object-cover transition-transform motion-base group-hover:scale-110 group-focus-visible:scale-110"
				/>
			{:else}
				<div class="block aspect-video w-full bg-surface-2" aria-hidden="true"></div>
			{/if}
		</div>
	</div>
	<div
		class="mt-2 flex items-baseline justify-between gap-3.5 text-sm leading-snug text-foreground-3"
	>
		<p class="m-0 flex min-w-0 flex-1 items-center gap-2">
			<span
				class="h-1.5 w-0 shrink-0 rounded-full bg-foreground-1 opacity-0 transition-all motion-base group-hover:w-3 group-hover:opacity-100 group-focus-visible:w-3 group-focus-visible:opacity-100"
			></span>
			<span
				class="min-w-0 truncate transition-colors motion-base group-hover:text-foreground-1 group-focus-visible:text-foreground-1"
				>{project.tagline}</span
			>
		</p>
		<p
			class="mx-2 shrink-0 whitespace-nowrap transition-colors motion-base group-hover:text-foreground-1 group-focus-visible:text-foreground-1"
		>
			{project.shortTitle}{year ? ` • ${year}` : ''}
		</p>
	</div>
</a>

<style>
	/* Intentional portfolio-preview exception: preserve the original hover/focus feel. */
	a {
		--motion-duration-interactive: 300ms;
		--motion-ease-interactive: cubic-bezier(0, 0, 0.2, 1);
	}
</style>
