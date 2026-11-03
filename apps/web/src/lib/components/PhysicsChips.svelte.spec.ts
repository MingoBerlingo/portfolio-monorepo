import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Keyword } from '@portfolio/types';
import PhysicsChips from './PhysicsChips.svelte';
import { mockMotion } from '$lib/testing/motion';

afterEach(() => vi.restoreAllMocks());

it('recreates the physics scene when CMS keyword identities or labels change', async () => {
	mockMotion(false);
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	const view = render(PhysicsChips, {
		keywords: [{ id: '1', label: 'Svelte' }] as Keyword[],
		active: true
	});
	await vi.waitFor(
		() => expect(document.querySelector('.chip-scene')?.getAttribute('data-physics')).toBe('true'),
		{ timeout: 5000 }
	);
	const original = document.querySelector('.chip-scene');
	await view.rerender({ keywords: [{ id: '2', label: 'React' }] as Keyword[], active: true });
	expect(document.querySelector('.chip-scene')).not.toBe(original);
	await vi.waitFor(
		() => expect(document.querySelector('.chip-scene')?.getAttribute('data-physics')).toBe('true'),
		{ timeout: 5000 }
	);
	expect(document.querySelector<HTMLButtonElement>('.chip-scene button')?.disabled).toBe(false);
});

it('limits mobile chips to twelve and restores the complete set on wider screens', async () => {
	mockMotion(true);
	const original = window.matchMedia.bind(window);
	const viewport = new EventTarget() as MediaQueryList;
	Object.defineProperty(viewport, 'matches', { value: true, configurable: true });
	vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
		query === '(max-width: 767px)' ? viewport : original(query)
	);
	render(PhysicsChips, {
		keywords: Array.from({ length: 16 }, (_, index) => ({
			id: String(index),
			label: `Keyword ${index}`
		})) as Keyword[]
	});
	await vi.waitFor(() => expect(document.querySelectorAll('.chip-scene button')).toHaveLength(12));
	Object.defineProperty(viewport, 'matches', { value: false, configurable: true });
	viewport.dispatchEvent(new Event('change'));
	await vi.waitFor(() => expect(document.querySelectorAll('.chip-scene button')).toHaveLength(16));
});
