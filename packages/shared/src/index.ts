// Shared TypeScript types — WS message contracts, DTOs
// Extended in later tasks as the protocol evolves.

export interface HealthResponse {
  status: 'ok' | 'error';
}

// --- Workspace DTOs ---

export interface WorkspaceDTO {
  id: string;
  title: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceBody {
  title: string;
  cwd?: string;
}

export interface UpdateWorkspaceBody {
  title?: string;
  cwd?: string;
}

// --- AppWindow DTOs ---

export interface AppWindowDTO {
  id: string;
  workspaceId: string;
  kind: string; // "workspace" | "terminal" | "notes" | "skill" | "github" | "browser"
  refId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  title: string;
}

export interface CreateAppWindowBody {
  workspaceId: string;
  kind: string;
  refId?: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  minimized?: boolean;
  maximized?: boolean;
  title: string;
}

export interface UpdateAppWindowBody {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  minimized?: boolean;
  maximized?: boolean;
  title?: string;
}

// --- AgentSession DTOs ---

export interface AgentSessionDTO {
  id: string;
  workspaceId: string;
  agentType: string;
  tmuxSession: string;
  status: string; // "running" | "crashed" | "killed"
  launchCommand: string;
  createdAt: string;
  lastAttached: string;
}

export interface CreateSessionBody {
  agentType: string;
}

// --- Agent Registry DTOs ---

export interface AgentRegistryEntry {
  type: string;
  label: string;
  command: string;
  available: boolean;
}
