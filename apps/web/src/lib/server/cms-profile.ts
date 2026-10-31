import type { Profile } from '@portfolio/types';
import { cmsQuery } from './cms-client';
import { sanitize } from './sanitize';
import { localizeImage } from './cms-images';

const PROFILE_QUERY = `
	query {
		Profile {
			name
			surname
			jobPosition
			footerHeading
			homepageIntroduction
			homepageImages { key alt image { id url mimeType } }
			presentationHtml
			email
			github {
				label
				url
			}
			linkedin {
				label
				url
			}
		}
	}
`;

export async function getProfile(): Promise<Profile> {
	const data = await cmsQuery<{ Profile: Profile }>(PROFILE_QUERY);
	const profile = data.Profile;

	return {
		...profile,
		homepageImages: await Promise.all(
			(profile.homepageImages ?? []).map(async (entry) => ({
				...entry,
				image:
					typeof entry.image === 'object' && entry.image?.url
						? { ...entry.image, url: await localizeImage(entry.image.url) }
						: entry.image
			}))
		),
		presentationHtml: profile.presentationHtml ? sanitize(profile.presentationHtml) : ''
	};
}
