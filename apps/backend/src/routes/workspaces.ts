import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { prisma } from '../db.js';
import type { CreateWorkspaceBody, UpdateWorkspaceBody, WorkspaceDTO } from '@jurycrowd/shared';

export const workspacesRouter = Router();

function toDTO(ws: {
  id: string;
  title: string;
  cwd: string;
  createdAt: Date;
  updatedAt: Date;
}): WorkspaceDTO {
  return {
    id: ws.id,
    title: ws.title,
    cwd: ws.cwd,
    createdAt: ws.createdAt.toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
  };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'workspace';
}

function defaultCwd(title: string): string {
  return path.join(os.homedir(), 'agent-workspaces', slugify(title));
}

/** Ensure the workspace directory structure exists on disk. */
async function ensureWorkspaceDirs(cwd: string): Promise<void> {
  const notesDir = path.join(cwd, '.agent-workspace', 'notes');
  const skillsDir = path.join(cwd, '.agent-workspace', 'skills');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.mkdir(skillsDir, { recursive: true });
}

// POST /api/workspaces — create workspace + directory structure
workspacesRouter.post('/', async (req, res) => {
  try {
    const body = req.body as CreateWorkspaceBody;

    if (!body?.title?.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const title = body.title.trim();
    let cwd = body.cwd?.trim() || defaultCwd(title);

    // Resolve to absolute path
    if (!path.isAbsolute(cwd)) {
      cwd = path.resolve(cwd);
    }

    // Create the directory structure on disk
    await ensureWorkspaceDirs(cwd);

    const workspace = await prisma.workspace.create({
      data: { title, cwd },
    });

    res.status(201).json(toDTO(workspace));
  } catch (err) {
    console.error('[workspaces] create error:', err);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// GET /api/workspaces — list all workspaces
workspacesRouter.get('/', async (_req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(workspaces.map(toDTO));
  } catch (err) {
    console.error('[workspaces] list error:', err);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
});

// GET /api/workspaces/:id — get a single workspace
workspacesRouter.get('/:id', async (req, res) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json(toDTO(workspace));
  } catch (err) {
    console.error('[workspaces] get error:', err);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
});

// PATCH /api/workspaces/:id — update workspace (rename and/or change cwd)
workspacesRouter.patch('/:id', async (req, res) => {
  try {
    const body = req.body as UpdateWorkspaceBody;
    const existing = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const data: { title?: string; cwd?: string } = {};
    if (body.title?.trim()) data.title = body.title.trim();
    if (body.cwd?.trim()) {
      let cwd = body.cwd.trim();
      if (!path.isAbsolute(cwd)) cwd = path.resolve(cwd);
      data.cwd = cwd;
      // Ensure new directory structure exists
      await ensureWorkspaceDirs(cwd);
    }

    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data,
    });

    res.json(toDTO(workspace));
  } catch (err) {
    console.error('[workspaces] update error:', err);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// DELETE /api/workspaces/:id — delete workspace (DB record; disk dir left intact)
workspacesRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Cascade deletes handle related sessions, windows, notes, skills, github
    await prisma.workspace.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (err) {
    console.error('[workspaces] delete error:', err);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});
