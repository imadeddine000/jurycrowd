import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import type { Server } from 'node:http';
import type { HealthResponse } from '@jurycrowd/shared';
import { workspacesRouter } from './routes/workspaces.js';
import { windowsRouter } from './routes/windows.js';
import { sessionsRouter } from './routes/sessions.js';
import { createFilesRouter } from './routes/files.js';
import { githubRouter } from './routes/github.js';
import { apiKeysRouter } from './routes/apiKeysRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { authMiddleware } from './auth.js';
import { reconcileSessions } from './reconcile.js';
import { setupTerminalGateway } from './ws/terminalGateway.js';

export interface StartServerOptions {
  /** Port to listen on (default: PORT env or 3001). */
  port?: number;
  /** Host/interface to bind (default: HOST env or 127.0.0.1). */
  host?: string;
  /** Absolute path to a built frontend to serve as static assets (single-port mode). */
  frontendDist?: string;
}

/**
 * Build and start the Jurycrowd backend server.
 * Returns the underlying http.Server once it is listening.
 */
export async function startServer(opts: StartServerOptions = {}): Promise<Server> {
  const app = express();
  const port = opts.port ?? (Number(process.env.PORT) || 3001);
  const host = opts.host ?? process.env.HOST ?? '127.0.0.1';

  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.json(body);
  });

  // Auth routes (public — no middleware)
  app.use('/api/auth', authRouter);

  // Auth middleware — protects all other /api routes
  app.use('/api', authMiddleware);

  // Workspace CRUD
  app.use('/api/workspaces', workspacesRouter);

  // AppWindow CRUD (used for top-level workspace windows and panel windows)
  app.use('/api/windows', windowsRouter);

  // Agent sessions + agent registry
  app.use('/api', sessionsRouter);

  // Notes & Skills (real files on disk inside workspace cwd)
  app.use('/api/notes', createFilesRouter('notes'));
  app.use('/api/skills', createFilesRouter('skills'));

  // GitHub integration
  app.use('/api/github', githubRouter);

  // API Keys (app-level, not workspace-specific)
  app.use('/api/apikeys', apiKeysRouter);

  // Serve the built frontend (single-port mode) with an SPA fallback so that
  // client-side routes (e.g. /api-keys) load index.html while real /api and
  // /ws requests are handled by the routes above.
  if (opts.frontendDist && fs.existsSync(opts.frontendDist)) {
    app.use(express.static(opts.frontendDist));
    app.use((req, res, next) => {
      if (
        req.method !== 'GET' ||
        req.path.startsWith('/api/') ||
        req.path === '/api' ||
        req.path.startsWith('/ws')
      ) {
        return next();
      }
      res.sendFile(path.join(opts.frontendDist!, 'index.html'));
    });
  }

  return new Promise<Server>((resolve) => {
    const server = app.listen(port, host, async () => {
      console.log(`[jurycrowd] listening on http://${host}:${port}`);

      // Set up WebSocket terminal gateway (§5)
      setupTerminalGateway(server);
      console.log('[jurycrowd] WS terminal gateway ready');

      // Reconcile sessions on boot (§7.3)
      try {
        await reconcileSessions();
      } catch (err) {
        console.error('[jurycrowd] reconciliation failed:', err);
      }

      resolve(server);
    });
  });
}
