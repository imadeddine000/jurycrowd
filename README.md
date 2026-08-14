# JuryCrowd

<p align="center">
  <strong>Open-source multi-agent workspace manager — run AI coding agents side-by-side in resizable terminal panels.</strong>
</p>

<p align="center">
  <a href="https://jurycrowd.com">jurycrowd.com</a> ·
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#development">Development</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="#license">License</a>
</p>

---

## What is JuryCrowd?

JuryCrowd is a self-hosted web application that lets you manage **multiple AI coding agents** (Cline, Claude Code, OpenCode, etc.) in a single browser-based workspace. Each agent runs in its own terminal backed by a persistent tmux session — so you can close your browser, come back later, and pick up right where you left off.

The UI uses a **Cloudflare-style sectioned layout**: a resizable sidebar for workspace navigation, a top bar for switching between open workspaces, and a main content area with resizable terminal panels. No floating windows, no clutter.

## Features

- **Multi-agent terminals** — Launch Cline, Claude Code, OpenCode, or any CLI agent in isolated terminal panels
- **Persistent sessions** — Agents run inside tmux; survive browser refreshes, disconnects, and server restarts
- **Resizable layout** — Cloudflare-style sectioned UI with drag-to-resize sidebar and terminal panels
- **Workspace management** — Create, rename, delete workspaces; each tied to a real project directory on disk
- **Notes & Skills** — Shared markdown files (`.agent-workspace/notes/`, `.agent-workspace/skills/`) that agents can read directly for context
- **Layout persistence** — Panel sizes and arrangement saved to the database; restored on reconnect from any device
- **Extensible agent registry** — Add new agent CLIs via a simple registry (currently ships with Cline support)
- **Dark mode** — Built-in dark theme

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS, xterm.js |
| Backend | Node.js, Express, TypeScript, Prisma (SQLite), node-pty |
| Terminal | tmux (persistent sessions), WebSocket streaming |
| Monorepo | pnpm workspaces |

## Prerequisites

### For Usage

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **tmux** ≥ 3.2 — required for persistent terminal sessions
- At least one **AI coding agent CLI** installed globally (e.g. `npm install -g @anthropic-ai/cline`)

### For Development

All of the above, plus:

- **Git**
- A code editor (VS Code recommended)

### Installing tmux

```bash
# macOS
brew install tmux

# Ubuntu / Debian
sudo apt install tmux

# Arch
sudo pacman -S tmux
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/jurycrowd/jurycrowd.git
cd jurycrowd

# Install dependencies
pnpm install

# Start both frontend and backend in parallel
pnpm dev
```

Then open **http://localhost:5173** in your browser.

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Creating your first workspace

1. Click the **+** icon in the sidebar to create a workspace
2. Enter a title (e.g. "My Project")
3. Click the workspace in the sidebar to open it
4. Click **New agent** in the toolbar to launch an agent terminal
5. Select an agent (e.g. Cline) — a terminal panel appears
6. Type into the terminal to interact with the agent

### Using Notes & Skills

- Click **Notes** or **Skills** in the toolbar to open a side panel
- Create markdown files that are saved to `.agent-workspace/notes/` or `.agent-workspace/skills/` inside the workspace directory
- Agents can read these files directly (e.g. `cat .agent-workspace/notes/design.md`)
- Use Skills to share coding standards, architecture decisions, or project context with all agents

## Development

### Project Structure

```
jurycrowd/
├── apps/
│   ├── backend/           # Express API + WebSocket gateway + Prisma DB
│   │   ├── src/
│   │   │   ├── routes/    # REST endpoints (workspaces, sessions, windows, files)
│   │   │   ├── ws/        # WebSocket terminal gateway
│   │   │   ├── agents/    # Agent registry
│   │   │   └── db.ts      # Prisma client
│   │   └── prisma/        # Schema
│   └── frontend/          # React + Vite + shadcn/ui
│       └── src/
│           ├── components/  # AppShell, WorkspaceSidebar, WorkspaceView, TerminalPane, etc.
│           ├── hooks/      # useDebounced
│           └── lib/        # API client
├── packages/
│   └── shared/            # Shared types and DTOs
├── package.json
└── pnpm-workspace.yaml
```

### Running in Development

```bash
# Install dependencies
pnpm install

# Run both frontend and backend
pnpm dev

# Or run them separately
pnpm dev:backend   # http://localhost:3001
pnpm dev:frontend  # http://localhost:5173
```

### Building

```bash
pnpm build
```

### Type Checking

```bash
# From repo root
cd apps/backend && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit
```

### Adding a New Agent

1. Add the agent to the registry in `apps/backend/src/agents/registry.ts`
2. Specify the command, args, and display metadata
3. The agent will automatically appear in the "New agent" picker in the UI

### Database

The backend uses SQLite via Prisma. The database file is created automatically at `apps/backend/prisma/dev.db` on first run.

To reset the database:

```bash
cd apps/backend
rm prisma/dev.db
npx prisma migrate dev
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `3001` | Backend API port |
| `AGENT_WORKSPACE_ROOT` | `~/.agent-workspaces` | Root directory for workspace project folders |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Setting up your development environment
- Code style and conventions
- Commit message format
- Pull request process

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

## Links

- **Website**: [jurycrowd.com](https://jurycrowd.com)
- **Issues**: [GitHub Issues](https://github.com/jurycrowd/jurycrowd/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jurycrowd/jurycrowd/discussions)
