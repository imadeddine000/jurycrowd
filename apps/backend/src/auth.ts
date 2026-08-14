import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { Request, Response, NextFunction } from 'express';

const CONFIG_DIR = path.join(os.homedir(), '.jurycrowd');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function readConfig(): Promise<Record<string, string>> {
  try { return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8')); } catch { return {}; }
}

async function writeConfig(config: Record<string, string>): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function isSetupRequired(): Promise<boolean> {
  const config = await readConfig();
  return !config.adminPasswordHash;
}

export async function setupPassword(password: string): Promise<string> {
  const config = await readConfig();
  if (config.adminPasswordHash) throw new Error('Password already set');
  const hash = hashPassword(password);
  config.adminPasswordHash = hash;
  await writeConfig(config);
  return hash; // token = hash
}

export async function login(password: string): Promise<string | null> {
  const config = await readConfig();
  if (!config.adminPasswordHash) return null;
  const hash = hashPassword(password);
  if (hash !== config.adminPasswordHash) return null;
  return hash; // token = hash
}

export async function verifyToken(token: string): Promise<boolean> {
  const config = await readConfig();
  return token === config.adminPasswordHash;
}

// Express middleware — protects API routes
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for auth routes and health check
  const path = req.path;
  if (path.startsWith('/api/auth') || path === '/api/health') {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.slice(7);
  verifyToken(token).then((valid) => {
    if (!valid) { res.status(401).json({ error: 'Invalid token' }); return; }
    next();
  }).catch(() => { res.status(500).json({ error: 'Auth check failed' }); });
}
