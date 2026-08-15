import { execSync } from 'node:child_process';

/**
 * tmux Manager — single module for all tmux interaction (§7.2).
 * Swappable/testable: all tmux commands go through here.
 */

function run(cmd: string): { ok: boolean; stdout: string } {
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', timeout: 5000 });
    return { ok: true, stdout };
  } catch {
    return { ok: false, stdout: '' };
  }
}

/** Check if a tmux session exists. */
export function sessionExists(name: string): boolean {
  return run(`tmux has-session -t ${JSON.stringify(name)} 2>/dev/null`).ok;
}

/**
 * Create a new detached tmux session (or attach to existing if it already exists).
 * Runs the given command in the given cwd, with optional environment variables.
 */
export function createOrAttachDetached(name: string, cwd: string, command: string, env?: Record<string, string>): boolean {
  // If env vars provided, prefix the command with exports
  let fullCommand = command;
  if (env && Object.keys(env).length > 0) {
    const exports = Object.entries(env).map(([k, v]) => `export ${k}=${JSON.stringify(v)}`).join(' ');
    fullCommand = `${exports}; ${command}`;
  }
  // -A: attach if exists, -d: detached, -s: session name, -c: working dir
  const result = run(
    `tmux new-session -A -d -s ${JSON.stringify(name)} -c ${JSON.stringify(cwd)} ${JSON.stringify(fullCommand)}`,
  );
  // Disable the tmux status bar (green line at bottom) for a clean terminal look
  run('tmux set -g status off 2>/dev/null');
  // Enable mouse support so scroll wheel scrolls through tmux history instead of sending arrow keys
  run('tmux set -g mouse on 2>/dev/null');
  return result.ok;
}

/** Kill a tmux session. */
export function killSession(name: string): boolean {
  return run(`tmux kill-session -t ${JSON.stringify(name)} 2>/dev/null`).ok;
}

/** List all tmux session names (for reconciliation on boot). */
export function listSessions(): string[] {
  const result = run('tmux list-sessions -F "#{session_name}" 2>/dev/null');
  if (!result.ok || !result.stdout.trim()) return [];
  return result.stdout.trim().split('\n');
}

/** Resize a tmux window (for when a client connects with a different terminal size). */
export function resizeWindow(name: string, cols: number, rows: number): boolean {
  return run(`tmux resize-window -t ${JSON.stringify(name)} -x ${cols} -y ${rows} 2>/dev/null`).ok;
}

/** Send text (keystrokes) to a tmux session — used for drag-and-drop file paths. */
export function sendKeys(name: string, text: string): boolean {
  return run(`tmux send-keys -t ${JSON.stringify(name)} ${JSON.stringify(text)} Enter`).ok;
}
