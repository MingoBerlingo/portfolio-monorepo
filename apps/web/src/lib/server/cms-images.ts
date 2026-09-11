import { env } from '$env/dynamic/private';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_CMS_URL = 'http://localhost:3000';
const MEDIA_DIR = 'static/media';

function getCmsBaseUrl(): string {
	return env.CMS_API_URL || DEFAULT_CMS_URL;
}

/**
 * Deployment subpath (e.g. `/portfolio-monorepo`), from the same `BASE_PATH`
 * env var used in `svelte.config.js`. Empty at the domain root. Read from the
 * environment rather than `$app/paths` because these URLs end up inside data
 * and HTML strings that SvelteKit does not rewrite.
 */
function getSubpath(): string {
	return env.BASE_PATH ?? '';
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

	// Prefix with the deployment base path (empty at the domain root) so the
	// media URLs are correct on subpath hosts like GitHub Pages project sites.
	const localPath = `${getSubpath()}/media/${filename}`;
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
			console.error(`[cms-images] Failed to download ${url}: ${res.status}`);
			return cmsPath;
		}

		mkdirSync(destDir, { recursive: true });
		const buffer = Buffer.from(await res.arrayBuffer());
		writeFileSync(destFile, buffer);
		downloaded.set(cmsPath, localPath);
		return localPath;
	} catch (err) {
		console.error(`[cms-images] Error downloading ${url}:`, err);
		return cmsPath;
	}
}

function isCmsMediaSource(src: string, cmsBase: string): boolean {
	return src.startsWith('/api/media/') || src.startsWith(`${cmsBase}/api/media/`);
}

async function localizeCmsMediaSource(src: string, cmsBase: string): Promise<string> {
	if (!isCmsMediaSource(src, cmsBase)) {
		return src;
	}

	const cmsPath = src.startsWith('http') ? new URL(src).pathname : src;
	return localizeImage(cmsPath);
}

/**
 * Find all image/video `src` attributes in an HTML string that point to the CMS,
 * download each file, and rewrite the src to the local path.
 */
export async function localizeHtmlImages(html: string): Promise<string> {
	const cmsBase = getCmsBaseUrl();

	const replaceMediaSrc = async (input: string, regex: RegExp): Promise<string> => {
		const matches: { full: string; prefix: string; src: string; suffix: string }[] = [];
		let match;
		while ((match = regex.exec(input)) !== null) {
			matches.push({ full: match[0], prefix: match[1], src: match[2], suffix: match[3] });
		}

		let output = input;
		for (const m of matches) {
			const localPath = await localizeCmsMediaSource(m.src, cmsBase);
			if (localPath !== m.src) {
				output = output.replace(m.full, `${m.prefix}${localPath}${m.suffix}`);
			}
		}

		return output;
	};

	let result = await replaceMediaSrc(html, /(<img\s[^>]*?\bsrc=["'])([^"']+)(["'])/g);
	result = await replaceMediaSrc(result, /(<(?:video|source)\s[^>]*?\bsrc=["'])([^"']+)(["'])/g);
	result = await replaceMediaSrc(result, /(<video\s[^>]*?\bposter=["'])([^"']+)(["'])/g);

	return result;
}
