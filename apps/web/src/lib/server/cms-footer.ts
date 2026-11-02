import type { Footer } from '@portfolio/types';
import { cmsQuery } from './cms-client';

export async function getFooter(): Promise<Footer> {
	const { Footer: footer } = await cmsQuery<{ Footer: Footer }>(
		`query { Footer { heading keywordsHeading signature } }`
	);
	return footer;
}
