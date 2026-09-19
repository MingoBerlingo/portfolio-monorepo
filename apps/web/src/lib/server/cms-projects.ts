import type { Project } from '@portfolio/types';
import { cmsQuery, type PaginatedResponse } from './cms-client';
import { localizeImage, localizeHtmlImages } from './cms-images';

const PROJECTS_QUERY = `
	query Projects($limit: Int, $page: Int, $sort: String, $where: Project_where) {
		Projects(limit: $limit, page: $page, sort: $sort, where: $where) {
			docs {
				id
				slug
				title
				shortTitle
				tagline
				year
				isFeatured
				featuredImage {
					url
					alt
					width
					height
				}
				videoCover {
					url
					alt
					width
					height
					mimeType
				}
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

const PROJECT_BY_SLUG_QUERY = `
	query Projects($slug: String!) {
		Projects(where: { slug: { equals: $slug } }, limit: 1) {
			docs {
				id
				slug
				title
				shortTitle
				tagline
				year
				isFeatured
				isMinor
				client
				role
				output
				featuredImage {
					url
					alt
					width
					height
				}
				videoCover {
					url
					alt
					width
					height
					mimeType
				}
				links {
					label
					url
				}
				collaborators {
					name
				}
				contentHtml
				createdAt
				updatedAt
			}
		}
	}
`;

async function localizeProjectImages(project: Project): Promise<Project> {
	const result = { ...project };

	if (typeof result.featuredImage === 'object' && result.featuredImage?.url) {
		result.featuredImage = {
			...result.featuredImage,
			url: await localizeImage(result.featuredImage.url)
		};
	}

	if (typeof result.videoCover === 'object' && result.videoCover?.url) {
		result.videoCover = {
			...result.videoCover,
			url: await localizeImage(result.videoCover.url)
		};
	}

	if (result.contentHtml) {
		result.contentHtml = await localizeHtmlImages(result.contentHtml);
	}

	return result;
}

export async function getProjects(
	options: { limit?: number; page?: number; sort?: string; where?: Record<string, unknown> } = {}
): Promise<PaginatedResponse<Project>> {
	const variables: Record<string, unknown> = {
		limit: options.limit ?? 10,
		page: options.page ?? 1,
		sort: options.sort ?? '-year'
	};
	if (options.where) {
		variables.where = options.where;
	}

	const data = await cmsQuery<{ Projects: PaginatedResponse<Project> }>(PROJECTS_QUERY, variables);
	const docs = await Promise.all(data.Projects.docs.map(localizeProjectImages));
	return { ...data.Projects, docs };
}

export async function getFeaturedProjects(limit = 4): Promise<PaginatedResponse<Project>> {
	return getProjects({ where: { isFeatured: { equals: true } }, limit });
}

export async function getProjectBySlug(slug: string): Promise<Project> {
	const data = await cmsQuery<{ Projects: PaginatedResponse<Project> }>(PROJECT_BY_SLUG_QUERY, {
		slug
	});
	const project = data.Projects.docs[0];
	if (!project) {
		throw new Error(`Project not found: ${slug}`);
	}
	return localizeProjectImages(project);
}
