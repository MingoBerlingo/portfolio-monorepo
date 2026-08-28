import type { Experience } from '@saiver/types';
import { cmsQuery, type PaginatedResponse } from './cms-client';

const EXPERIENCES_QUERY = `
	query Experiences($limit: Int, $page: Int, $sort: String) {
		Experiences(limit: $limit, page: $page, sort: $sort) {
			docs {
				id
				company
				role
				startDate
				endDate
				industries {
					industry
				}
				activities {
					activity
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

export async function getExperiences(
	options: { limit?: number; page?: number; sort?: string } = {}
): Promise<PaginatedResponse<Experience>> {
	const variables = {
		limit: options.limit ?? 50,
		page: options.page ?? 1,
		sort: options.sort ?? '-startDate'
	};

	const data = await cmsQuery<{ Experiences: PaginatedResponse<Experience> }>(
		EXPERIENCES_QUERY,
		variables
	);

	return data.Experiences;
}
