import { getEducation } from '$lib/server/cms-education';
import { getExperiences } from '$lib/server/cms-experiences';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [experiences, education] = await Promise.all([getExperiences(), getEducation()]);
	return {
		experiences: experiences.docs,
		education: education.docs
	};
};
