import { afterEach, expect, it, vi } from 'vitest';
import { mediaPlayback } from './mediaPlayback';
import { mockMotion } from '$lib/testing/motion';

let destroy: (() => void) | undefined;
let root: HTMLElement;
afterEach(() => {
	destroy?.();
	root?.remove();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it('offers manual controls and suppresses autoplay under reduced motion', () => {
	const motion = mockMotion(true);
	root = document.createElement('div');
	const video = document.createElement('video');
	video.autoplay = true;
	root.append(video);
	document.body.append(root);
	const play = vi.spyOn(video, 'play').mockResolvedValue();
	const result = mediaPlayback(root) as { destroy: () => void };
	destroy = result.destroy;
	expect(video.autoplay).toBe(false);
	expect(video.controls).toBe(true);
	expect(play).not.toHaveBeenCalled();
	motion.setReduced(false);
	expect(video.controls).toBe(false);
});

it('resumes a user-started video after a visibility pause, but not after a user pause', async () => {
	mockMotion(true);
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	const visibility = new Map<Element, (visible: boolean) => void>();
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(private callback: IntersectionObserverCallback) {}
			observe(target: Element) {
				visibility.set(target, (visible) =>
					this.callback(
						[{ target, isIntersecting: visible } as IntersectionObserverEntry],
						this as unknown as IntersectionObserver
					)
				);
			}
			disconnect() {}
		}
	);
	root = document.createElement('div');
	const video = document.createElement('video');
	root.append(video);
	document.body.append(root);
	let paused = true;
	vi.spyOn(video, 'paused', 'get').mockImplementation(() => paused);
	vi.spyOn(video, 'pause').mockImplementation(() => {
		paused = true;
		video.dispatchEvent(new Event('pause'));
	});
	const play = vi.spyOn(video, 'play').mockImplementation(async () => {
		paused = false;
		video.dispatchEvent(new Event('play'));
	});
	destroy = (mediaPlayback(root) as { destroy: () => void }).destroy;
	visibility.get(video)!(true);
	paused = false;
	video.dispatchEvent(new Event('play'));
	visibility.get(video)!(false);
	expect(paused).toBe(true);
	visibility.get(video)!(true);
	expect(play).toHaveBeenCalledOnce();
	await Promise.resolve();
	await Promise.resolve();
	video.pause();
	visibility.get(video)!(false);
	visibility.get(video)!(true);
	expect(play).toHaveBeenCalledOnce();
});
