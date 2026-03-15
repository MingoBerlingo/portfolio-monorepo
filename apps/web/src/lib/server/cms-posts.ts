import type { Post } from '@saiver/types';
import { cmsQuery, type PaginatedResponse } from './cms-client';

const POSTS_QUERY = `
	query Posts($limit: Int, $page: Int, $sort: String) {
		Posts(limit: $limit, page: $page, sort: $sort) {
			docs {
				id
				title
				contentHtml
				createdAt
				updatedAt
			}
			totalDocs
			totalPages
			page
			limit
			hasNextPage
			hasPrevPage
			nextPage
			prevPage
		}
	}
`;

const POST_BY_ID_QUERY = `
	query Post($id: String!) {
		Post(id: $id) {
			id
			title
			content
			contentHtml
			createdAt
			updatedAt
		}
	}
`;

export async function getPosts(
	options: { limit?: number; page?: number; sort?: string } = {}
): Promise<PaginatedResponse<Post>> {
	const variables = {
		limit: options.limit ?? 10,
		page: options.page ?? 1,
		sort: options.sort ?? '-createdAt'
	};

	const data = await cmsQuery<{ Posts: PaginatedResponse<Post> }>(POSTS_QUERY, variables);
	return data.Posts;
}

export async function getPost(id: string): Promise<Post> {
	const data = await cmsQuery<{ Post: Post }>(POST_BY_ID_QUERY, { id });
	return data.Post;
}
