import { afterEach, expect, it } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-svelte';
import ThemeSwitch from './ThemeSwitch.svelte';
import '../../app.css';

afterEach(() => {
	delete document.documentElement.dataset.theme;
	localStorage.removeItem('theme');
});

it('switches the page theme and persists the choice in both directions', async () => {
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
