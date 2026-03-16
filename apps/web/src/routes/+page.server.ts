import { getPosts } from '$lib/server/cms-posts';
import { sanitize } from '$lib/server/sanitize';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const posts = await getPosts();
	return {
		posts: posts.docs.map((post) => ({
			...post,
			contentHtml: post.contentHtml ? sanitize(post.contentHtml) : ''
		}))
	};
};
