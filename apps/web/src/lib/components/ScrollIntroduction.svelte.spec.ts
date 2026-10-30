import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Profile } from '@portfolio/types';
import ScrollIntroduction from './ScrollIntroduction.svelte';
import '../../app.css';

describe('ScrollIntroduction', () => {
	it('renders editable copy and a custom inline image without exposing its marker', async () => {
		render(ScrollIntroduction, {
			profile: {
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
			} as Profile
		});
		await expect
			.element(page.getByRole('region', { name: 'My approach' }))
			.toHaveTextContent('Design and build. Ship together.');
		await expect
			.element(page.getByRole('img', { name: 'A component library' }))
			.toBeInTheDocument();
	});
	it('shows the default introduction and three small illustrations', async () => {
		render(ScrollIntroduction);
		await expect
			.element(page.getByRole('region', { name: 'My approach' }))
			.toHaveTextContent('I work best between design and frontend');
		expect(document.querySelectorAll('.inline-image').length).toBe(3);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
	});
});
