import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AsciiMorph from './AsciiMorph.svelte';
import { mockMotion } from '$lib/testing/motion';

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it('renders a complete static frame immediately with reduced motion', () => {
	mockMotion(true);
	render(AsciiMorph, { frames: [['HELLO'], ['WORLD']] });
	expect(document.querySelector('pre')?.textContent).toContain('HELLO');
});

it('assembles the first frame once while preserving the full canvas size', async () => {
	mockMotion(false);
	vi.useFakeTimers();
	let intersect: IntersectionObserverCallback;
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(callback: IntersectionObserverCallback) {
				intersect = callback;
			}
			observe() {}
			disconnect() {}
		}
	);
	render(AsciiMorph, { frames: [['HELLO'], ['WORLD']], interval: 10000 });
	const art = document.querySelector('pre')!;
	const initialBounds = art.getBoundingClientRect();
	expect(art.textContent?.trim()).toBe('');
	expect(initialBounds.height).toBeGreaterThan(0);
	intersect!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
	await vi.advanceTimersByTimeAsync(499);
	expect(art.textContent?.trim()).toBe('');
	await vi.advanceTimersByTimeAsync(2000);
	expect(art.textContent).toContain('HELLO');
	expect(art.getBoundingClientRect().height).toBe(initialBounds.height);
	expect(art.getBoundingClientRect().width).toBe(initialBounds.width);
	intersect!([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
	intersect!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
	expect(art.textContent).toContain('HELLO');
});
