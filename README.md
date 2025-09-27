# Saiver Monorepo

A modern monorepo built with PNPM workspaces, featuring SvelteKit applications and shared packages.

## 🏗️ Architecture

This monorepo is organized into:

- **`apps/`** - Application packages
  - **`web/`** - SvelteKit web application with Storybook
  - **`cms/`** - Content management system (coming soon)
- **`packages/`** - Shared libraries and utilities
  - **`types/`** - Shared TypeScript type definitions

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **PNPM** (v8 or higher)
- **Docker** (for local development services)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd saiver-monorepo
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
- `pnpm clean` - Clean build artifacts

### Application-Specific Commands

- `pnpm web:dev` - Start web app development server
- `pnpm web:build` - Build web application
- `pnpm web:storybook` - Start Storybook development server

## 🛠️ Development

### Project Structure

```
saiver-monorepo/
├── apps/
│   ├── web/                 # SvelteKit application
│   └── cms/                 # CMS application
├── packages/
│   └── types/              # Shared TypeScript types
├── docker-compose.yml      # Development services
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
- **Install a local package**: `pnpm add @saiver/types --filter web`

## 🐳 Docker Services

The project includes a Docker Compose setup for development dependencies:

- **MongoDB** - Database service (port 27017)

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

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🔗 Links

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Storybook Documentation](https://storybook.js.org/)
- [PNPM Workspaces](https://pnpm.io/workspaces)