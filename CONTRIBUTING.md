# Contributing to Saiver Monorepo

Thank you for your interest in contributing to the Saiver Monorepo! This guide will help you get started.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/yourusername/saiver-monorepo.git
   cd saiver-monorepo
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Start development environment**:
   ```bash
   docker-compose up -d
   pnpm dev
   ```

## 📋 Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Making Changes

1. **Create a new branch**:

   ```bash
   git checkout -b feature/my-awesome-feature
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:

   ```bash
   pnpm test
   pnpm lint
   ```

4. **Commit your changes** with a descriptive message:
   ```bash
   git commit -m "feat: add awesome new feature"
   ```

### Commit Message Format

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**

- `feat(web): add user authentication`
- `fix(types): correct user interface definition`
- `docs: update installation instructions`

## 🧪 Testing

- **Run all tests**: `pnpm test`
- **Run tests for specific app**: `pnpm --filter web test`
- **Run linting**: `pnpm lint`
- **Run Storybook**: `pnpm web:storybook`

## 📦 Adding Dependencies

- **Root dependency**: `pnpm add <package> -w`
- **App-specific dependency**: `pnpm add <package> --filter <app-name>`
- **Shared package dependency**: `pnpm add <package> --filter <package-name>`

## 🎨 Code Style

We use:

- **ESLint** for JavaScript/TypeScript linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Run formatting: `pnpm format`

## 📝 Documentation

- Update README.md if you change functionality
- Add JSDoc comments for new functions
- Update Storybook stories for new components

## 🔍 Pull Request Process

1. **Ensure tests pass**: `pnpm test`
2. **Update documentation** if needed
3. **Create a Pull Request** with:

   - Clear title and description
   - Reference to related issues
   - Screenshots/demos if applicable

4. **Address review feedback** promptly
5. **Ensure CI passes** before requesting final review

## 🐛 Reporting Issues

When reporting issues, please include:

- **Environment details** (Node.js version, OS, etc.)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots or error messages** if applicable

## 💡 Feature Requests

For new features:

- **Open an issue** first to discuss the feature
- **Provide use cases** and examples
- **Consider backward compatibility**

## ❓ Questions

If you have questions:

- Check existing issues and documentation
- Open a discussion on GitHub
- Ask in our community channels

## 📜 License

By contributing, you agree that your contributions will be licensed under the same ISC License that covers the project.
