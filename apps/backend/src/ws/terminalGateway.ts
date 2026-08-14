import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'node-pty';
import type { Server } from 'node:http';
import { prisma } from '../db.js';
import * as tmux from '../tmux/tmuxManager.js';

/**
 * Terminal WS Gateway (§5).
 * On connection to /ws/terminal/:sessionId:
 *   1. Look up the AgentSession in DB to get the tmux session name
 *   2. Spawn node-pty running `tmux attach -t <name>`
 *   3. Pipe bytes both directions
 *   4. Handle resize control messages
 */
export function setupTerminalGateway(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);

    // Match /ws/terminal/:sessionId
    const match = url.pathname.match(/^\/ws\/terminal\/(.+)$/);
    if (!match) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    const sessionId = match[1];

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, sessionId);
    });
  });

  wss.on('connection', async (ws: WebSocket, sessionId: string) => {
    let ptyProcess: ReturnType<typeof spawn> | null = null;

    try {
      // Look up the session in DB
      const session = await prisma.agentSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        sendControl(ws, { type: 'session_status', status: 'error', message: 'Session not found' });
        ws.close();
        return;
      }

      // Check if the tmux session exists
      if (!tmux.sessionExists(session.tmuxSession)) {
        sendControl(ws, { type: 'session_status', status: 'error', message: 'tmux session no longer exists' });
        ws.close();
        return;
      }

      // Spawn node-pty running `tmux attach -t <name>`
      ptyProcess = spawn('tmux', ['attach-session', '-t', session.tmuxSession], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: process.env as Record<string, string>,
      });

      // PTY output → WS (binary frames)
      ptyProcess.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(Buffer.from(data, 'utf8'));
        }
      });

      // PTY exit → WS control message
      ptyProcess.onExit(({ exitCode }) => {
        sendControl(ws, {
          type: 'session_status',
          status: 'exited',
          message: `Process exited with code ${exitCode}`,
        });
        ws.close();
      });

      // Update lastAttached
      await prisma.agentSession.update({
        where: { id: sessionId },
        data: { lastAttached: new Date() },
      });

      // Send running status
      sendControl(ws, { type: 'session_status', status: 'running' });
    } catch (err) {
      console.error('[ws/terminal] connection error:', err);
      sendControl(ws, { type: 'session_status', status: 'error', message: 'Failed to attach' });
      ws.close();
    }

    // WS message → PTY or control message
    ws.on('message', (data, isBinary) => {
      if (!ptyProcess) return;

      if (isBinary) {
        // Raw input → PTY
        ptyProcess.write(data.toString('utf8'));
      } else {
        // Control message (JSON)
        try {
          const msg = JSON.parse(data.toString('utf8'));
          if (msg.type === 'resize' && typeof msg.cols === 'number' && typeof msg.rows === 'number') {
            ptyProcess.resize(msg.cols, msg.rows);
            // Also resize the tmux window so all attached clients see the same size
            // Look up session for tmux session name
            prisma.agentSession.findUnique({ where: { id: sessionId } }).then((s) => {
              if (s) tmux.resizeWindow(s.tmuxSession, msg.cols, msg.rows);
            }).catch(() => {});
          }
        } catch {
          // Ignore invalid JSON
        }
      }
    });

    // Clean up on disconnect
    ws.on('close', () => {
      if (ptyProcess) {
        try { ptyProcess.kill(); } catch { /* already dead */ }
      }
    });

    ws.on('error', () => {
      if (ptyProcess) {
        try { ptyProcess.kill(); } catch { /* already dead */ }
      }
    });
  });

  return wss;
}

function sendControl(ws: WebSocket, msg: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
