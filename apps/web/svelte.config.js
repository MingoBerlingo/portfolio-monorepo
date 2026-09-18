import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		paths: {
			// Subpath the site is hosted under (leading slash, no trailing slash).
			// Leave empty for the domain root (e.g. custom domain or a
			// `<user>.github.io` user/org site). The deploy workflow sets
			// `BASE_PATH=/<repo-name>` automatically for project sites.
			base: process.env.BASE_PATH ?? '',
			// Keep `base`/`resolve()` as the fixed, configured base instead of a
			// per-page relative value. The relative form relies on a mutable
			// global that can leak between concurrently prerendered pages,
			// producing broken links on nested routes (e.g. `/projects/<slug>`).
			relative: false
		},
		prerender: {
			handleHttpError({ path, message }) {
				// Media downloaded to static/media/ while prerendering is not part of
				// the server build, so the crawler reports it as missing. Those files
				// are copied into the output afterwards (scripts/sync-media.mjs).
				// `path` is already prefixed with `paths.base`, so compare with the
				// same prefix — otherwise subpath builds (BASE_PATH=/<repo>) fail.
				if (path.startsWith(`${process.env.BASE_PATH ?? ''}/media/`)) return;
				throw new Error(message);
			}
		}
	}
};

export default config;
