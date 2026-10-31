import { afterEach, expect, it, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-svelte';
import Footer from './Footer.svelte';
import { mockMotion } from '$lib/testing/motion';
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
		.element(page.getByRole('link', { name: 'hello@example.com', exact: true }))
		.toHaveAttribute('href', 'mailto:hello@example.com');
	await expect
		.element(page.getByRole('link', { name: 'GitHub', exact: true }))
		.toHaveAttribute('href', 'https://github.com/example');
	await expect.element(page.getByRole('button', { name: 'Toss UX / UI keyword' })).toBeDisabled();
	expect(document.querySelector('footer')?.dataset.reveal).toBe('false');
});
