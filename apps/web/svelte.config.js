import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError({ path, message }) {
				// Images downloaded to static/media/ during prerendering are copied
				// by the adapter but aren't visible to the prerender crawler.
				if (path.startsWith('/media/')) return;
				throw new Error(message);
			}
		}
	}
};

export default config;
