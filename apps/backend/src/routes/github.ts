import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { prisma } from '../db.js';

const CONFIG_DIR = path.join(os.homedir(), '.jurycrowd');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function readConfig(): Promise<Record<string, string>> {
  try { return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8')); } catch { return {}; }
}

async function writeConfig(config: Record<string, string>): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export const githubRouter = Router();

// POST /api/github/connect — save PAT
githubRouter.post('/connect', async (req, res) => {
  try {
    const { token } = req.body as { token: string };
    if (!token) return res.status(400).json({ error: 'Token required' });
    const config = await readConfig();
    config.githubToken = token;
    await writeConfig(config);
    res.json({ connected: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/github/disconnect — remove PAT
githubRouter.post('/disconnect', async (_req, res) => {
  try {
    const config = await readConfig();
    delete config.githubToken;
    await writeConfig(config);
    res.json({ connected: false });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /api/github/connected — check if PAT is set
githubRouter.get('/connected', async (_req, res) => {
  const config = await readConfig();
  res.json({ connected: !!config.githubToken });
});

// GET /api/github/repos — list user's repos
githubRouter.get('/repos', async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.githubToken) return res.status(401).json({ error: 'Not connected' });
    const page = (req.query.page as string) || '1';
    const resp = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=30&page=${page}`, {
      headers: { Authorization: `Bearer ${config.githubToken}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!resp.ok) return res.status(resp.status).json({ error: 'GitHub API error' });
    const repos = await resp.json() as Array<{ name: string; full_name: string; clone_url: string; private: boolean; default_branch: string }>;
    res.json(repos.map((r) => ({ name: r.name, full_name: r.full_name, clone_url: r.clone_url, private: r.private, default_branch: r.default_branch })));
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/github/clone — clone repo into workspace cwd
githubRouter.post('/clone', async (req, res) => {
  try {
    const { workspaceId, cloneUrl } = req.body as { workspaceId: string; cloneUrl: string };
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    const config = await readConfig();
    // Clone with token embedded in URL for private repos
    const authedUrl = config.githubToken
      ? cloneUrl.replace('https://', `https://${config.githubToken}@`)
      : cloneUrl;
    execSync(`git clone ${authedUrl} .`, { cwd: ws.cwd, timeout: 60000 });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /api/github/status/:workspaceId — git status
githubRouter.get('/status/:workspaceId', async (req, res) => {
  try {
    const ws = await prisma.workspace.findUnique({ where: { id: req.params.workspaceId } });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    const cwd = ws.cwd;
    const run = (cmd: string) => { try { return execSync(cmd, { cwd, encoding: 'utf8' }).trim(); } catch { return ''; } };
    const branch = run('git rev-parse --abbrev-ref HEAD');
    if (!branch) return res.json({ initialized: false });
    const ahead = parseInt(run('git rev-list --count @{upstream}..HEAD') || '0', 10);
    const behind = parseInt(run('git rev-list --count HEAD..@{upstream}') || '0', 10);
    const dirtyStr = run('git status --porcelain');
    const dirty = dirtyStr ? dirtyStr.split('\n').filter(Boolean).length : 0;
    res.json({ initialized: true, branch, ahead, behind, dirty });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});
