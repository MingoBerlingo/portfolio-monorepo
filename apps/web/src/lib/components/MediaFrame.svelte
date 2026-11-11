<script lang="ts">
	type Asset = {
		url?: string | null;
		alt?: string | null;
		width?: number | null;
		height?: number | null;
		previewDataURL?: string | null;
	};
	let {
		asset,
		video = false,
		eager = false,
		instant = false,
		class: mediaClass = ''
	}: {
		asset: Asset;
		video?: boolean;
		eager?: boolean;
		instant?: boolean;
		class?: string;
	} = $props();
</script>

{#key asset.url}
	<div
		data-media
		data-media-state="loading"
		data-media-instant={instant ? '' : undefined}
		class="media-frame"
	>
		{#if asset.previewDataURL}
			<img
				data-preview
				src={asset.previewDataURL}
				alt=""
				aria-hidden="true"
				class="media-preview"
			/>
		{/if}
		{#if video}
			<video
				data-deferred
				data-src={asset.url ?? undefined}
				data-eager={eager ? '' : undefined}
				data-autoplay
				poster={asset.previewDataURL ?? undefined}
				muted
				loop
				playsinline
				preload="none"
				width={asset.width ?? undefined}
				height={asset.height ?? undefined}
				class={mediaClass}
			></video>
			<noscript
				><video
					src={asset.url ?? undefined}
					poster={asset.previewDataURL ?? undefined}
					muted
					loop
					playsinline
					controls
					preload="none"
					class={mediaClass}
				></video></noscript
			>
		{:else}
			<img
				src={asset.url ?? undefined}
				alt={asset.alt ?? ''}
				width={asset.width ?? undefined}
				height={asset.height ?? undefined}
				loading={eager ? 'eager' : 'lazy'}
				fetchpriority={eager ? 'high' : 'auto'}
				decoding="async"
				class={mediaClass}
			/>
		{/if}
	</div>
{/key}
