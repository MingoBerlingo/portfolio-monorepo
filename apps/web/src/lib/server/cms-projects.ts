import type { Project } from '@saiver/types';
import { cmsQuery, type PaginatedResponse } from './cms-client';
import { localizeImage, localizeHtmlImages } from './cms-images';

const PROJECTS_QUERY = `
	query Projects($limit: Int, $page: Int, $sort: String) {
		Projects(limit: $limit, page: $page, sort: $sort) {
			docs {
				id
				slug
				title
				year
				featuredImage {
					url
					alt
					width
					height
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
				year
				isFeatured
				isMinor
				client
				role
				featuredImage {
					url
					alt
					width
					height
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

	if (result.contentHtml) {
		result.contentHtml = await localizeHtmlImages(result.contentHtml);
	}

	return result;
}

export async function getProjects(
	options: { limit?: number; page?: number; sort?: string } = {}
): Promise<PaginatedResponse<Project>> {
	const variables = {
		limit: options.limit ?? 10,
		page: options.page ?? 1,
		sort: options.sort ?? '-year'
	};

	const data = await cmsQuery<{ Projects: PaginatedResponse<Project> }>(
		PROJECTS_QUERY,
		variables
	);
	const docs = await Promise.all(data.Projects.docs.map(localizeProjectImages));
	return { ...data.Projects, docs };
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
