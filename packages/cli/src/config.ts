import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { OptionValues } from 'commander';

export interface CliConfig {
  port: number;
  host: string;
  dataDir: string;
  dbPath: string;
  frontendDist: string;
  open: boolean;
}

/**
 * Resolve runtime configuration from CLI flags, environment variables, and
 * sensible defaults. Precedence (highest → lowest):
 *   flags → environment variables → computed defaults
 */
export function resolveConfig(opts: OptionValues): CliConfig {
  // Data directory: --data-dir → JURYCROWD_DATA_DIR → ~/.jurycrowd
  const dataDir = path.resolve(
    (opts.dataDir as string | undefined) ??
      process.env.JURYCROWD_DATA_DIR ??
      path.join(os.homedir(), '.jurycrowd'),
  );
  fs.mkdirSync(dataDir, { recursive: true });

  // Database file: --db → DATABASE_URL (file:) → <data-dir>/jurycrowd.db
  let dbPath: string;
  if (opts.db) {
    dbPath = path.resolve(opts.db as string);
  } else if (process.env.DATABASE_URL?.startsWith('file:')) {
    dbPath = path.resolve(process.env.DATABASE_URL.slice(5));
  } else {
    dbPath = path.join(dataDir, 'jurycrowd.db');
  }

  // Port: --port → PORT → 3001
  const port = (opts.port as number | undefined) ?? (Number(process.env.PORT) || 3001);
  // Host: --host → HOST → 127.0.0.1
  const host = (opts.host as string | undefined) ?? process.env.HOST ?? '127.0.0.1';

  // Frontend assets: --frontend-dist → <cli bundle dir>/public
  const frontendDist = path.resolve(
    (opts.frontendDist as string | undefined) ?? path.join(import.meta.dirname, 'public'),
  );

  // --no-open sets `open` to false; default is true.
  const open = opts.open !== false;

  return { port, host, dataDir, dbPath, frontendDist, open };
}
