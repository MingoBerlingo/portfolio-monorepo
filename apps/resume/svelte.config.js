import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csrf: { trustedOrigins: [] },
    csp: {
      mode: "auto",
      directives: {
        "default-src": ["self"],
        "img-src": ["self", "data:"],
        "font-src": ["self", "data:"],
        "style-src": ["self", "unsafe-inline"],
        "connect-src": ["self"],
        "frame-src": ["self", "about:"],
        "base-uri": ["none"],
        "object-src": ["none"],
        "form-action": ["self"],
        "frame-ancestors": ["none"],
      },
    },
  },
};
