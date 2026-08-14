# Agent Workspace — Full Architecture & Build Guide

> This document is a complete technical specification for building a locally-hosted, web-based, multi-agent orchestration workspace. It is written to be handed to an AI coding agent as its primary source of truth. Follow the tasks in order. **Each task must leave the app in a fully working state** — no task should depend on a future task to be functional. Do not skip ahead or batch tasks together.

---

## 1. Product Vision

A web UI, run locally on a developer's machine (or a home server), that lets a user:

1. Open the app in a browser (local or remote).
2. Create/open a **workspace** — a persistent container tied to a project directory.
3. Inside a workspace, launch one or more **agent sessions** (Claude Code, Cline, OpenCode, etc.), each rendered as a live, interactive terminal inside a draggable/resizable window.
4. Run multiple agent instances concurrently, side by side, inside the same workspace.
5. Close the browser tab, or connect from an entirely different device/location, and find every session **exactly as it was left** — running, with full scrollback — because the actual process state lives on the host machine, not in the browser. This is the core requirement: **the browser is a viewport onto persistent server-side state, not the owner of that state** (the same model as RDP/VNC, or `tmux attach` from a new terminal).
6. Manage several workspaces at once, each appearing as its own top-level "window" in a desktop-like shell (analogous to how a browser manages multiple windows, each with tabs/panels inside).
7. Attach richer workspace-level tools: GitHub integration, markdown notes/skills files that agents can read from disk, drag-and-drop file handling.

---

## 2. Tech Stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Backend runtime | Node.js (LTS) |
| Backend framework | Express |
| Realtime transport | `ws` (WebSocket) + `node-pty` |
| Terminal multiplexer | `tmux` (must be installed on host) |
| ORM / DB | Prisma + SQLite (file-based, zero-config, fits "local app" requirement) |
| Frontend tooling | Vite |
| Frontend framework | React + TypeScript |
| UI component system | shadcn/ui (Radix primitives + Tailwind) |
| Terminal rendering | `xterm.js` + `xterm-addon-fit` + `xterm-addon-attach` |
| Window management | Custom window-manager component (see §6.3) built on `react-rnd` (drag+resize) |
| Drag-and-drop | `dnd-kit` |
| Panel layout (resizable splits) | `react-resizable-panels` |

Repo layout (monorepo):

```
/apps
  /backend      -> Express + WS + Prisma
  /frontend     -> Vite + React + shadcn
/packages
  /shared       -> shared TypeScript types (WS message contracts, DTOs)
```

---

## 3. Core Architectural Model

The single most important design decision in this app: **tmux owns terminal state, the app only owns metadata and pipes bytes.**

```
Browser (xterm.js) <--WebSocket--> Express/ws gateway <--PTY (node-pty)--> `tmux attach -t <session_name>`
```

- Every agent instance the user launches maps to exactly one tmux session, named deterministically: `ws_<workspaceId>_<agentType>_<instanceId>`.
- Launching an agent runs: `tmux new-session -A -d -s <session_name> -c <workspace_cwd> "<agent_launch_command>"`. The `-A` flag means "attach if exists, else create" — this makes the launch operation idempotent and is what prevents duplicate state when the same agent is "opened" from two different clients.
- Every browser terminal window opens its own WebSocket connection. The backend spawns a fresh `node-pty` process running `tmux attach -t <session_name>` for **each** such connection. tmux itself handles mirroring all attached clients to the same screen — the backend does not need custom broadcast/sync logic for terminal content.
- The **Prisma database only stores metadata** (which sessions exist, which workspace they belong to, window position/size, notes, etc.) — never terminal content. Terminal content/scrollback lives inside tmux's own buffer.
- If the backend process restarts, it reconciles its DB records against `tmux list-sessions` on boot to rebuild an accurate live/dead status per session.

---

## 4. Data Model (Prisma schema — implement exactly, extend only where a task says to)

```prisma
// schema.prisma

model Workspace {
  id          String   @id @default(cuid())
  title       String
  cwd         String              // absolute path on host filesystem, the project root
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  windows     AppWindow[]
  sessions    AgentSession[]
  notes       Note[]
  skills      Skill[]
  githubRepo  GithubRepoLink?
}

model AgentSession {
  id            String   @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  agentType     String              // "claude-code" | "cline" | "opencode" | custom
  tmuxSession   String   @unique    // deterministic session name
  status        String   @default("running") // running | stopped | crashed
  launchCommand String
  createdAt     DateTime @default(now())
  lastAttached  DateTime @default(now())
}

model AppWindow {
  id            String   @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  kind          String              // "terminal" | "notes" | "skill" | "github" | "browser"
  refId         String?             // e.g. AgentSession.id, Note.id — nullable for non-referencing panels
  x             Float
  y             Float
  width         Float
  height        Float
  zIndex        Int
  minimized     Boolean  @default(false)
  maximized     Boolean  @default(false)
  title         String
}

model Note {
  id            String   @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  title         String
  filePath      String              // real path on disk under <workspace.cwd>/.agent-workspace/notes/
  updatedAt     DateTime @updatedAt
}

model Skill {
  id            String   @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name          String
  filePath      String              // real path under <workspace.cwd>/.agent-workspace/skills/
  updatedAt     DateTime @updatedAt
}

model GithubRepoLink {
  id            String   @id @default(cuid())
  workspaceId   String   @unique
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  remoteUrl     String
  defaultBranch String
  connectedAt   DateTime @default(now())
}
```

Key design point: Notes and Skills are **real files on disk inside the workspace's `cwd`** (under a `.agent-workspace/` folder), not blobs in the DB. This is what makes them readable by the agent CLIs themselves — an agent running `claude` or `cline` in that `cwd` can `cat .agent-workspace/skills/*.md` or be instructed to treat that folder as shared context. The DB row is just an index/metadata pointer for the UI.

---

## 5. WebSocket Protocol

One WS endpoint: `wss://<host>/ws/terminal/:sessionId`

Client → Server messages (JSON, except raw keystrokes which are sent as plain text frames for minimal latency):
```ts
// Plain string frame = raw keystrokes, sent as-is to the PTY
// Control messages are JSON with a "type" field:
{ type: "resize", cols: number, rows: number }
{ type: "ping" }
```

Server → Client:
```ts
// Plain string/binary frame = raw PTY output, written directly to xterm.js
// Control messages:
{ type: "session_status", status: "running" | "exited" | "error", message?: string }
{ type: "pong" }
```

Resize handling: whenever the xterm.js container resizes (via `xterm-addon-fit`), the frontend sends a `resize` control message; the backend calls `pty.resize(cols, rows)` and additionally issues `tmux resize-window -t <session> -x cols -y rows` so the shared session redraws correctly for all attached clients, not just the resizing one.

---

## 6. Frontend Design

### 6.1 Design language
Use shadcn/ui as the base component system (buttons, dialogs, dropdowns, tabs, context menus, tooltips, command palette via `cmdk`). Tailwind config should define a small custom token layer on top of shadcn defaults:
- Neutral, low-saturation base palette (grays/slate) so terminal content — which has its own colors — stays the visual focus.
- One accent color used sparingly (active window border, primary buttons, focus rings).
- Support light and dark themes from day one (dark as default, since this is a dev tool).
- Monospace font (e.g. `JetBrains Mono` or `Berkeley Mono` fallback) for anything terminal-adjacent; a clean sans (e.g. `Inter`) for chrome/UI text.

### 6.2 Top-level shell: "windows of windows"
The app root is a **desktop-like shell**:
- A top bar (like a browser's window bar) listing every open **workspace** as a tab/pill, plus a "+ New workspace" button. Clicking a workspace tab brings its window to front.
- Each workspace renders as its own large window/canvas — think of each workspace like a separate browser *window*, and everything inside it (terminals, notes, GitHub panel) as *tabs/panels/floating panes* within that window, exactly like a browser holds multiple tabs.
- Workspaces can be reordered via drag on the top bar (`dnd-kit` sortable).
- A workspace window has its own title bar showing the workspace title (editable inline on double-click), with minimize/close controls. Workspace state (open/closed, position) is itself persisted, same pattern as everything else in this app.

### 6.3 Inside a workspace: freeform window manager
Inside each workspace's canvas is a **freeform desktop** where the user can open multiple floating panels:
- Terminal panels (one per `AgentSession`)
- Notes panel (markdown editor + live preview, split view)
- Skills panel (list of skill `.md` files, click to edit)
- GitHub panel (repo status, branch, clone/pull controls)
- Each panel is a window: draggable by its title bar, resizable from any edge/corner (`react-rnd`), with minimize/maximize/close controls, and a z-index that updates on focus (click-to-front).
- Snapping: implement simple edge/corner snapping (snap to other window edges and to the canvas edges) and a "tile" quick-action (cmd/ctrl+arrow to snap left/right/top/bottom half, like Windows Aero Snap) — this is a big usability win for arranging multiple terminals side by side.
- **Every window's position/size/z-index/minimized state persists to `AppWindow` in the DB on every drag/resize end (debounced), and is restored on load.** This persistence is what extends the "RDP-like" guarantee to the UI layer, not just the terminal layer — a user reconnecting sees their exact layout, not just their exact running processes.

### 6.4 Terminal panel specifics
- Renders `xterm.js` with the fit addon; resize observer triggers `fitAddon.fit()` then sends the WS resize control message described in §5.
- Title bar shows: agent type icon/badge, session status dot (green=running, gray=stopped, red=crashed), and a kebab menu (Restart session, Kill session, Copy session name, Open in system terminal).
- New terminal panel launch flow: user clicks "+ New agent" in the workspace toolbar → a shadcn `Dialog`/`Popover` lets them pick agent type (from a configurable list) → panel appears immediately in a "connecting" state, then live once the PTY attaches.

### 6.5 Drag-and-drop behaviors (using `dnd-kit`)
- Drag a file from the OS file system directly onto a terminal panel → backend copies it into the workspace `cwd` and the panel briefly shows a toast with the resulting path (so the user can reference it when talking to the agent).
- Drag a Note or Skill card onto a terminal panel → inserts a reference path/snippet at the terminal's cursor (writes the relevant text into the PTY input).
- Drag panels to reorder/re-tile within the workspace canvas.
- Drag workspace tabs to reorder in the top bar.

### 6.6 Command palette
A global `cmd+k` / `ctrl+k` command palette (via `cmdk`, styled with shadcn) for: creating a workspace, launching an agent, jumping to any open panel, toggling theme, searching notes/skills by title.

---

## 7. Backend Design

### 7.1 Express app structure
```
/apps/backend/src
  index.ts                 -> server bootstrap, mounts REST + WS
  db.ts                    -> Prisma client singleton
  routes/
    workspaces.ts           -> CRUD for Workspace
    sessions.ts              -> create/list/kill AgentSession (spawns tmux)
    windows.ts               -> upsert AppWindow layout state
    notes.ts                 -> CRUD for Note (writes real files)
    skills.ts                -> CRUD for Skill (writes real files)
    github.ts                -> OAuth/PAT connect, repo list, clone
  ws/
    terminalGateway.ts        -> WS upgrade handler, node-pty <-> tmux bridge
  tmux/
    tmuxManager.ts             -> wraps all tmux shell-outs (new-session, has-session, kill-session, list-sessions, resize-window)
  agents/
    agentRegistry.ts            -> maps agentType -> launch command template
```

### 7.2 tmux manager responsibilities
All tmux interaction goes through one module so it's swappable/testable:
- `sessionExists(name)` → `tmux has-session -t <name>` (exit code check)
- `createOrAttachDetached(name, cwd, command)` → `tmux new-session -A -d -s <name> -c <cwd> "<command>"`
- `killSession(name)` → `tmux kill-session -t <name>`
- `listSessions()` → parses `tmux list-sessions -F "#{session_name}"` for reconciliation on boot
- `resizeWindow(name, cols, rows)` → `tmux resize-window -t <name> -x <cols> -y <rows>`

### 7.3 Reconciliation on boot
On backend startup: query all `AgentSession` rows with `status = "running"`, cross-check against `tmuxManager.listSessions()`. Any DB row whose tmux session no longer exists gets `status = "crashed"`. This keeps the UI honest after host reboots or manual tmux kills outside the app.

---

## 8. Task List (build in this exact order — each task is a complete, working milestone)

> Rule for every task below: when it's done, `npm run dev` (or equivalent) should start a working app that a human can actually click through, with no dead buttons or stubbed screens for the features already delivered.

### Task 1 — Monorepo scaffold, health check
- Set up the monorepo (`/apps/backend`, `/apps/frontend`, `/packages/shared`), TypeScript configs, ESLint/Prettier.
- Backend: Express app with a single `GET /api/health` returning `{ status: "ok" }`.
- Frontend: Vite + React + Tailwind + shadcn initialized, a single page that fetches `/api/health` and displays the status.
- **Done when:** running both dev servers shows a working page confirming backend connectivity.

### Task 2 — Prisma schema + Workspace CRUD (no agents yet)
- Add Prisma with SQLite, implement the `Workspace` model only (skip other models for now, or stub with just the fields Workspace needs — add the rest as their tasks arrive).
- REST endpoints: `POST /api/workspaces`, `GET /api/workspaces`, `GET /api/workspaces/:id`, `PATCH /api/workspaces/:id`, `DELETE /api/workspaces/:id`.
- On workspace creation, prompt the user for/generate a filesystem path (`cwd`) and create the directory plus a `.agent-workspace/` subfolder (with `notes/` and `skills/` subfolders, even though those features come later — this avoids a migration task).
- Frontend: a workspace list/landing screen (shadcn `Card` grid) — create, rename, delete workspaces. No window shell yet, just a functional CRUD screen.
- **Done when:** a user can create, rename, and delete workspaces from the browser, and see the corresponding directories appear on disk.

### Task 3 — Top-level window shell (workspace-as-window)
- Build the desktop shell described in §6.2: top bar with workspace tabs, each workspace opens into its own top-level window with title bar (minimize/close), draggable/reorderable tabs.
- At this stage, an open workspace window can just show a placeholder canvas ("no panels yet").
- Persist top-level workspace window state (open/closed, order, position) — extend the `AppWindow`-style persistence pattern early since it's central to the product; it's fine to introduce a minimal version of the `AppWindow` table now if it simplifies things, per the schema in §4.
- **Done when:** a user can open multiple workspaces at once, each as its own window, drag/reorder the workspace tabs, and reload the page to see the same workspace windows still open in the same arrangement.

### Task 4 — tmux session management (backend only, verifiable via CLI)
- Implement `tmuxManager.ts` per §7.2.
- Add `AgentSession` model, implement `POST /api/workspaces/:id/sessions` (creates a tmux session via `createOrAttachDetached`), `GET /api/workspaces/:id/sessions`, `DELETE /api/sessions/:id` (kills it).
- Add a minimal `agentRegistry.ts` with at least these entries: `claude-code` → `claude`, `cline` → whatever its CLI entrypoint is, `opencode` → its CLI entrypoint. Make this registry easy to extend (simple JSON/TS map, not hardcoded logic).
- No terminal UI yet — verify by creating a session through a simple REST call (or temporary debug button) and confirming with `tmux list-sessions` on the host that a real, persistent session exists.
- Implement the boot reconciliation from §7.3.
- **Done when:** creating a session via the API produces a real tmux session on the host that survives the Express process restarting, and the DB status field accurately reflects reality after reconciliation.

### Task 5 — Live terminal streaming (the core feature)
- Implement the WS gateway (`ws/terminalGateway.ts`) per §5: on connection to `/ws/terminal/:sessionId`, look up the session's tmux name, spawn `node-pty` running `tmux attach -t <name>`, pipe bytes both directions.
- Frontend: build the terminal panel component (xterm.js + fit addon), wire it into a real floating window using `react-rnd` inside the workspace canvas (bring the window manager from Task 3 fully to life here, since this is the first real panel type).
- Add a "+ New agent" control that calls the Task 4 API then opens a terminal panel connected via WS.
- **Done when:** a user can launch an agent, type into a real live terminal in the browser, close the browser tab entirely, reopen the app, and see the same terminal — same scrollback, same running process — reattach automatically. This is the milestone that proves the core "RDP-style" requirement works end to end.

### Task 6 — Multiple concurrent agents & sessions
- Support opening several terminal panels at once (different agent types, or multiple instances of the same type) within one workspace, each its own independent tmux session/WS connection.
- Add UI for distinguishing/labelling instances (e.g. "Claude Code #1", "Claude Code #2").
- Handle session teardown from the UI (kebab menu → Kill session) cleanly on both tmux and DB sides.
- **Done when:** a user can run e.g. two Claude Code instances and one Cline instance simultaneously in the same workspace, each independently interactive, without interference.

### Task 7 — Full window-layout persistence
- Implement the `AppWindow` table fully (if not already done ahead of schedule in Task 3) covering all panel kinds, and wire drag/resize/minimize/maximize/close events on every panel type to debounced `PATCH /api/windows/:id` calls.
- On workspace load, restore every panel exactly (position, size, z-order, minimized/maximized state).
- **Done when:** arranging multiple terminal windows in a specific layout, then reconnecting from a different browser/device, reproduces that exact layout — not just the running processes, but the full visual arrangement.

### Task 8 — Notes & Skills (shared markdown context for agents)
- Implement `Note` and `Skill` models/routes, backed by real files under `.agent-workspace/notes/` and `.agent-workspace/skills/` inside the workspace `cwd` (per §4).
- Frontend: Notes panel and Skills panel — a simple markdown editor with live preview (a lightweight library such as `@uiw/react-md-editor` is acceptable), file list sidebar within the panel, create/rename/delete.
- Because these are real files inside the same `cwd` the agents run in, no special agent-side integration is required — document in the UI (e.g. an info tooltip) that agents can be told to read `.agent-workspace/skills/*.md` for shared context.
- **Done when:** a user can create/edit notes and skill docs from the UI, see them persist as real files on disk, and confirm (e.g. via a running agent terminal doing `cat .agent-workspace/skills/foo.md`) that agents in that workspace's terminals can read them.

### Task 9 — GitHub integration
- Implement `GithubRepoLink`, connect flow (start with a simple Personal Access Token input stored server-side/encrypted at rest — OAuth device flow can be a later enhancement, not a blocker), repo picker, clone-into-`cwd` action, and a status panel (current branch, ahead/behind, dirty file count) refreshed via simple `git` shell-outs on the backend.
- GitHub panel is a new panel `kind`, following the same window-manager pattern as terminals/notes.
- **Done when:** a user can connect a GitHub account/token, clone a repo into a workspace's `cwd`, and see live branch/status info in a panel — with agent terminals in that workspace naturally operating on the cloned repo since it shares the same `cwd`.

### Task 10 — Drag-and-drop richness
- Implement the OS-file-drop-onto-terminal behavior, the note/skill-drag-onto-terminal behavior, and panel/tab reordering described in §6.5.
- **Done when:** all drag-and-drop interactions described in §6.5 work reliably with clear visual affordances (drop zones highlight, invalid drops are rejected gracefully).

### Task 11 — Auth & remote-access hardening
- Add an auth layer appropriate for local-first deployment: a single admin password/token set on first run (stored hashed), session cookie or JWT for the REST API and the WS upgrade handshake alike (validate on WS connection, not just REST).
- Document (in a `README`/`SECURITY.md`) that exposing this app to the internet requires a reverse proxy or tunnel (e.g. Tailscale, Cloudflare Tunnel) in front of it, and that this app assumes a trusted network otherwise.
- **Done when:** the app cannot be used, including opening terminal WS connections, without a valid authenticated session.

### Task 12 — Polish pass
- Command palette (§6.6), keyboard shortcuts (window tiling, close panel, new terminal), toast notifications for background actions (session killed, git pull finished, file dropped), empty-state screens (empty workspace, no notes yet, etc.), light/dark theme toggle, responsive behavior down to a reasonable minimum viewport, visible keyboard focus states throughout.
- **Done when:** the app feels like a polished product rather than a working prototype — no dead ends, no unstyled default browser states, consistent shadcn styling everywhere.

---

## 9. Non-goals / explicit deferrals (call these out if asked, don't build speculatively)

- Multi-user real-time collaboration cursors (multiple people editing the *same* note simultaneously) — out of scope; last-write-wins on notes/skills is acceptable.
- Cloud/hosted deployment, containerization, or multi-tenant hosting — this is a local-first, single-host tool.
- Full OAuth app registration for GitHub — PAT-based auth is the baseline; OAuth can be added later without changing the data model.
- Windows-native support (tmux is Linux/macOS-first) — target Linux/macOS hosts; WSL2 may work but isn't a design goal.