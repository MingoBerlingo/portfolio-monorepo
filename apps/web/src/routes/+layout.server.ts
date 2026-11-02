import { getFooterKeywords } from '$lib/server/cms-keywords';
import { getHero } from '$lib/server/cms-hero';
import { getFooter } from '$lib/server/cms-footer';
import { getProfile } from '$lib/server/cms-profile';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const [profile, footerKeywords, hero, footer] = await Promise.all([
		getProfile(),
		getFooterKeywords(),
		getHero(),
		getFooter()
	]);
	return { profile, footerKeywords, hero, footer };
};
