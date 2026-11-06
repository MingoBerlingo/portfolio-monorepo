import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { requestViolation } from "./src/lib/server/security";
// Vite serves assets before SvelteKit hooks, so protect development requests too.
const localOnly: Plugin = {
  name: "curriculum-local-only",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const headers = new Headers();
      for (const key of ["host", "origin", "sec-fetch-site"]) {
        const value = req.headers[key];
        if (typeof value === "string") headers.set(key, value);
      }
      const violation = requestViolation(
        new Request(`http://127.0.0.1${req.url || "/"}`, { headers }),
      );
      if (violation) {
        res.statusCode = 403;
        res.end("Use the local app address.");
        return;
      }
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      next();
    });
  },
};
export default defineConfig({
  plugins: [localOnly, tailwindcss(), sveltekit()],
  server: {
    host: "127.0.0.1",
    port: 4174,
    strictPort: true,
    fs: {
      deny: [
        "**/.env",
        "**/.env.*",
        "**/.git/**",
        "**/.local/**",
        "**/apps/cms/**",
        "**/*.{crt,pem}",
        "**/node_modules/**/.cache/**",
      ],
    },
  },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
});
