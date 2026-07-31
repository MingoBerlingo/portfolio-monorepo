<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function isVideoAsset(
		asset: { mimeType?: string | null; url?: string | null } | null | undefined
	) {
		if (!asset?.url) return false;
		const mimeType = asset.mimeType?.toLowerCase() ?? '';
		if (mimeType.startsWith('video/')) return true;
		return /\.(mp4|webm|ogg|mov)$/i.test(asset.url);
	}
</script>

<h1 class="mb-10 font-display text-2xl text-foreground-1">Projects</h1>
<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.projects as project (project.id)}
		<li>
			<a
				href="/projects/{project.slug}"
				class="group block overflow-hidden rounded-lg border border-border transition-all hover:border-border-contrast hover:shadow-lg"
			>
				{#if typeof project.videoCover === 'object' && project.videoCover?.url && isVideoAsset(project.videoCover)}
					<video
						src={project.videoCover.url}
						poster={typeof project.featuredImage === 'object' && project.featuredImage?.url
							? project.featuredImage.url
							: undefined}
						muted
						loop
						playsinline
						preload="metadata"
						class="aspect-video w-full object-cover"
					></video>
				{:else if typeof project.featuredImage === 'object' && project.featuredImage?.url}
					<img
						src={project.featuredImage.url}
						alt={project.featuredImage.alt}
						width={project.featuredImage.width ?? undefined}
						height={project.featuredImage.height ?? undefined}
						loading="lazy"
						class="aspect-video w-full object-cover"
					/>
				{/if}
				<div class="p-4">
					<h3 class="text-lg text-foreground-1 group-hover:text-primary">
						{project.title}
					</h3>
					<p class="mt-1 text-sm text-foreground-4">{new Date(project.year).getFullYear()}</p>
				</div>
			</a>
		</li>
	{/each}
</ul>
