import { afterEach, expect, it, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-svelte';
import Footer from './Footer.svelte';
import { mockMotion } from '$lib/testing/motion';
import '../../app.css';
import type { Profile, Keyword } from '@portfolio/types';

afterEach(() => vi.restoreAllMocks());

it('exposes footer navigation, profile contacts and CMS keywords without motion', async () => {
	mockMotion(true);
	render(Footer, {
		profile: {
			name: 'Alessandro',
			surname: 'Quets',
			email: 'hello@example.com',
			footerHeading: 'Let’s talk.',
			github: { url: 'https://github.com/example' }
		} as Profile,
		keywords: [{ id: 'keyword-1', label: 'UX / UI' }] as Keyword[]
	});
	await expect
		.element(page.getByRole('navigation', { name: 'Footer navigation' }))
		.toBeInTheDocument();
	await expect.element(page.getByRole('heading', { name: 'Let’s talk.' })).toBeInTheDocument();
	await expect
		.element(page.getByRole('link', { name: 'Email', exact: true }))
		.toHaveAttribute('href', 'mailto:hello@example.com');
	await expect
		.element(page.getByRole('link', { name: 'GitHub', exact: true }))
		.toHaveAttribute('href', 'https://github.com/example');
	await expect.element(page.getByRole('button', { name: 'Toss UX / UI keyword' })).toBeDisabled();
	expect(document.querySelector('footer')?.dataset.reveal).toBe('false');
});

it('scopes dark tokens to the footer and gives physics the full footer bounds', () => {
	mockMotion(true);
	const priorScheme = document.documentElement.style.colorScheme;
	document.documentElement.style.colorScheme = 'light';
	try {
		render(Footer, {
			profile: { name: 'Alessandro', surname: 'Quets', email: 'hello@example.com' } as Profile,
			keywords: [{ id: '1', label: 'Svelte' }] as Keyword[]
		});
		const footer = document.querySelector('footer')!;
		const scene = footer.querySelector<HTMLElement>('.chip-scene')!;
		const chip = scene.querySelector('button')!;
		expect(getComputedStyle(footer).backgroundColor).toBe('rgb(0, 0, 0)');
		expect(getComputedStyle(chip).backgroundColor).toBe('rgb(250, 250, 250)');
		expect(getComputedStyle(chip).color).toBe('rgb(0, 0, 0)');
		expect(scene.getBoundingClientRect().width).toBe(footer.getBoundingClientRect().width);
		expect(scene.getBoundingClientRect().height).toBe(footer.getBoundingClientRect().height);
		expect(getComputedStyle(document.documentElement).colorScheme).toBe('light');
	} finally {
		document.documentElement.style.colorScheme = priorScheme;
	}
});
