import express from 'express';
import cors from 'cors';
import type { HealthResponse } from '@jurycrowd/shared';
import { workspacesRouter } from './routes/workspaces.js';
import { windowsRouter } from './routes/windows.js';
import { sessionsRouter } from './routes/sessions.js';
import { createFilesRouter } from './routes/files.js';
import { reconcileSessions } from './reconcile.js';
import { setupTerminalGateway } from './ws/terminalGateway.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const body: HealthResponse = { status: 'ok' };
  res.json(body);
});

// Workspace CRUD
app.use('/api/workspaces', workspacesRouter);

// AppWindow CRUD (used for top-level workspace windows and panel windows)
app.use('/api/windows', windowsRouter);

// Agent sessions + agent registry
app.use('/api', sessionsRouter);

// Notes & Skills (real files on disk inside workspace cwd)
app.use('/api/notes', createFilesRouter('notes'));
app.use('/api/skills', createFilesRouter('skills'));

const server = app.listen(PORT, async () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);

  // Set up WebSocket terminal gateway (§5)
  setupTerminalGateway(server);
  console.log('[backend] WS terminal gateway ready');

  // Reconcile sessions on boot (§7.3)
  try {
    await reconcileSessions();
  } catch (err) {
    console.error('[backend] reconciliation failed:', err);
  }
});
