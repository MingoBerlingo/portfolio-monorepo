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
- Media URLs from the CMS are downloaded and rewritten (base-aware) by `apps/web/src/lib/server/cms-images.ts` during the build
- Rich text HTML is sanitized with `sanitize-html` in server load functions

## Architecture Notes

- Web server utilities live in `apps/web/src/lib/server/`
- CMS collections are in `apps/cms/src/collections/`
- Rich text uses async HTML conversion (`afterRead` hook) — not `lexicalHTMLField` — to properly resolve images
- Storybook is configured in the web app (`pnpm --filter web storybook`)
- CI runs lint, type-check, test, and build on Node 18.x and 20.x
