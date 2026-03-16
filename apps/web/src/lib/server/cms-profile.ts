import type { Profile } from '@saiver/types';
import { cmsQuery } from './cms-client';

const PROFILE_QUERY = `
	query {
		Profile {
			name
			surname
			jobPosition
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
	return data.Profile;
}
