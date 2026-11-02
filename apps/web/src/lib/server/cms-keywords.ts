import type { Keyword } from '@portfolio/types';
import { cmsQuery } from './cms-client';

export async function getFooterKeywords(): Promise<Keyword[]> {
	const data = await cmsQuery<{ Keywords: { docs: Keyword[] } }>(`
		query {
			Keywords(where: { showInFooter: { equals: true } }, sort: "order", limit: 16) {
				docs { id label order showInFooter }
			}
		}
	`);
	return data.Keywords.docs;
}
