<script lang="ts">
	import { tick } from 'svelte';
	import Icon from './Icon.svelte';

	let { root }: { root: HTMLElement | undefined } = $props();
	type Item = { element: HTMLImageElement | HTMLVideoElement; source: string; label: string };
	let items = $state.raw<Item[]>([]);
	let index = $state(0);
	let open = $state(false);
	let dialog: HTMLDialogElement;
	let origin: HTMLElement | null = null;
	let previousOverflow = '';
	let pausedVideos: HTMLVideoElement[] = [];
	let closing = $state(false);
	let animations: Animation[] = [];
	let thumbnails = $state<HTMLDivElement>();
	const current = $derived(items[index]);

	function finishClose() {
		if (!open) return;
		animations.forEach((animation) => animation.cancel());
		animations = [];
		dialog.querySelector<HTMLVideoElement>('.gallery-media video')?.pause();
		dialog.close();
		open = false;
		closing = false;
		document.body.style.overflow = previousOverflow;
		for (const video of pausedVideos) {
			if (video.isConnected) void video.play().catch(() => {});
		}
		pausedVideos = [];
		origin?.focus({ preventScroll: true });
	}

	function zoomFrames() {
		const media = dialog.querySelector<HTMLElement>('.gallery-media > img, .gallery-media > video');
		if (!media || !current?.element.isConnected) return null;
		const from = current.element.getBoundingClientRect();
		const to = media.getBoundingClientRect();
		if (!from.width || !from.height || !to.width || !to.height) return null;
		return {
			media,
			transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`
		};
	}

	async function animateZoom(out = false) {
		animations.forEach((animation) => animation.cancel());
		animations = [];
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const options: KeyframeAnimationOptions = { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'both' };
		const background = dialog.querySelector('.gallery-background')!;
		animations.push(background.animate(
			[{ opacity: out ? 1 : 0 }, { opacity: out ? 0 : 1 }], options
		));
		const zoom = zoomFrames();
		if (zoom) animations.push(zoom.media.animate(
			[{ transform: out ? 'none' : zoom.transform }, { transform: out ? zoom.transform : 'none' }],
			options
		));
		// Background tabs may suspend animation frames while a close is pending.
		let timeout: ReturnType<typeof setTimeout>;
		await Promise.race([
			Promise.all(animations.map((animation) => animation.finished.catch(() => {}))),
			new Promise<void>((resolve) => { timeout = setTimeout(resolve, 360); })
		]);
		clearTimeout(timeout!);
	}

	async function close() {
		if (!open || closing) return;
		closing = true;
		dialog.querySelector<HTMLVideoElement>('.gallery-media video')?.pause();
		await animateZoom(true);
		finishClose();
	}

	async function show(item: Item, trigger: HTMLElement) {
		index = items.indexOf(item);
		origin = trigger;
		previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		pausedVideos = [...(root?.querySelectorAll('video') ?? [])].filter((video) => !video.paused);
		pausedVideos.forEach((video) => video.pause());
		open = true;
		await tick();
		dialog.showModal();
		thumbnails?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		void animateZoom();
	}

	function move(direction: number) {
		select((index + direction + items.length) % items.length);
	}

	async function select(next: number) {
		if (closing) return;
		animations.forEach((animation) => animation.cancel());
		animations = [];
		dialog.querySelector<HTMLVideoElement>('.gallery-media video')?.pause();
		index = next;
		await tick();
		thumbnails?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
	}

	function keyboard(event: KeyboardEvent) {
		// Keep native video controls' keyboard shortcuts available.
		if (event.target instanceof HTMLVideoElement) return;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			move(event.key === 'ArrowLeft' ? -1 : 1);
		}
	}

	$effect(() => {
		if (!root) return;
		const buttons = new Map<HTMLElement, HTMLButtonElement>();
		function scan() {
			const elements = root!.querySelectorAll<HTMLImageElement | HTMLVideoElement>(
				':scope > figure img:not([data-preview]), :scope > figure video, #content img:not([data-preview]), #content video'
			);
			const next: Item[] = [];
			const frames = new Set<HTMLElement>();
			for (const element of elements) {
				if (element.closest('noscript')) continue;
				const source = element instanceof HTMLImageElement
					? element.getAttribute('src') ?? ''
					: element.dataset.src || element.getAttribute('src') ||
						element.querySelector('source')?.getAttribute('data-src') ||
						element.querySelector('source')?.getAttribute('src') || '';
				if (!source) continue;
				const frame = element.closest<HTMLElement>('[data-media]');
				if (!frame || frames.has(frame)) continue;
				frames.add(frame);
				const label = element instanceof HTMLImageElement
					? element.alt || 'Project image'
					: element.getAttribute('aria-label') || 'Project video';
				const item = { element, source, label };
				next.push(item);
				let button = buttons.get(frame);
				if (!button) {
					button = document.createElement('button');
					button.type = 'button';
					button.className = 'project-media-open';
					frame.append(button);
					buttons.set(frame, button);
				}
				button.setAttribute('aria-label', `Enlarge ${label}`);
				button.setAttribute('aria-haspopup', 'dialog');
				const trigger = button;
				button.onclick = (event) => {
					event.preventDefault();
					event.stopPropagation();
					void show(item, trigger);
				};
			}
			items = next;
			for (const [frame, button] of buttons) {
				if (!root!.contains(frame)) {
					button.remove();
					buttons.delete(frame);
				}
			}
		}
		scan();
		const observer = new MutationObserver((records) => {
			if (records.some((record) => [...record.addedNodes, ...record.removedNodes]
				.some((node) => node instanceof Element && !node.matches('.project-media-open'))))
				scan();
		});
		observer.observe(root, { childList: true, subtree: true });
		return () => {
			observer.disconnect();
			finishClose();
			for (const button of buttons.values()) button.remove();
		};
	});
</script>

<dialog bind:this={dialog} class="project-gallery text-foreground-1" class:closing aria-label="Project media gallery"
	oncancel={(event) => { event.preventDefault(); close(); }}
	onclose={finishClose}
	onkeydown={keyboard}
	onclick={(event) => { if (event.target === dialog) close(); }}>
	{#if open && current}
		<div class="gallery-background bg-background"></div>
		<div class="gallery-toolbar">
			<button type="button" aria-label="Close gallery" onclick={close}><Icon name="close" /></button>
		</div>
		<div class="gallery-bottom">
			<div bind:this={thumbnails} class="gallery-thumbnails" role="group" aria-label="Project media thumbnails">
				{#each items as item, itemIndex}
					<button type="button" class="gallery-thumbnail" aria-label={`View media ${itemIndex + 1}: ${item.label}`}
						aria-current={itemIndex === index ? 'true' : undefined} onclick={() => select(itemIndex)}>
						{#if item.element instanceof HTMLVideoElement}
							<video src={item.source} poster={item.element.poster || undefined} muted playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video>
							<span class="thumbnail-video" aria-hidden="true">▶</span>
						{:else}
							<img src={item.source} alt="" loading="lazy" draggable="false" />
						{/if}
					</button>
				{/each}
			</div>
			<span aria-live="polite" aria-atomic="true">{index + 1} / {items.length}</span>
		</div>
		<div class="gallery-media">
			{#key current.source}
				{#if current.element instanceof HTMLVideoElement}
					<video src={current.source} controls playsinline autoplay loop preload="auto"
						width={current.element.videoWidth || undefined} height={current.element.videoHeight || undefined}
						muted aria-label={current.label}></video>
				{:else}
					<img src={current.source} alt={current.label} draggable="false"
						width={current.element.naturalWidth || undefined} height={current.element.naturalHeight || undefined} />
				{/if}
			{/key}
		</div>
		{#if items.length > 1}
			<button class="gallery-previous" type="button" aria-label="Previous media" onclick={() => move(-1)}><Icon name="arrow-left" /></button>
			<button class="gallery-next" type="button" aria-label="Next media" onclick={() => move(1)}><Icon name="arrow-right" /></button>
		{/if}
	{/if}
</dialog>

<style>
	:global(.project-media-open) {
		position: absolute;
		inset: 0;
		z-index: 2;
		border-radius: inherit;
		cursor: zoom-in;
		background: transparent;
	}
	:global(.project-media-open:focus-visible) {
		outline: 3px solid var(--color-primary);
		outline-offset: -4px;
	}
	.project-gallery {
		position: fixed;
		inset: 0;
		width: 100%;
		max-width: none;
		height: 100%;
		max-height: none;
		margin: 0;
		padding: 4.5rem 4rem 9rem;
		border: 0;
		background: transparent;
		overflow: hidden;
	}
	.project-gallery::backdrop { background: transparent; }
	.project-gallery img {
		user-select: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
	}
	.gallery-background { position: absolute; inset: 0; pointer-events: none; }
	.gallery-toolbar {
		position: absolute;
		z-index: 2;
		top: 1rem;
		left: 1.5rem;
		right: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}
	button { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; }
	button:hover { background: var(--color-surface-2); }
	button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
	.gallery-media { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; pointer-events: none; }
	.gallery-media img, .gallery-media video {
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		pointer-events: auto;
		border-radius: var(--radius-xl);
		border: 1px solid var(--color-border);
		transform-origin: top left;
	}
	.gallery-previous, .gallery-next { position: absolute; z-index: 2; top: calc(50% - 22px); }
	.gallery-previous { left: 0.5rem; }
	.gallery-next { right: 0.5rem; }
	.gallery-bottom {
		position: absolute;
		z-index: 2;
		bottom: 1rem;
		left: 1rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}
	.gallery-thumbnails {
		display: flex;
		gap: 0.5rem;
		max-width: 100%;
		overflow-x: auto;
		padding: 4px;
	}
	button.gallery-thumbnail {
		position: relative;
		flex: 0 0 64px;
		width: 64px;
		height: 48px;
		padding: 0;
		overflow: hidden;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		opacity: 0.55;
	}
	.gallery-thumbnail[aria-current='true'], .gallery-thumbnail:hover, .gallery-thumbnail:focus-visible { opacity: 1; }
	.gallery-thumbnail[aria-current='true'] { outline: 2px solid var(--color-foreground-1); outline-offset: 1px; }
	.project-gallery.closing .gallery-toolbar,
	.project-gallery.closing .gallery-bottom,
	.project-gallery.closing .gallery-previous,
	.project-gallery.closing .gallery-next {
		visibility: hidden;
		pointer-events: none;
	}
	.gallery-thumbnail img, .gallery-thumbnail video { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
	.thumbnail-video { position: absolute; inset: 0; display: grid; place-items: center; color: white; background: rgb(0 0 0 / 25%); }
	@media (max-width: 40rem) {
		.project-gallery { padding: 4.5rem 3rem 9rem; }
		.gallery-previous { left: 0; }
		.gallery-next { right: 0; }
	}
</style>
