import type { Education } from '@saiver/types';
import { cmsQuery, type PaginatedResponse } from './cms-client';

const EDUCATION_QUERY = `
	query Educations($limit: Int, $page: Int, $sort: String) {
		Educations(limit: $limit, page: $page, sort: $sort) {
			docs {
				id
				startDate
				endDate
				title
				school
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

export async function getEducation(
	options: { limit?: number; page?: number; sort?: string } = {}
): Promise<PaginatedResponse<Education>> {
	const variables = {
		limit: options.limit ?? 50,
		page: options.page ?? 1,
		sort: options.sort ?? '-startDate'
	};

	const data = await cmsQuery<{ Educations: PaginatedResponse<Education> }>(
		EDUCATION_QUERY,
		variables
	);
	return data.Educations;
}
