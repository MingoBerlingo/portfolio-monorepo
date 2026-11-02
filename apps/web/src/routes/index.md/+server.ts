import { base } from '$app/paths';
import type { Profile, Hero } from '@portfolio/types';
import { cmsQuery, type PaginatedResponse } from '$lib/server/cms-client';
import { getProjects } from '$lib/server/cms-projects';
import { getExperiences } from '$lib/server/cms-experiences';
import { getEducation } from '$lib/server/cms-education';
import { portfolioMarkdown } from '$lib/server/portfolio-markdown';
import type { RequestHandler } from './$types';

export const prerender = true;

async function allPages<T>(
	load: (options: { page: number; limit: number }) => Promise<PaginatedResponse<T>>
) {
	const docs: T[] = [];
	let page = 1;
	let result: PaginatedResponse<T>;
	do {
		result = await load({ page, limit: 100 });
		docs.push(...result.docs);
		page++;
	} while (result.hasNextPage);
	return docs;
}

export const GET: RequestHandler = async () => {
	const [{ Profile: profile, Hero: hero }, projects, experiences, education] = await Promise.all([
		cmsQuery<{ Profile: Profile; Hero: Hero }>(
			`query { Profile { name surname jobPosition presentation email github { url } linkedin { url } } Hero { homepageIntroduction } }`
		),
		allPages(getProjects),
		allPages(getExperiences),
		allPages(getEducation)
	]);
	return new Response(portfolioMarkdown(profile, projects, experiences, education, base, hero), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
	});
};
