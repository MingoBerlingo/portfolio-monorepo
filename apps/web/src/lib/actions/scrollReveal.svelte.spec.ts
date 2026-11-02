import { afterEach, expect, it, vi } from 'vitest';
import { scrollReveal } from './scrollReveal';
import { mockMotion } from '$lib/testing/motion';

let root: HTMLElement;
let destroy: (() => void) | undefined;
afterEach(() => {
	destroy?.();
	root?.remove();
	vi.restoreAllMocks();
});

it('starts graphic accents only after opacity reaches one and rotation reaches zero', async () => {
	mockMotion(false);
	vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(window.innerHeight * 5);
	root = document.createElement('div');
	root.innerHTML = '<span data-reveal data-graphic="eye">Eye</span>';
	document.body.append(root);
	const graphic = root.firstElementChild as HTMLElement;
	let top = window.innerHeight;
	vi.spyOn(graphic, 'getBoundingClientRect').mockImplementation(
		() => ({ top, left: 0 }) as DOMRect
	);
	destroy = (scrollReveal(root) as { destroy: () => void }).destroy;
	expect(graphic.dataset.revealed).toBeUndefined();
	top = 0;
	window.dispatchEvent(new Event('scroll'));
	await vi.waitFor(() => expect(graphic.dataset.revealed).toBe('true'));
	expect(graphic.style.opacity).toBe('1');
	expect(graphic.style.transform).toBe('rotate(0deg)');
});

it('shows graphics fully without starting accents for reduced motion', () => {
	mockMotion(true);
	root = document.createElement('div');
	root.innerHTML = '<span data-reveal data-graphic="eye">Eye</span>';
	document.body.append(root);
	destroy = (scrollReveal(root) as { destroy: () => void }).destroy;
	const graphic = root.firstElementChild as HTMLElement;
	expect(graphic.style.opacity).toBe('1');
	expect(graphic.dataset.revealed).toBeUndefined();
});
