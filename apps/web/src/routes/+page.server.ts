import { getProjects } from '$lib/server/cms-projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const projects = await getProjects();
	return { projects: projects.docs };
};
