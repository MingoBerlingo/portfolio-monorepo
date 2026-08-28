import type { Profile } from '@saiver/types';
import { cmsQuery } from './cms-client';
import { sanitize } from './sanitize';

const PROFILE_QUERY = `
	query {
		Profile {
			name
			surname
			jobPosition
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
		presentationHtml: profile.presentationHtml ? sanitize(profile.presentationHtml) : ''
	};
}
