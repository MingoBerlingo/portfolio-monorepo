import { getProfile } from '$lib/server/cms-profile';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const profile = await getProfile();
	return { profile };
};
