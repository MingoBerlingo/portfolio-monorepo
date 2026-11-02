import { expect, it } from 'vitest';
import type { Profile, Project } from '@portfolio/types';
import { portfolioMarkdown } from './portfolio-markdown';

it('exports CMS biography, contacts and base-aware project links without image markers', () => {
	const profile = {
		name: 'Alex',
		surname: 'Example',
		jobPosition: 'Product Designer',
		homepageIntroduction: 'I design [components] and build.',
		presentation: {
			root: {
				children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Design & code.' }] }]
			}
		},
		email: 'hello@example.com'
	} as unknown as Profile;
	const markdown = portfolioMarkdown(
		profile,
		[
			{
				shortTitle: 'Trading',
				tagline: 'A clearer interface',
				slug: 'trading',
				year: '2025-01-01'
			} as Project
		],
		[],
		[],
		'/portfolio',
		{ homepageIntroduction: 'I design [components] and build.' }
	);
	expect(markdown).toContain('# Alex Example');
	expect(markdown).toContain('Design & code.');
	expect(markdown).toContain('I design and build.');
	expect(markdown).toContain('[Trading](/portfolio/projects/trading)');
	expect(markdown).toContain('[hello@example.com](mailto:hello@example.com)');
	expect(markdown).not.toContain('[components]');
	expect(markdown).not.toContain('undefined');
});
