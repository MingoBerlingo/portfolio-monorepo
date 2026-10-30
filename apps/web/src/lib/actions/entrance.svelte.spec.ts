import { afterEach, expect, it, vi } from 'vitest';
import { entrance } from './entrance';
import { mockMotion } from '$lib/testing/motion';

let cleanup: (() => void) | undefined;
let root: HTMLElement;
afterEach(() => {
	cleanup?.();
	root?.remove();
	vi.restoreAllMocks();
});

it('uses opacity-only entry without stagger for reduced motion and cancels on unmount', () => {
	mockMotion(true);
	root = document.createElement('div');
	root.innerHTML = '<h1 data-enter>Introduction</h1><div data-enter>Artwork</div>';
	document.body.append(root);
	const result = entrance(root) as { destroy: () => void };
	cleanup = result.destroy;
	const animations = root.getAnimations({ subtree: true });
	expect(animations).toHaveLength(2);
	for (const animation of animations) {
		const effect = animation.effect as KeyframeEffect;
		expect(effect.getTiming().delay).toBe(0);
		expect(effect.getTiming().duration).toBe(200);
		expect(effect.getKeyframes().some((frame) => frame.transform)).toBe(false);
	}
	cleanup();
	expect(root.getAnimations({ subtree: true })).toHaveLength(0);
});

it('stages blocks 50ms apart and finishes immediately if reduced motion is enabled', () => {
	const motion = mockMotion(false);
	root = document.createElement('div');
	root.innerHTML = '<h1 data-enter>Introduction</h1><div data-enter>Artwork</div>';
	document.body.append(root);
	const result = entrance(root) as { destroy: () => void };
	cleanup = result.destroy;
	const animations = root.getAnimations({ subtree: true });
	expect(animations.map((animation) => animation.effect!.getTiming().delay)).toEqual([0, 50]);
	expect((animations[0].effect as KeyframeEffect).getKeyframes()[0].transform).toBe(
		'translateY(12px)'
	);
	motion.setReduced(true);
	expect(root.getAnimations({ subtree: true })).toHaveLength(0);
});
