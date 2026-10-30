import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AsciiMorph from './AsciiMorph.svelte';
import { mockMotion } from '$lib/testing/motion';

afterEach(() => vi.restoreAllMocks());

it('renders a complete static frame immediately with reduced motion', () => {
	mockMotion(true);
	render(AsciiMorph, { frames: [['HELLO'], ['WORLD']] });
	expect(document.querySelector('pre')?.textContent).toContain('HELLO');
});
