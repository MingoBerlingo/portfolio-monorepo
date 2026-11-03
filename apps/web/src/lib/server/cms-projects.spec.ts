import { beforeEach, expect, it, vi } from 'vitest';
import type { Hero, Project } from '@portfolio/types';
const query = vi.hoisted(() => vi.fn());
vi.mock('./cms-client', () => ({ cmsQuery: query }));
vi.mock('./cms-images', () => ({
	localizeImage: async (url: string) => url,
	localizeHtmlImages: async (html: string) => html
}));
import { getHomepageFeaturedProjects } from './cms-projects';
beforeEach(() => query.mockReset());
it('renders selected projects in Hero order rather than API sort order', async () => {
	query.mockResolvedValue({ Projects: { docs: [{ id: 'a' }, { id: 'b' }], totalDocs: 2 } });
	const projects = await getHomepageFeaturedProjects([
		'b',
		'missing',
		{ id: 'a' } as Project
	] as Hero['featuredProjects']);
	expect(projects.map((project) => project.id)).toEqual(['b', 'a']);
	expect(query.mock.calls[0][1].where).toEqual({ id: { in: ['b', 'missing', 'a'] } });
});
it('retains the current featured list when no custom projects are selected', async () => {
	query.mockResolvedValue({ Projects: { docs: [{ id: 'default' }], totalDocs: 1 } });
	expect((await getHomepageFeaturedProjects([])).map((project) => project.id)).toEqual(['default']);
	expect(query.mock.calls[0][1]).toMatchObject({
		limit: 4,
		where: { isFeatured: { equals: true } }
	});
});
