import { Router } from 'express';
import { prisma } from '../db.js';
import * as tmux from '../tmux/tmuxManager.js';
import { getAgent, isAgentAvailable, listAgents } from '../agents/agentRegistry.js';
import type { AgentSessionDTO, AgentRegistryEntry } from '@jurycrowd/shared';

export const sessionsRouter = Router();

function toDTO(s: {
  id: string;
  workspaceId: string;
  agentType: string;
  tmuxSession: string;
  status: string;
  launchCommand: string;
  createdAt: Date;
  lastAttached: Date;
}): AgentSessionDTO {
  return {
    id: s.id,
    workspaceId: s.workspaceId,
    agentType: s.agentType,
    tmuxSession: s.tmuxSession,
    status: s.status,
    launchCommand: s.launchCommand,
    createdAt: s.createdAt.toISOString(),
    lastAttached: s.lastAttached.toISOString(),
  };
}

/** Generate a deterministic tmux session name. */
function generateTmuxSessionName(workspaceId: string, agentType: string, count: number): string {
  // Use first 8 chars of workspaceId for readability, sanitize for tmux
  const shortId = workspaceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  return `ws_${shortId}_${agentType}_${count + 1}`;
}

// GET /api/workspaces/:workspaceId/sessions — list sessions for a workspace
sessionsRouter.get('/workspaces/:workspaceId/sessions', async (req, res) => {
  try {
    const sessions = await prisma.agentSession.findMany({
      where: { workspaceId: req.params.workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(sessions.map(toDTO));
  } catch (err) {
    console.error('[sessions] list error:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// POST /api/workspaces/:workspaceId/sessions — create a new agent session
sessionsRouter.post('/workspaces/:workspaceId/sessions', async (req, res) => {
  try {
    const { agentType } = req.body as { agentType: string };

    if (!agentType) {
      return res.status(400).json({ error: 'agentType is required' });
    }

    const agent = getAgent(agentType);
    if (!agent) {
      return res.status(400).json({ error: `Unknown agent type: ${agentType}` });
    }
    if (!isAgentAvailable(agentType)) {
      return res.status(400).json({
        error: `Agent CLI "${agent.command}" is not available in PATH. Install it or add it to PATH.`,
      });
    }

    // Get the workspace (for cwd)
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.workspaceId },
    });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Count existing sessions of this type for instance numbering
    const existingCount = await prisma.agentSession.count({
      where: { workspaceId: workspace.id, agentType },
    });

    const tmuxSessionName = generateTmuxSessionName(workspace.id, agentType, existingCount);

    // Create the tmux session (detached, running the agent CLI in the workspace cwd)
    const created = tmux.createOrAttachDetached(tmuxSessionName, workspace.cwd, agent.command);
    if (!created) {
      return res.status(500).json({ error: 'Failed to create tmux session' });
    }

    // Save to DB
    const session = await prisma.agentSession.create({
      data: {
        workspaceId: workspace.id,
        agentType,
        tmuxSession: tmuxSessionName,
        status: 'running',
        launchCommand: agent.command,
      },
    });

    res.status(201).json(toDTO(session));
  } catch (err) {
    console.error('[sessions] create error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// DELETE /api/sessions/:id — kill a session
sessionsRouter.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await prisma.agentSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Kill the tmux session
    tmux.killSession(session.tmuxSession);

    // Update DB status
    await prisma.agentSession.update({
      where: { id: session.id },
      data: { status: 'killed' },
    });

    res.status(204).send();
  } catch (err) {
    console.error('[sessions] delete error:', err);
    res.status(500).json({ error: 'Failed to kill session' });
  }
});

// GET /api/agents — list available agents (for the frontend "+ New agent" UI)
sessionsRouter.get('/agents', (_req, res) => {
  const agents: AgentRegistryEntry[] = listAgents();
  res.json(agents);
});
