#!/usr/bin/env node
/**
 * Serve the static build output (`apps/web/build`) like a static host would.
 *
 * `vite preview` is not used here: SvelteKit's `vite preview` runs the Node SSR
 * server (`.svelte-kit/output/server`), which re-runs `load` functions against
 * the CMS at request time. For an `adapter-static` build the CMS is stopped
 * after `pnpm build:site`, so those SSR requests fail and every asset 500s.
 * A static file server instead serves the prerendered HTML and copied media
 * directly — exactly what a static host (GitHub Pages, S3, …) does.
 *
 * Supports the same `BASE_PATH` the build accepts, so subpath builds
 * (`BASE_PATH=/portfolio-monorepo pnpm web:preview`) resolve exactly like they
 * will in production.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(appDir, 'build');
const port = Number(process.env.PORT ?? 4173);
const base = process.env.BASE_PATH ?? ''; // e.g. '/portfolio-monorepo'

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.webm': 'video/webm',
	'.mp4': 'video/mp4',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain',
	'.xml': 'application/xml',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.map': 'application/json'
};

/** Strip the configured base path and decode the request path to a relative path. */
function normalizePathname(pathname) {
	if (base) {
		if (pathname === base) pathname = '/';
		else if (pathname.startsWith(`${base}/`)) pathname = pathname.slice(base.length);
		else return null; // outside the base path — nothing to serve
	}

	let decoded;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		return null;
	}

	// Relative to the build dir: drop the leading slash, resolve `.`/`..`.
	const rel = normalize(decoded.replace(/^\/+/, '')).replace(/\\/g, '/');
	// Reject anything that escapes the build directory.
	if (rel === '..' || rel.startsWith('../') || rel.startsWith('/')) return null;

	return rel === '.' ? '' : rel; // '' = the site root
}

/** Map a request path to a file on disk, applying clean-URL → `.html`. */
function resolveFile(pathname) {
	const rel = pathname === '' ? 'index.html' : pathname;
	let filePath = join(buildDir, rel);

	if (existsSync(filePath) && statSync(filePath).isFile()) return filePath;

	// `/projects` and `/projects/tcg` → `projects.html` / `projects/tcg.html`
	if (!extname(rel)) {
		const htmlPath = `${filePath}.html`;
		if (existsSync(htmlPath) && statSync(htmlPath).isFile()) return htmlPath;
	}

	// `/projects/` (trailing slash) → the matching `.html` too
	if (rel.endsWith('/')) {
		const dirHtml = join(filePath, 'index.html');
		if (existsSync(dirHtml)) return dirHtml;
	}

	return null;
}

if (!existsSync(buildDir)) {
	console.error(`[preview] No build found at ${buildDir}. Run \`pnpm build:site\` first.`);
	process.exit(1);
}

createServer((req, res) => {
	const pathname = normalizePathname(new URL(req.url ?? '/', 'http://localhost').pathname);
	const filePath = pathname === null ? null : resolveFile(pathname);

	if (!filePath) {
		res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
		res.end('Not found');
		return;
	}

	const type = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
	res.writeHead(200, { 'content-type': type });
	createReadStream(filePath).pipe(res);
}).listen(port, () => {
	console.log(`Serving ${buildDir}`);
	console.log(`  Local:   http://localhost:${port}${base}/`);
});
