# CLAUDE.md

## Project Overview

PNPM monorepo with two apps and a shared types package:

- **`apps/web`** — SvelteKit frontend (Svelte 5, Tailwind CSS 4, Cloudflare adapter)
- **`apps/cms`** — Payload CMS on Next.js 15 (MongoDB, Lexical rich text editor)
- **`packages/types`** — Auto-generated TypeScript types from Payload collections

The web app queries the CMS via GraphQL (`/api/graphql`) with an in-memory cache.

## Commands

```bash
pnpm dev              # Run all dev servers
pnpm build            # Build everything
pnpm test             # Run tests across workspace
pnpm lint             # Lint all packages
pnpm format           # Format code
pnpm cms:generate:types  # Regenerate shared types after collection changes
```

## Development Setup

- Docker required for MongoDB (`docker compose up -d`)
- CMS runs on `localhost:3000`, web on `localhost:5173`
- Env files: `apps/web/.env` (CMS_API_URL), `apps/cms/.env` (DATABASE_URI, PAYLOAD_SECRET)

## Type Generation Flow

CMS collections → `pnpm cms:generate:types` → `packages/types/payload-types.ts` → re-exported via `@saiver/types`

Always regenerate types after modifying any collection in `apps/cms/src/collections/`.

## Code Style

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- TypeScript strict mode everywhere
- **Web**: tabs, single quotes, Prettier with Svelte/Tailwind plugins
- **CMS**: spaces, trailing commas, no semicolons
- ESLint configs are per-app (Svelte for web, Next.js for CMS)

## Architecture Notes

- Web server utilities live in `apps/web/src/lib/server/`
- CMS collections are in `apps/cms/src/collections/`
- Storybook is configured in the web app (`pnpm --filter web storybook`)
- CI runs lint, type-check, test, and build on Node 18.x and 20.x
