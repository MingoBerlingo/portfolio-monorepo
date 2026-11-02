import { afterEach, expect, it, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-svelte';
import ThemeSwitch from './ThemeSwitch.svelte';
import '../../app.css';
import { mockMotion } from '$lib/testing/motion';

afterEach(() => {
	vi.restoreAllMocks();
	delete document.documentElement.dataset.theme;
	localStorage.removeItem('theme');
});

it('switches the page theme and persists the choice in both directions', async () => {
	mockMotion(true);
	document.documentElement.dataset.theme = 'light';
	render(ThemeSwitch);
	const toggle = page.getByRole('switch', { name: 'Dark theme' });
	await expect.element(toggle).toHaveAttribute('aria-checked', 'false');
	await toggle.click();
	expect(document.documentElement.dataset.theme).toBe('dark');
	expect(localStorage.getItem('theme')).toBe('dark');
	expect(getComputedStyle(document.documentElement).colorScheme).toBe('dark');
	await expect.element(toggle).toHaveAttribute('aria-checked', 'true');
	await toggle.click();
	expect(document.documentElement.dataset.theme).toBe('light');
	expect(localStorage.getItem('theme')).toBe('light');
});

it('expands the new theme in a circle centered on the switch', async () => {
	mockMotion(false);
	document.documentElement.dataset.theme = 'light';
	const animate = vi.spyOn(document.documentElement, 'animate');
	const restartedFades: string[] = [];
	const observer = new MutationObserver(() => {
		if (!document.documentElement.dataset.themeTransition) {
			for (const animation of document.getAnimations()) {
				if (
					animation instanceof CSSAnimation &&
					animation.playState === 'running' &&
					animation.animationName.includes('view-transition-fade')
				) {
					restartedFades.push(animation.animationName);
				}
			}
		}
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme-transition']
	});
	render(ThemeSwitch);
	const button = document.querySelector<HTMLButtonElement>('[role="switch"]')!;
	const bounds = button.getBoundingClientRect();
	await page.getByRole('switch', { name: 'Dark theme' }).click();
	await expect.poll(() => animate.mock.calls.length).toBe(1);
	const [keyframes, options] = animate.mock.calls[0];
	expect(keyframes).toEqual({
		clipPath: [
			`circle(0px at ${bounds.left + bounds.width / 2}px ${bounds.top + bounds.height / 2}px)`,
			expect.stringContaining('circle(')
		]
	});
	expect(options).toMatchObject({ pseudoElement: '::view-transition-new(root)', duration: 450 });
	await expect.poll(() => document.documentElement.dataset.themeTransition).toBeUndefined();
	observer.disconnect();
	expect(restartedFades).toEqual([]);
});

it('responds to rapid clicks without waiting for the previous reveal', async () => {
	mockMotion(false);
	document.documentElement.dataset.theme = 'light';
	render(ThemeSwitch);
	const button = document.querySelector<HTMLButtonElement>('[role="switch"]')!;
	button.click();
	await expect.poll(() => document.documentElement.dataset.theme).toBe('dark');
	// This second click happens while the first 450ms reveal is active.
	button.click();
	await expect.poll(() => document.documentElement.dataset.theme).toBe('light');
	await expect.poll(() => document.documentElement.dataset.themeTransition).toBeUndefined();
	expect(localStorage.getItem('theme')).toBe('light');
});
