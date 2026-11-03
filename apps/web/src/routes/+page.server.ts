import { getHomepageFeaturedProjects } from '$lib/server/cms-projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { hero } = await parent();
	return { featuredProjects: await getHomepageFeaturedProjects(hero?.featuredProjects) };
};
