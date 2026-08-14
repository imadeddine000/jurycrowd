# Changelog

All notable changes to JuryCrowd will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-agent workspace manager with resizable terminal panels
- Persistent tmux-backed terminal sessions
- Workspace CRUD (create, rename, delete) with confirmation dialogs
- Notes & Skills: shared markdown files for agent context
- Resizable sidebar for workspace navigation
- Windows-style workspace tabs for switching between open workspaces
- Panel layout persistence (saved to DB, restored on reconnect)
- Side panel for Notes/Skills/Agent picker (replaces modal dialogs)
- Agent close confirmation dialog ("Kill session?")
- Extensible agent registry (ships with Cline support)
- Dark mode UI

### Fixed
- Terminal keyboard input: replaced Node.js `Buffer.from()` with browser-native `TextEncoder`
- Resizable panel import: switched from namespace import to named imports for Vite compatibility

## [0.1.0] - 2026-08-14

### Added
- Initial release
- Monorepo structure (pnpm workspaces)
- Backend: Express API, Prisma (SQLite), tmux integration, WebSocket terminal gateway
- Frontend: React 18, Vite, shadcn/ui, xterm.js
- Shared types package
