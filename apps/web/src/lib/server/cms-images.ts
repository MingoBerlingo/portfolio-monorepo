import { env } from '$env/dynamic/private';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_CMS_URL = 'http://localhost:3000';
const MEDIA_DIR = 'static/media';

function getCmsBaseUrl(): string {
	return env.CMS_API_URL || DEFAULT_CMS_URL;
}

/** Already-downloaded files in this build run (CMS path → local path). */
const downloaded = new Map<string, string>();

/**
 * Download an image from the CMS and save it to static/media/.
 * Returns the local path (e.g. `/media/image.jpg`) to use in the HTML.
 * If the image was already downloaded, returns the cached path.
 */
export async function localizeImage(cmsPath: string): Promise<string> {
	if (downloaded.has(cmsPath)) {
		return downloaded.get(cmsPath)!;
	}

	const filename = cmsPath.split('/').pop();
	if (!filename) return cmsPath;

	const localPath = `/media/${filename}`;
	const destDir = join(process.cwd(), MEDIA_DIR);
	const destFile = join(destDir, filename);

	// Skip download if the file already exists on disk
	if (existsSync(destFile)) {
		downloaded.set(cmsPath, localPath);
		return localPath;
	}

	const url = cmsPath.startsWith('http') ? cmsPath : `${getCmsBaseUrl()}${cmsPath}`;

	try {
		const res = await fetch(url);
		if (!res.ok) {
			console.warn(`[cms-images] Failed to download ${url}: ${res.status}`);
			return cmsPath;
		}

		mkdirSync(destDir, { recursive: true });
		const buffer = Buffer.from(await res.arrayBuffer());
		writeFileSync(destFile, buffer);
		downloaded.set(cmsPath, localPath);
		return localPath;
	} catch (err) {
		console.warn(`[cms-images] Error downloading ${url}:`, err);
		return cmsPath;
	}
}

/**
 * Find all image `src` attributes in an HTML string that point to the CMS,
 * download each image, and rewrite the src to the local path.
 */
export async function localizeHtmlImages(html: string): Promise<string> {
	const cmsBase = getCmsBaseUrl();
	const srcRegex = /(<img\s[^>]*?\bsrc=["'])([^"']+)(["'])/g;

	const matches: { full: string; prefix: string; src: string; suffix: string }[] = [];
	let match;
	while ((match = srcRegex.exec(html)) !== null) {
		matches.push({ full: match[0], prefix: match[1], src: match[2], suffix: match[3] });
	}

	let result = html;
	for (const m of matches) {
		// Only process CMS-hosted images (relative /api/media/ or absolute CMS URL)
		if (m.src.startsWith('/api/media/') || m.src.startsWith(`${cmsBase}/api/media/`)) {
			const cmsPath = m.src.startsWith('http')
				? new URL(m.src).pathname
				: m.src;
			const localPath = await localizeImage(cmsPath);
			result = result.replace(m.full, `${m.prefix}${localPath}${m.suffix}`);
		}
	}

	return result;
}
