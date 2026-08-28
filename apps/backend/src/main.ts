import dotenv from 'dotenv';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { startServer } from './index.js';

// Load .env from the current working directory if present (does not override existing env).
if (fs.existsSync('.env')) dotenv.config({ quiet: true });

// Default the database to the user data dir if not otherwise configured.
if (!process.env.DATABASE_URL) {
  const dataDir = path.join(os.homedir(), '.jurycrowd');
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.DATABASE_URL = `file:${path.join(dataDir, 'jurycrowd.db')}`;
}

startServer().catch((err) => {
  console.error('[jurycrowd] failed to start:', err);
  process.exit(1);
});