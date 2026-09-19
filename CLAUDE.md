# CLAUDE.md

## Project Overview

PNPM monorepo with two apps and a shared types package:

- **`apps/web`** — SvelteKit frontend (Svelte 5, Tailwind CSS 4, static adapter for GitHub Pages)
- **`apps/cms`** — Payload CMS on Next.js 15 (MongoDB, Lexical rich text editor)
- **`packages/types`** — Auto-generated TypeScript types from Payload collections

The web app is a fully static site. At production-build time it reads the content + media
live from the CMS/database (`pnpm build:site`), prerenders every page, and stops what it
started. `pnpm publish:static` pushes the result as a standalone site repo (e.g.
`<user>.github.io`) that GitHub Pages serves for free — no server or database needed.

## Commands

```bash
pnpm dev              # Run all dev servers (needs MongoDB + CMS for content)
pnpm build:site       # ONE-command production build: ensures CMS+DB, generates static site from live data
pnpm publish:static   # Build + push the site to a standalone site repo (e.g. <you>.github.io)
pnpm build            # Build everything (web build needs a running CMS locally)
pnpm test             # Run tests across workspace
pnpm lint             # Lint all packages
pnpm format           # Format code
pnpm cms:generate:types  # Regenerate shared types after collection changes
```

## Development Setup

- Docker required for MongoDB (`docker compose up -d`); `pnpm build:site` does this automatically
- CMS runs on `localhost:3000`, web on `localhost:5173`
- Env files: `apps/web/.env` (CMS_API_URL), `apps/cms/.env` (DATABASE_URI, PAYLOAD_SECRET)
- The web app reads content from the CMS at build/run time — start the CMS (`pnpm cms:dev`) to `pnpm dev`; in production the CMS only needs to be up while running `pnpm build:site`

## Type Generation Flow

CMS collections → `pnpm cms:generate:types` → `packages/types/payload-types.ts` → re-exported via `@portfolio/types`

Always regenerate types after modifying any collection in `apps/cms/src/collections/`.

## Code Style

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- TypeScript strict mode everywhere
- **Web**: tabs, single quotes, Prettier with Svelte/Tailwind plugins
- **CMS**: spaces, trailing commas, no semicolons
- ESLint configs are per-app (Svelte for web, Next.js for CMS)

## Deployment

- Web app is fully prerendered at build time (`adapter-static`) and deployed to GitHub Pages
- Production build: `pnpm build:site` (starts MongoDB/CMS if needed, pulls data live via GraphQL, downloads media into `static/media`, prerenders to `apps/web/build`, stops the CMS it started)
- Publish: `pnpm publish:static` — pushes the build as a single fresh commit to a standalone site repo (e.g. `<user>.github.io`) configured as a git remote (default name `pages`)
- `.nojekyll` is shipped (`apps/web/static/.nojekyll` + a safety net in the scripts): branch-based GitHub Pages runs Jekyll, which strips `_app/` and breaks every JS/CSS chunk without it
- Deliberately **no GitHub Actions/workflows**: builds and publishes run locally so nothing consumes CI minutes
- `BASE_PATH` env var sets the deployment subpath (detected automatically from the target repo; empty for `<user>.github.io` roots, `/<repo>` for project sites)
- `kit.paths.relative` is `false` on purpose: relative `base`/`resolve()` relies on a mutable global that leaks between concurrently prerendered pages and breaks links on nested routes (`/projects/<slug>`); a fixed configured base keeps links deterministic
- Media URLs from the CMS are downloaded and rewritten (base-aware) by `apps/web/src/lib/server/cms-images.ts` during the build. File names are owned by the CMS — uploads are sanitized to URL-safe names on the way in and can be renamed from the dashboard (see `apps/cms/src/utils/mediaFilename.ts`); the web build only logs an error for a name that still needs percent-encoding, because static hosts decode the request path and would 404 on it
- `apps/web/scripts/sync-media.mjs` (part of `pnpm build`) copies media fetched *while* prerendering into `build/media`: Vite copies `static/` into the bundle before pages are prerendered, so those files would otherwise be missing from the published output
- `scripts/build-site.sh` clears `apps/web/static/media` before every build, because media URLs do not change when a file is replaced (the CMS keeps the stored name): without it a replaced image would keep being published from the cached copy.
- Rich text HTML is sanitized with `sanitize-html` in server load functions

## Architecture Notes

- Web server utilities live in `apps/web/src/lib/server/`
- CMS collections are in `apps/cms/src/collections/`
- Uploads are sanitized to URL-safe names on the way in (`apps/cms/src/collections/Media.ts` + `apps/cms/src/utils/mediaFilename.ts`): spaces/special characters become dashes, so media URLs need no percent-encoding. The upload collection's `filename` field is re-declared to make it editable in the dashboard — renaming there sanitizes the value, resolves collisions (`-1`, `-2` …) and moves the file on disk (`afterChange`)
- Payload caches its instance per process and reloads it when the config changes (HMR); if a collection/hook edit doesn't seem to apply in dev, restart `pnpm cms:dev`
- Rich text uses async HTML conversion (`afterRead` hook) — not `lexicalHTMLField` — to properly resolve images
- Rich-text blocks are Lexical `BlocksFeature` blocks (`apps/cms/src/blocks/`): the block stores content only and also exports the HTML converter that `Project`'s `afterRead` hook registers under `converters.blocks` (a block without a converter renders as nothing, and Payload logs a converter error). All layout/styling lives in the web app (`apps/web/src/app.css`), which is why the sanitizer allows `class` on every tag. `mediaLayout` — a stack of single-image and two-column rows — is the current example; its layout lives in `app.css` and its spacing follows the prose rhythm
- Storybook is configured in the web app (`pnpm --filter web storybook`)
- CI runs lint, type-check, test, and build on Node 18.x and 20.x
