import { getFooterKeywords } from '$lib/server/cms-keywords';
import { getProfile } from '$lib/server/cms-profile';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const [profile, footerKeywords] = await Promise.all([getProfile(), getFooterKeywords()]);
	return { profile, footerKeywords };
};
