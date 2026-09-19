import { getFeaturedProjects } from '$lib/server/cms-projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const featured = await getFeaturedProjects();
	return { featuredProjects: featured.docs };
};
