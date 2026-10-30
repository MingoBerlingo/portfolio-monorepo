import { afterEach, expect, it, vi } from 'vitest';
import { mediaPlayback } from './mediaPlayback';
import { mockMotion } from '$lib/testing/motion';

let destroy: (() => void) | undefined;
let root: HTMLElement;
afterEach(() => {
	destroy?.();
	root?.remove();
	vi.restoreAllMocks();
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
