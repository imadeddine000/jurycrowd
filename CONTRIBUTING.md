# Contributing to JuryCrowd

Thank you for your interest in contributing to JuryCrowd! This document covers everything you need to know.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/jurycrowd.git
   cd jurycrowd
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Start the dev server**:
   ```bash
   pnpm dev
   ```
5. **Create a branch** for your work:
   ```bash
   git checkout -b feat/my-feature
   ```

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- tmux ≥ 3.2
- Git

See the [README](README.md#prerequisites) for full setup instructions.

## Development Workflow

### Running the app

```bash
pnpm dev          # both frontend + backend
pnpm dev:backend  # backend only (port 3001)
pnpm dev:frontend # frontend only (port 5173)
```

### Type checking

Before submitting a PR, ensure type checking passes:

```bash
cd apps/backend && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit
```

### Building

```bash
pnpm build
```

## Code Style

- **TypeScript** for all code (backend and frontend)
- **Prettier** for formatting (config in `.prettierrc`)
- **Tailwind CSS** + **shadcn/ui** for frontend components
- Follow the existing patterns in the codebase

### Formatting

```bash
pnpm format
```

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Each commit message should be structured as:

```
<type>(<scope>): <description>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `chore` | Build process, tooling, or auxiliary changes |
| `ci` | CI configuration changes |
| `refactor` | Code refactoring without behavior change |
| `style` | Code style changes (formatting, etc.) |
| `test` | Adding or updating tests |

### Scopes

| Scope | Description |
|-------|-------------|
| `backend` | Backend (apps/backend) |
| `frontend` | Frontend (apps/frontend) |
| `shared` | Shared package (packages/shared) |
| (none) | Root-level or cross-cutting changes |

### Examples

```
feat(backend): add GitHub integration routes
fix(frontend): use TextEncoder for terminal keyboard input
docs: update README setup guide
chore: rename project to jurycrowd
ci: add GitHub Actions CI workflow
```

## Pull Request Process

1. **Update documentation** if your changes affect the API or UI
2. **Ensure type checking passes** (see above)
3. **Write a clear PR description** using the PR template
4. **Link any related issues** (e.g. `Closes #123`)
5. **Request review** from a maintainer

### PR Checklist

- [ ] Code follows the style guidelines
- [ ] Type checking passes (`tsc --noEmit`)
- [ ] Self-reviewed the code
- [ ] Updated relevant documentation
- [ ] No new warnings or errors

## Project Structure

See the [README](README.md#project-structure) for a detailed overview.

### Key areas

- **`apps/backend/src/routes/`** — REST API endpoints
- **`apps/backend/src/ws/`** — WebSocket terminal gateway
- **`apps/backend/src/agents/`** — Agent CLI registry
- **`apps/frontend/src/components/`** — React components
- **`packages/shared/`** — Shared types and DTOs

## Adding a New Agent

To add support for a new AI coding agent:

1. Edit `apps/backend/src/agents/registry.ts`
2. Add an entry with the agent's command, args, and metadata
3. The agent will appear in the "New agent" picker automatically

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) on GitHub Issues. Include:

- OS and version
- Node.js and pnpm versions
- tmux version
- Steps to reproduce
- Expected vs actual behavior

## Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) on GitHub Issues.

## Code of Conduct

All contributors must adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, inclusive, and constructive.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
