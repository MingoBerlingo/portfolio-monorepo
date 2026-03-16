import { getProjectBySlug } from '$lib/server/cms-projects';
import { sanitize } from '$lib/server/sanitize';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = await getProjectBySlug(params.slug);
	return {
		project: {
			...project,
			contentHtml: project.contentHtml ? sanitize(project.contentHtml) : ''
		}
	};
};
