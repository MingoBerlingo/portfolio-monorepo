#!/usr/bin/env node
/**
 * Copy CMS media into the build output.
 *
 * Vite copies `static/` into the client bundle *before* pages are prerendered,
 * so an image that `src/lib/server/cms-images.ts` downloads while prerendering
 * (because it was not in `static/media` yet) ends up missing from `build/` and
 * the published site 404s on it. Every file the site references lands in
 * `static/media`, so syncing it into `build/media` afterwards keeps the output
 * complete.
 *
 * Files that are already in the build output are left untouched — they were
 * copied from this very directory. Run by `pnpm build` (see package.json).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(appDir, 'static', 'media');
const buildDir = join(appDir, 'build');
const targetDir = join(buildDir, 'media');

// Nothing to do without a static build output (or without any media at all).
// `build/media` may not exist yet: when it is created, existing files are kept.
if (!existsSync(sourceDir) || !existsSync(buildDir)) {
	process.exit(0);
}

const missing = readdirSync(sourceDir, { withFileTypes: true })
	.filter((entry) => entry.isFile() && !existsSync(join(targetDir, entry.name)))
	.map((entry) => entry.name);

if (missing.length > 0) {
	mkdirSync(targetDir, { recursive: true });
	for (const name of missing) {
		copyFileSync(join(sourceDir, name), join(targetDir, name));
	}
	console.log(`[sync-media] copied ${missing.length} media file(s) into build/media`);
}
