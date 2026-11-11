import type { Hero } from '@portfolio/types';
import { cmsQuery } from './cms-client';
import { localizeImage } from './cms-images';

export async function getHero(): Promise<Hero> {
	const { Hero: hero } = await cmsQuery<{ Hero: Hero }>(`query { Hero {
  greeting nameLine introduction homepageIntroduction
  featuredProjects { id }
  homepageImages { key alt image { id url mimeType previewDataURL } }
 } }`);
	return {
		...hero,
		homepageImages: await Promise.all(
			(hero.homepageImages ?? []).map(async (entry) => ({
				...entry,
				image:
					typeof entry.image === 'object' && entry.image?.url
						? { ...entry.image, url: await localizeImage(entry.image.url) }
						: entry.image
			}))
		)
	};
}
