import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Hero } from '@portfolio/types';
import ScrollIntroduction from './ScrollIntroduction.svelte';
import '../../app.css';

describe('ScrollIntroduction', () => {
	it('renders editable copy and a custom inline image without exposing its marker', async () => {
		render(ScrollIntroduction, {
			hero: {
				homepageIntroduction: 'Design [custom] and build.\n\nShip together.',
				homepageImages: [
					{
						key: 'custom',
						alt: 'A component library',
						image: {
							id: '1',
							url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
							mimeType: 'image/svg+xml'
						}
					}
				]
			} as Hero
		});
		await expect
			.element(page.getByRole('region', { name: 'My approach' }))
			.toHaveTextContent('Design and build. Ship together.');
		await expect
			.element(page.getByRole('img', { name: 'A component library' }))
			.toBeInTheDocument();
	});
	it('shows the default introduction with an illustration, decorative toggle and icon', async () => {
		render(ScrollIntroduction);
		await expect
			.element(page.getByRole('region', { name: 'My approach' }))
			.toHaveTextContent('I work best between design and frontend');
		expect(document.querySelectorAll('.inline-image').length).toBe(1);
		expect(document.querySelector('.inline-toggle')?.getAttribute('aria-hidden')).toBe('true');
		expect(document.querySelector('.inline-toggle')?.tagName).toBe('SPAN');
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
	});
});
