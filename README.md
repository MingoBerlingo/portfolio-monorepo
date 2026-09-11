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
`apps/web/build`. `pnpm publish:pages` pushes that static output to the `gh-pages` branch so
[GitHub Pages] can serve it for free — no server, no database, no paid hosting needed.

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
- `pnpm publish:pages` - Build the site and push it to the `gh-pages` branch (GitHub Pages)
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
   pnpm --filter web exec vite preview --base /portfolio-monorepo --port 4173
   ```

   (Use your repo name instead of `portfolio-monorepo`.) For a domain-root site — a
   `<you>.github.io` user/org repo or a custom domain — just `pnpm build:site` + `pnpm web:preview`.

4. **Publish** — push the generated static site to the `gh-pages` branch:

   ```bash
   pnpm publish:pages
   ```

   This rebuilds the site and pushes `apps/web/build` to the `gh-pages` branch of your
   `origin` remote.

### 1-time GitHub Pages setup

1. Create a repository on GitHub and push this project to it:

   ```bash
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```

2. In **Settings → Pages → Build and deployment**, set **Source** to
   **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`.

3. Run `pnpm publish:pages` once — the site goes live at:
   - `https://<you>.github.io/<repo>/` for project sites (base path detected automatically), or
   - the domain root for `<you>.github.io` user/org sites and custom domains.

The publish script detects which case applies from your remote and sets `BASE_PATH`
accordingly. To override (e.g. custom domain), run `BASE_PATH= pnpm publish:pages` or set
`BASE_PATH=/my-path` explicitly.

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
