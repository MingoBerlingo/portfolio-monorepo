import type { Action } from 'svelte/action';

/** Shared readiness and source activation for Svelte and sanitized CMS markup. */
export const mediaLoading: Action<HTMLElement> = (root) => {
	const registered = new Map<HTMLElement, () => void>();
	const observer =
		typeof IntersectionObserver === 'undefined'
			? null
			: new IntersectionObserver(
					(entries) => {
						for (const entry of entries)
							if (entry.isIntersecting) activate(entry.target as HTMLVideoElement);
					},
					{ rootMargin: '300px' }
				);
	function activate(video: HTMLVideoElement) {
		if (!video.dataset.src && !video.querySelector('source[data-src]')) return;
		if (video.dataset.src) {
			video.src = video.dataset.src;
			delete video.dataset.src;
		}
		video.querySelectorAll<HTMLSourceElement>('source[data-src]').forEach((source) => {
			source.src = source.dataset.src!;
			delete source.dataset.src;
		});
		video.preload = 'auto';
		video.load();
		observer?.unobserve(video);
	}
	const register = (frame: HTMLElement) => {
		if (registered.has(frame)) return;
		const media = frame.querySelector<HTMLImageElement | HTMLVideoElement>(
			'img:not([data-preview]), video'
		);
		if (!media) return;
		let disposed = false;
		let decoding = false;
		frame.dataset.mediaState = 'loading';
		const ready = async () => {
			if (decoding) return;
			decoding = true;
			if (media instanceof HTMLImageElement) {
				try {
					await media.decode();
				} catch {
					/* A loaded image may not support decode. */
				}
				if (!media.naturalWidth) {
					fail();
					return;
				}
			}
			if (!disposed && frame.dataset.mediaState !== 'error') frame.dataset.mediaState = 'ready';
		};
		const fail = () => {
			if (!disposed) frame.dataset.mediaState = 'error';
		};
		const event = media instanceof HTMLImageElement ? 'load' : 'loadeddata';
		media.addEventListener(event, ready);
		media.addEventListener('error', fail);
		const sources = [...media.querySelectorAll('source')];
		const failedSources = new Set<EventTarget>();
		const sourceFailed = (event: Event) => {
			if (event.target) failedSources.add(event.target);
			if (failedSources.size === sources.length && !(media as HTMLVideoElement).getAttribute('src'))
				fail();
		};
		sources.forEach((source) => source.addEventListener('error', sourceFailed));
		if (media instanceof HTMLImageElement) {
			if (media.complete) {
				if (media.naturalWidth) void ready();
				else if (media.currentSrc || media.getAttribute('src')) fail();
			}
		} else {
			// Manual play must work even if an observer has not delivered its first entry.
			media.addEventListener('play', onPlay);
			if (media.dataset.eager !== undefined || !observer) activate(media);
			else if (media.dataset.src || media.querySelector('source[data-src]'))
				observer.observe(media);
			if (media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) void ready();
		}
		function onPlay() {
			activate(media as HTMLVideoElement);
		}
		registered.set(frame, () => {
			disposed = true;
			media.removeEventListener(event, ready);
			media.removeEventListener('error', fail);
			sources.forEach((source) => source.removeEventListener('error', sourceFailed));
			media.removeEventListener('play', onPlay);
			observer?.unobserve(media);
			delete frame.dataset.mediaState;
		});
	};
	const scan = () => {
		root.querySelectorAll<HTMLElement>('[data-media]').forEach(register);
		for (const [frame, dispose] of registered)
			if (!root.contains(frame)) {
				dispose();
				registered.delete(frame);
			}
	};
	scan();
	const mutations = new MutationObserver(scan);
	mutations.observe(root, { childList: true, subtree: true });
	return {
		destroy() {
			mutations.disconnect();
			observer?.disconnect();
			for (const dispose of registered.values()) dispose();
			registered.clear();
		}
	};
};
