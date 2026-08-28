import esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cliDir, '..', '..');

// 1. Ensure the frontend is built (the CLI serves its static output).
const frontendDist = path.join(repoRoot, 'apps/frontend/dist');
if (!fs.existsSync(path.join(frontendDist, 'index.html'))) {
  console.log('▶ building frontend…');
  execSync('pnpm --filter=frontend build', { cwd: repoRoot, stdio: 'inherit' });
}

// 2. Bundle CLI + backend into a single ESM file. Native/Prisma/express deps
//    stay external (resolved from the installed package's node_modules).
console.log('▶ bundling CLI…');
await esbuild.build({
  entryPoints: [path.join(cliDir, 'src/cli.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile: path.join(cliDir, 'dist/cli.js'),
  alias: { '@backend': path.join(repoRoot, 'apps/backend/src/index.ts') },
  external: [
    '@prisma/client',
    'commander',
    'cors',
    'dotenv',
    'express',
    'node-pty',
    'prisma',
    'ws',
  ],
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
});

// 3. Copy the built frontend into dist/public (served as static assets).
const publicDir = path.join(cliDir, 'dist/public');
fs.rmSync(publicDir, { recursive: true, force: true });
fs.cpSync(frontendDist, publicDir, { recursive: true });
console.log('▶ copied frontend → dist/public');

// 4. Keep the bundled Prisma schema in sync with the backend.
fs.mkdirSync(path.join(cliDir, 'prisma'), { recursive: true });
fs.cpSync(
  path.join(repoRoot, 'apps/backend/prisma/schema.prisma'),
  path.join(cliDir, 'prisma/schema.prisma'),
);

console.log('✓ CLI build complete');
