import { Router } from 'express';
import { prisma } from '../db.js';
import type {
  AppWindowDTO,
  CreateAppWindowBody,
  UpdateAppWindowBody,
} from '@jurycrowd/shared';

export const windowsRouter = Router();

function toDTO(w: {
  id: string;
  workspaceId: string;
  kind: string;
  refId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  title: string;
}): AppWindowDTO {
  return {
    id: w.id,
    workspaceId: w.workspaceId,
    kind: w.kind,
    refId: w.refId,
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height,
    zIndex: w.zIndex,
    minimized: w.minimized,
    maximized: w.maximized,
    title: w.title,
  };
}

// GET /api/windows?kind=workspace — list all windows (optionally filtered by kind)
windowsRouter.get('/', async (req, res) => {
  try {
    const kind = req.query.kind as string | undefined;
    const windows = await prisma.appWindow.findMany({
      where: kind ? { kind } : undefined,
      orderBy: { zIndex: 'asc' },
    });
    res.json(windows.map(toDTO));
  } catch (err) {
    console.error('[windows] list error:', err);
    res.status(500).json({ error: 'Failed to list windows' });
  }
});

// GET /api/workspaces/:id/windows — list windows for a specific workspace
windowsRouter.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const windows = await prisma.appWindow.findMany({
      where: { workspaceId: req.params.workspaceId },
      orderBy: { zIndex: 'asc' },
    });
    res.json(windows.map(toDTO));
  } catch (err) {
    console.error('[windows] list-by-workspace error:', err);
    res.status(500).json({ error: 'Failed to list windows' });
  }
});

// POST /api/windows — create a window
windowsRouter.post('/', async (req, res) => {
  try {
    const body = req.body as CreateAppWindowBody;

    if (!body?.workspaceId || !body?.kind || !body?.title) {
      return res.status(400).json({ error: 'workspaceId, kind, and title are required' });
    }

    const window = await prisma.appWindow.create({
      data: {
        workspaceId: body.workspaceId,
        kind: body.kind,
        refId: body.refId ?? null,
        x: body.x ?? 50,
        y: body.y ?? 50,
        width: body.width ?? 800,
        height: body.height ?? 600,
        zIndex: body.zIndex ?? 1,
        minimized: body.minimized ?? false,
        maximized: body.maximized ?? false,
        title: body.title,
      },
    });

    res.status(201).json(toDTO(window));
  } catch (err) {
    console.error('[windows] create error:', err);
    res.status(500).json({ error: 'Failed to create window' });
  }
});

// PATCH /api/windows/:id — update a window
windowsRouter.patch('/:id', async (req, res) => {
  try {
    const body = req.body as UpdateAppWindowBody;
    const existing = await prisma.appWindow.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Window not found' });
    }

    const data: Record<string, unknown> = {};
    if (body.x !== undefined) data.x = body.x;
    if (body.y !== undefined) data.y = body.y;
    if (body.width !== undefined) data.width = body.width;
    if (body.height !== undefined) data.height = body.height;
    if (body.zIndex !== undefined) data.zIndex = body.zIndex;
    if (body.minimized !== undefined) data.minimized = body.minimized;
    if (body.maximized !== undefined) data.maximized = body.maximized;
    if (body.title !== undefined) data.title = body.title;

    const window = await prisma.appWindow.update({
      where: { id: req.params.id },
      data,
    });

    res.json(toDTO(window));
  } catch (err) {
    console.error('[windows] update error:', err);
    res.status(500).json({ error: 'Failed to update window' });
  }
});

// DELETE /api/windows/:id — delete a window
windowsRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.appWindow.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Window not found' });
    }

    await prisma.appWindow.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (err) {
    console.error('[windows] delete error:', err);
    res.status(500).json({ error: 'Failed to delete window' });
  }
});
