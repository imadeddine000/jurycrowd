import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../db.js';

/**
 * Creates a router for managing markdown files inside a workspace's
 * `.agent-workspace/<subdir>/` directory (e.g. notes, skills).
 * Files are real files on disk — agents in the workspace can read them directly.
 */
export function createFilesRouter(subdir: string): Router {
  const router = Router();

  // Resolve the files directory for a workspace
  async function getDir(workspaceId: string): Promise<string> {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw new Error('Workspace not found');
    const dir = path.join(ws.cwd, '.agent-workspace', subdir);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  // GET /:workspaceId — list files
  router.get('/:workspaceId', async (req, res) => {
    try {
      const dir = await getDir(req.params.workspaceId);
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile() && e.name.endsWith('.md'))
        .map((e) => e.name.replace(/\.md$/, ''));
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /:workspaceId/:name — get file content
  router.get('/:workspaceId/:name', async (req, res) => {
    try {
      const dir = await getDir(req.params.workspaceId);
      const filePath = path.join(dir, `${req.params.name}.md`);
      const content = await fs.readFile(filePath, 'utf8');
      res.json({ name: req.params.name, content });
    } catch {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // POST /:workspaceId — create file
  router.post('/:workspaceId', async (req, res) => {
    try {
      const { name, content } = req.body as { name: string; content?: string };
      if (!name || !/^[\w\s.-]+$/.test(name)) {
        return res.status(400).json({ error: 'Invalid file name' });
      }
      const dir = await getDir(req.params.workspaceId);
      const filePath = path.join(dir, `${name}.md`);
      await fs.writeFile(filePath, content ?? '', 'utf8');
      res.status(201).json({ name });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // PATCH /:workspaceId/:name — update file (content and/or rename)
  router.patch('/:workspaceId/:name', async (req, res) => {
    try {
      const { content, newName } = req.body as { content?: string; newName?: string };
      const dir = await getDir(req.params.workspaceId);
      const oldPath = path.join(dir, `${req.params.name}.md`);

      if (newName && newName !== req.params.name) {
        if (!/^[\w\s.-]+$/.test(newName)) {
          return res.status(400).json({ error: 'Invalid file name' });
        }
        const newPath = path.join(dir, `${newName}.md`);
        await fs.rename(oldPath, newPath);
        if (content !== undefined) {
          await fs.writeFile(newPath, content, 'utf8');
        }
        return res.json({ name: newName });
      }

      if (content !== undefined) {
        await fs.writeFile(oldPath, content, 'utf8');
      }
      res.json({ name: req.params.name });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // DELETE /:workspaceId/:name — delete file
  router.delete('/:workspaceId/:name', async (req, res) => {
    try {
      const dir = await getDir(req.params.workspaceId);
      const filePath = path.join(dir, `${req.params.name}.md`);
      await fs.unlink(filePath);
      res.status(204).send();
    } catch {
      res.status(404).json({ error: 'File not found' });
    }
  });

  return router;
}
