import dotenv from 'dotenv';
import path from 'node:path';
import { Command, type OptionValues } from 'commander';
import fs from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { startServer } from '@backend';
import { resolveConfig } from './config.js';

// Load .env from the current working directory if present (does not override existing env).
if (fs.existsSync('.env')) dotenv.config({ quiet: true });

const program = new Command();

program
  .name('jurycrowd')
  .description('Open-source multi-agent workspace manager — run AI coding agents side-by-side.')
  .version(readVersion());

program
  .command('start', { isDefault: true })
  .description('Start the Jurycrowd web UI on your local machine.')
  .option('-p, --port <port>', 'port to listen on', (v: string) => Number(v))
  .option('-H, --host <host>', 'host/interface to bind')
  .option('-d, --data-dir <path>', 'directory for the database and config')
  .option('--db <path>', 'explicit database file path')
  .option('--frontend-dist <path>', 'path to built frontend assets')
  .option('--no-open', 'do not open the browser automatically')
  .action(async (opts: OptionValues) => {
    const config = resolveConfig(opts);
    // Prisma reads DATABASE_URL at client init (lazy via Proxy in db.ts).
    process.env.DATABASE_URL = `file:${config.dbPath}`;

    // Create/sync the database schema (creates tables on first run).
    ensureDatabase();

    if (!hasTmux()) {
      console.warn('⚠️  tmux was not found on your PATH — agents will not be able to start.');
      console.warn('   Install tmux: https://github.com/tmux/tmux/wiki/Installing\n');
    }

    if (!fs.existsSync(config.frontendDist)) {
      console.warn(`⚠️  frontend assets not found at ${config.frontendDist}`);
      console.warn('   the API will run but the web UI will not load.\n');
    }

    console.log(`[jurycrowd] data dir : ${config.dataDir}`);
    console.log(`[jurycrowd] database : ${config.dbPath}`);

    await startServer({
      port: config.port,
      host: config.host,
      frontendDist: config.frontendDist,
    });

    const url = `http://${config.host}:${config.port}`;
    console.log(`\n  🟠 Jurycrowd is running at ${url}\n`);
    if (config.open) openBrowser(url);
  });

program.parse();

function ensureDatabase(): void {
  const schemaPath = path.join(import.meta.dirname, '..', 'prisma', 'schema.prisma');
  let prismaCli: string;
  try {
    prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');
  } catch {
    return; // prisma CLI not installed — skip (tables may already exist)
  }
  try {
    execFileSync(
      process.execPath,
      [prismaCli, 'db', 'push', '--skip-generate', '--accept-data-loss', `--schema=${schemaPath}`],
      { stdio: 'pipe', env: process.env },
    );
  } catch (err) {
    console.warn('⚠️  could not initialize database schema:', err instanceof Error ? err.message : err);
  }
}

function readVersion(): string {
  try {
    const pkgPath = new URL('../package.json', import.meta.url);
    return (JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version as string) ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function hasTmux(): boolean {
  try {
    execSync('tmux -V', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function openBrowser(url: string): void {
  try {
    if (process.platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      execSync(`start "" "${url}"`, { shell: 'cmd.exe', stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    }
  } catch {
    // ignore — the user can open the URL manually
  }
}

