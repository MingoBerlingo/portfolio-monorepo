# Portfolio Monorepo

A modern monorepo built with PNPM workspaces, featuring SvelteKit applications and shared packages.

## 🏗️ Architecture

This monorepo is organized into:

- **`apps/`** - Application packages
  - **`web/`** - SvelteKit web application with Storybook
  - **`cms/`** - Payload CMS for content management
- **`packages/`** - Shared libraries and utilities
  - **`types/`** - Shared TypeScript type definitions (auto-generated from Payload CMS)

**Static site from your own database.** Content is edited in the CMS (MongoDB +
[Payload]) on your machine. `pnpm build:site` is the *production build*: it reads the data
directly from the database at build time and prerenders the whole site into
`apps/web/build`. `pnpm publish:static` pushes that output as a standalone site repo (e.g.
`<you>.github.io`) that [GitHub Pages] serves for free — no server, no database, no paid
hosting needed.

[Payload]: https://payloadcms.com
[GitHub Pages]: https://pages.github.com

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **PNPM** (v8 or higher)
- **Docker** (for local development services)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd portfolio-monorepo
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development services**

   ```bash
   docker-compose up -d
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

## 📦 Available Scripts

### Root Level Commands

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all applications
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code across all packages
- `pnpm build:site` - Production build: pull data live from the DB/CMS, generate the static site in `apps/web/build`
- `pnpm publish:static` - Build and push the site to a standalone site repo (e.g. `<you>.github.io`)
- `pnpm clean` - Clean build artifacts

### Application-Specific Commands

- `pnpm web:dev` - Start web app development server
- `pnpm web:build` - Build web application
- `pnpm web:storybook` - Start Storybook development server
- `pnpm cms:dev` - Start Payload CMS development server
- `pnpm cms:build` - Build CMS application
- `pnpm cms:start` - Start CMS in production mode
- `pnpm cms:generate:types` - Generate TypeScript types from CMS collections into the shared `@portfolio/types` package

## ✏️ Publishing & Deployment

The site is a fully static website: at "production build" time it grabs the content + media
straight from your local database (via the CMS) and prerenders every page. The output in
`apps/web/build` can be hosted **for free** on GitHub Pages (or any static host). No server
or database is needed to *serve* the site — only to *generate* it.

### Workflow (edit → publish)

1. **Edit content in the CMS** (admin at `http://localhost:3000/admin`):

   ```bash
   pnpm docker:up     # start MongoDB (if you haven't already)
   pnpm cms:dev       # start Payload CMS for editing
   ```

2. **Generate the static site** — `pnpm build:site` is the one-shot production build.
   It starts MongoDB and the CMS for you if they aren't running, waits until the CMS is
   ready, then reads the data live from the database and prerenders the whole site:

   ```bash
   pnpm build:site
   ```

   (If you prefer to keep the CMS running yourself, that's fine too — it detects it and
   just uses it. The CMS it starts automatically is stopped again when the build finishes.)

3. **Preview locally** (optional, no CMS needed — it only serves the built site):

   ```bash
   pnpm web:preview     # serves apps/web/build at http://localhost:4173
   ```

   Using the **project-site** subpath (`<you>.github.io/<repo>/`)? Build and preview like this so the URLs resolve exactly as they will in production:

   ```bash
   BASE_PATH=/portfolio-monorepo pnpm build:site
   BASE_PATH=/portfolio-monorepo pnpm web:preview
   ```

   (Use your repo name instead of `portfolio-monorepo`.) For a domain-root site — a
   `<you>.github.io` user/org repo or a custom domain — just `pnpm build:site` + `pnpm web:preview`.

4. **Publish** — build and push the site to a **separate, standalone site repository**:

   ```bash
   pnpm publish:static
   ```

   This rebuilds the site and force-pushes `apps/web/build` as a single fresh commit to the
   `pages` remote. Nothing is committed to this (source) repo and **no CI/Actions run** —
   everything happens on your machine.

### Setup: dedicated user-site repo

Serving from a repo named exactly `<you>.github.io` gives you the domain **root**
(`https://<you>.github.io/`) and the cleanest separation: this monorepo stays source-only
(it can even be private) and the site repo contains *only* the built output.

1. Create a **public** repository named exactly `<you>.github.io` on GitHub.
2. Register it here as a `pages` remote:

   ```bash
   git remote add pages git@github.com:<you>/<you>.github.io.git
   ```

3. In that repo: **Settings → Pages → Deploy from a branch → `main` / (root)**.
4. Publish whenever you change content:

   ```bash
   pnpm publish:static
   ```

   → live at `https://<you>.github.io/` (base path `''` — no subpath logic at all).

### Why `.nojekyll` matters

GitHub Pages serves *branch* deploys through Jekyll, which **ignores any file or directory
whose name starts with `_`** — including SvelteKit's `_app/` folder that holds every JS/CSS
chunk. The page then loads but every chunk 404s. The build ships an empty `.nojekyll` file at
the site root (`apps/web/static/.nojekyll`, plus a safety net in the publish scripts) which
disables Jekyll processing. Without it you'd see console errors like:

```text
GET https://<you>.github.io/_app/immutable/chunks/xxxx.js 404
```

> **No GitHub Actions required.** Publishing is entirely local: build against your database,
> then push the generated files. This repo ships **no workflows**, so nothing consumes Actions
> minutes.

## Homepage introduction

The section below the homepage hero is edited in **CMS → Hero → Homepage introduction**.
Use a blank line between paragraphs. Put an image marker such as `[design-system]`
where you want a small inline illustration. The built-in markers are `[design-system]`,
`[components]`, and `[pull-request]`; remove a marker to remove its illustration.

To replace an illustration or add your own, add a **Homepage images** row, enter
its key (without brackets), and select an image from Media. PNG, JPEG, WebP, AVIF,
GIF, and SVG images are supported. Use the same `[key]` in the text. Set alt text
when the image conveys information; leave it empty for decoration. Unresolved
markers are omitted. Empty introduction text uses the built-in copy.

Restart the CMS after updating its schema. As with other content, rebuild with
`pnpm build:site` after editing to update the published static site. The reveal
respects reduced motion, and all copy remains readable without JavaScript.

## 🔄 Shared Types

The `packages/types` package contains TypeScript types that are **auto-generated from Payload CMS collections**. This ensures the web frontend always has accurate, up-to-date types matching the CMS schema.

**How it works:**

1. Payload CMS generates `packages/types/payload-types.ts` directly (configured via `outputFile` and `declare: false` in `payload.config.ts`)
2. `packages/types/index.ts` re-exports only the types needed by the frontend (`Project`, `Media`, `User`)
3. The web app imports them as `import type { Project } from '@portfolio/types'`

**When to regenerate:** after adding or modifying fields in any CMS collection (`apps/cms/src/collections/`), run:

```bash
pnpm cms:generate:types
```

> **Note:** Do not manually edit `packages/types/payload-types.ts` — it will be overwritten on the next generation.

## 🛠️ Development

### Project Structure

```
portfolio-monorepo/
├── apps/
│   ├── web/                 # SvelteKit application
│   └── cms/                 # Payload CMS application
├── packages/
│   └── types/              # Shared TypeScript types
├── docker-compose.yml      # Development services (MongoDB)
├── pnpm-workspace.yaml    # PNPM workspace configuration
└── package.json           # Root package configuration
```

### Adding New Packages

To add a new application:

```bash
mkdir apps/my-new-app
cd apps/my-new-app
pnpm init
```

To add a new shared package:

```bash
mkdir packages/my-new-package
cd packages/my-new-package
pnpm init
```

### Working with Dependencies

- **Install a dependency for all workspaces**: `pnpm add <package> -w`
- **Install a dependency for a specific workspace**: `pnpm add <package> --filter web`
- **Install a local package**: `pnpm add @portfolio/types --filter web`

## 🐳 Docker Services

The project includes a Docker Compose setup for development dependencies:

- **MongoDB** - Database service for Payload CMS (port 27017)

Start services: `docker-compose up -d`
Stop services: `docker-compose down`

## 🧪 Testing

- **Unit Tests**: `pnpm test`
- **Storybook**: `pnpm web:storybook`

## 📝 Code Style

The project uses:

- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 🔗 Links

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Storybook Documentation](https://storybook.js.org/)
- [PNPM Workspaces](https://pnpm.io/workspaces)

## Footer and project keywords

The footer uses the Profile email, GitHub and LinkedIn links. Edit its contact
heading in **CMS → Profile → Footer heading**. The footer reveals beneath the
page on screens where it fits; short screens, keyboard focus and reduced-motion
preferences use normal document flow so all links remain accessible.

Manage chip labels in **CMS → Keywords**. `Show in footer` selects the footer
chips; `Order` controls their order. The first 16 selected keywords are shown.
Projects have a multi-select **Keywords** relationship, ready for categorization;
these assignments are intentionally not rendered on project cards or pages.

To recreate the starter keywords without overwriting existing records:

```sh
pnpm --filter cms payload run scripts/seed-keywords.ts
```

Physics loads only when the footer is revealed and prepares a settled pile
without a drop animation. It pauses offscreen and in hidden tabs, and sleeps
when the chips settle. Drag a chip to move it, or focus its
button and press Enter/Space to toss it. Reduced motion shows a static list.
After CMS edits, rebuild the static site with `pnpm build:site` to publish them.

## Local CV editor

The separate [Curriculum Studio app](apps/curriculum/README.md) loads Italian or
English content from the CMS, lets you edit the CV layout directly, saves named versions
with dates in this browser, and downloads the edited copy as PDF.

Run `pnpm dev` for all apps or `pnpm curriculum:dev` for the editor alone, then open
`http://localhost:4174`. MongoDB must be running to import fresh content; no CMS browser login is needed. CV edits
and browser history stay separate from the CMS and published website. Optional
`pnpm curriculum:pdf --locale it` remains available for command-line exports.
