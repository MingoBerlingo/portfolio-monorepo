import { getExperiences } from '$lib/server/cms-experiences';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const experiences = await getExperiences();
	return { experiences: experiences.docs };
};
