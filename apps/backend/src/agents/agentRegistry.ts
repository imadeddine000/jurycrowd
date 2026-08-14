import { execSync } from 'node:child_process';
import type { AgentRegistryEntry } from '@jurycrowd/shared';

/**
 * Agent Registry — extensible map of agent types to their CLI commands.
 * To add a new agent, just add an entry to AGENTS below.
 */

interface AgentConfig {
  type: string;
  label: string;
  command: string;
}

// --- Registry: add new agents here ---
const AGENTS: AgentConfig[] = [
  { type: 'cline', label: 'Cline', command: 'cline' },
  { type: 'claude-code', label: 'Claude Code', command: 'claude' },
  { type: 'opencode', label: 'OpenCode', command: 'opencode' },
  { type: 'terminal', label: 'Terminal', command: 'bash' },
];

/** Check if a CLI command is available in PATH. */
function isAvailable(command: string): boolean {
  try {
    execSync(`which ${command} 2>/dev/null`, { encoding: 'utf-8', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/** Get all registered agents with their availability status. */
export function listAgents(): AgentRegistryEntry[] {
  return AGENTS.map((a) => ({
    ...a,
    available: isAvailable(a.command),
  }));
}

/** Get a specific agent config by type. Returns null if not found. */
export function getAgent(type: string): AgentConfig | null {
  return AGENTS.find((a) => a.type === type) ?? null;
}

/** Check if an agent type is registered and its CLI is available. */
export function isAgentAvailable(type: string): boolean {
  const agent = getAgent(type);
  if (!agent) return false;
  return isAvailable(agent.command);
}
