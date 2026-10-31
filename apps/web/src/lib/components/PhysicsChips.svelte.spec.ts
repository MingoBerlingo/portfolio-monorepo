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
