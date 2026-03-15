import { getPosts } from '$lib/server/cms-posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const posts = await getPosts();
	return { posts: posts.docs };
};
