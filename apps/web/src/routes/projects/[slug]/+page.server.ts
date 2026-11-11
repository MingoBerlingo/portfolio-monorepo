import { prepareMediaHtml } from '$lib/server/media-html';
import { getHomepageFeaturedProjects, getProjectBySlug } from '$lib/server/cms-projects';
import { sanitize } from '$lib/server/sanitize';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const [project, { hero }] = await Promise.all([getProjectBySlug(params.slug), parent()]);
	const featured = await getHomepageFeaturedProjects(hero?.featuredProjects);
	return {
		suggestedProjects: featured.filter((item) => item.id !== project.id && item.slug !== params.slug).slice(0, 2),
		project: {
			...project,
			contentHtml: project.contentHtml ? prepareMediaHtml(sanitize(project.contentHtml)) : ''
		}
	};
};
