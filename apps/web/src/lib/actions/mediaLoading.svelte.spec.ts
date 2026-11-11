import { afterEach, expect, it, vi } from 'vitest';
import { mediaLoading } from './mediaLoading';

let root: HTMLElement;
let destroy: (() => void) | undefined;
afterEach(() => {
	destroy?.();
	root?.remove();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it('withholds video sources until near the viewport and stops shimmer on readiness or error', () => {
	const visibility = new Map<Element, () => void>();
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(private callback: IntersectionObserverCallback) {}
			observe(target: Element) {
				visibility.set(target, () =>
					this.callback(
						[{ target, isIntersecting: true } as IntersectionObserverEntry],
						this as unknown as IntersectionObserver
					)
				);
			}
			unobserve() {}
			disconnect() {}
		}
	);
	root = document.createElement('div');
	root.innerHTML = '<div data-media><video data-src="/clip.webm" preload="none"></video></div>';
	document.body.append(root);
	const video = root.querySelector('video')!;
	const load = vi.spyOn(video, 'load').mockImplementation(() => {});
	destroy = (mediaLoading(root) as { destroy: () => void }).destroy;
	expect(video.getAttribute('src')).toBeNull();
	expect(root.firstElementChild!.getAttribute('data-media-state')).toBe('loading');
	visibility.get(video)!();
	expect(video.getAttribute('src')).toBe('/clip.webm');
	expect(load).toHaveBeenCalledOnce();
	video.dispatchEvent(new Event('loadeddata'));
	expect(root.firstElementChild!.getAttribute('data-media-state')).toBe('ready');
	video.dispatchEvent(new Event('error'));
	expect(root.firstElementChild!.getAttribute('data-media-state')).toBe('error');
});

it('waits for image decode, handles cached images, and removes listeners on teardown', async () => {
	root = document.createElement('div');
	root.innerHTML = '<div data-media><img alt="test"></div>';
	document.body.append(root);
	const image = root.querySelector('img')!;
	vi.spyOn(image, 'complete', 'get').mockReturnValue(true);
	vi.spyOn(image, 'naturalWidth', 'get').mockReturnValue(40);
	let decoded!: () => void;
	vi.spyOn(image, 'decode').mockImplementation(
		() =>
			new Promise<void>((resolve) => {
				decoded = resolve;
			})
	);
	destroy = (mediaLoading(root) as { destroy: () => void }).destroy;
	expect(root.firstElementChild!.getAttribute('data-media-state')).toBe('loading');
	decoded();
	await Promise.resolve();
	expect(root.firstElementChild!.getAttribute('data-media-state')).toBe('ready');
	destroy();
	destroy = undefined;
	image.dispatchEvent(new Event('error'));
	expect(root.firstElementChild!.hasAttribute('data-media-state')).toBe(false);
});

it('registers media added during navigation and ignores late decodes after removal', async () => {
	root = document.createElement('div');
	document.body.append(root);
	destroy = (mediaLoading(root) as { destroy: () => void }).destroy;
	const frame = document.createElement('div');
	frame.dataset.media = '';
	const image = document.createElement('img');
	vi.spyOn(image, 'complete', 'get').mockReturnValue(true);
	vi.spyOn(image, 'naturalWidth', 'get').mockReturnValue(40);
	let decoded!: () => void;
	vi.spyOn(image, 'decode').mockImplementation(
		() =>
			new Promise<void>((resolve) => {
				decoded = resolve;
			})
	);
	frame.append(image);
	root.append(frame);
	await Promise.resolve();
	expect(frame.dataset.mediaState).toBe('loading');
	frame.remove();
	await Promise.resolve();
	decoded();
	await Promise.resolve();
	expect(frame.hasAttribute('data-media-state')).toBe(false);
});

it('loads eager and source-child videos without waiting for intersection', () => {
	vi.stubGlobal('IntersectionObserver', undefined);
	root = document.createElement('div');
	root.innerHTML =
		'<div data-media><video><source data-src="/clip.webm" type="video/webm"></video></div>';
	document.body.append(root);
	const video = root.querySelector('video')!;
	const load = vi.spyOn(video, 'load').mockImplementation(() => {});
	destroy = (mediaLoading(root) as { destroy: () => void }).destroy;
	expect(root.querySelector('source')!.getAttribute('src')).toBe('/clip.webm');
	expect(load).toHaveBeenCalledOnce();
});

it('ends shimmer only after every source candidate fails', () => {
	vi.stubGlobal('IntersectionObserver', undefined);
	root = document.createElement('div');
	root.innerHTML =
		'<div data-media><video><source data-src="/first.webm"><source data-src="/second.mp4"></video></div>';
	document.body.append(root);
	vi.spyOn(root.querySelector('video')!, 'load').mockImplementation(() => {});
	destroy = (mediaLoading(root) as { destroy: () => void }).destroy;
	const sources = root.querySelectorAll('source');
	sources[0].dispatchEvent(new Event('error'));
	expect(root.firstElementChild!.getAttribute('data-media-state')).toBe('loading');
	sources[1].dispatchEvent(new Event('error'));
	expect(root.firstElementChild!.getAttribute('data-media-state')).toBe('error');
});
