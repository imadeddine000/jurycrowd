import type {
  AgentRegistryEntry,
  AgentSessionDTO,
  AppWindowDTO,
  CreateAppWindowBody,
  CreateWorkspaceBody,
  UpdateAppWindowBody,
  UpdateWorkspaceBody,
  WorkspaceDTO,
} from '@jurycrowd/shared';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Like fetchJSON but for void responses (DELETE, 204 No Content). Includes auth token. */
async function fetchVoid(url: string, init?: RequestInit): Promise<void> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Request failed: ${res.status}`);
  }
}

export const api = {
  // Auth
  authStatus: () => fetchJSON<{ setupRequired: boolean }>(`${API_BASE}/auth/status`),
  authSetup: (password: string) =>
    fetchJSON<{ token: string }>(`${API_BASE}/auth/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }),
  authLogin: (password: string) =>
    fetchJSON<{ token: string }>(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }),

  // Workspaces
  listWorkspaces: () => fetchJSON<WorkspaceDTO[]>(`${API_BASE}/workspaces`),

  createWorkspace: (body: CreateWorkspaceBody) =>
    fetchJSON<WorkspaceDTO>(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getWorkspace: (id: string) => fetchJSON<WorkspaceDTO>(`${API_BASE}/workspaces/${id}`),

  updateWorkspace: (id: string, body: UpdateWorkspaceBody) =>
    fetchJSON<WorkspaceDTO>(`${API_BASE}/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  deleteWorkspace: (id: string) => fetchVoid(`${API_BASE}/workspaces/${id}`, { method: 'DELETE' }),

  // Windows (AppWindow)
  listWindows: (kind?: string) =>
    fetchJSON<AppWindowDTO[]>(
      kind ? `${API_BASE}/windows?kind=${kind}` : `${API_BASE}/windows`,
    ),

  listWindowsByWorkspace: (workspaceId: string) =>
    fetchJSON<AppWindowDTO[]>(`${API_BASE}/windows/workspace/${workspaceId}`),

  createWindow: (body: CreateAppWindowBody) =>
    fetchJSON<AppWindowDTO>(`${API_BASE}/windows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  updateWindow: (id: string, body: UpdateAppWindowBody) =>
    fetchJSON<AppWindowDTO>(`${API_BASE}/windows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  deleteWindow: (id: string) => fetchVoid(`${API_BASE}/windows/${id}`, { method: 'DELETE' }),

  // Sessions (AgentSession)
  listSessions: (workspaceId: string) =>
    fetchJSON<AgentSessionDTO[]>(`${API_BASE}/workspaces/${workspaceId}/sessions`),

  createSession: (workspaceId: string, agentType: string) =>
    fetchJSON<AgentSessionDTO>(`${API_BASE}/workspaces/${workspaceId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentType }),
    }),

  killSession: (sessionId: string) => fetchVoid(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' }),

  sendText: (sessionId: string, text: string) =>
    fetchJSON<{ success: boolean }>(`${API_BASE}/sessions/${sessionId}/send-text`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),

  // Agents
  listAgents: () => fetchJSON<AgentRegistryEntry[]>(`${API_BASE}/agents`),

  // Notes (markdown files on disk)
  listNotes: (wsId: string) => fetchJSON<string[]>(`${API_BASE}/notes/${wsId}`),
  getNote: (wsId: string, name: string) => fetchJSON<{ name: string; content: string }>(`${API_BASE}/notes/${wsId}/${name}`),
  createNote: (wsId: string, name: string, content = '') =>
    fetchJSON<{ name: string }>(`${API_BASE}/notes/${wsId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, content }) }),
  updateNote: (wsId: string, name: string, body: { content?: string; newName?: string }) =>
    fetchJSON<{ name: string }>(`${API_BASE}/notes/${wsId}/${name}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  deleteNote: (wsId: string, name: string) => fetchVoid(`${API_BASE}/notes/${wsId}/${name}`, { method: 'DELETE' }),

  // Skills (markdown files on disk)
  listSkills: (wsId: string) => fetchJSON<string[]>(`${API_BASE}/skills/${wsId}`),
  getSkill: (wsId: string, name: string) => fetchJSON<{ name: string; content: string }>(`${API_BASE}/skills/${wsId}/${name}`),
  createSkill: (wsId: string, name: string, content = '') =>
    fetchJSON<{ name: string }>(`${API_BASE}/skills/${wsId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, content }) }),
  updateSkill: (wsId: string, name: string, body: { content?: string; newName?: string }) =>
    fetchJSON<{ name: string }>(`${API_BASE}/skills/${wsId}/${name}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  deleteSkill: (wsId: string, name: string) => fetchVoid(`${API_BASE}/skills/${wsId}/${name}`, { method: 'DELETE' }),

  // GitHub integration
  githubConnect: (token: string) =>
    fetchJSON<{ connected: boolean }>(`${API_BASE}/github/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }),
  githubDisconnect: () =>
    fetchJSON<{ connected: boolean }>(`${API_BASE}/github/disconnect`, { method: 'POST' }),
  githubConnected: () => fetchJSON<{ connected: boolean }>(`${API_BASE}/github/connected`),
  githubRepos: (page = '1') => fetchJSON<Array<{ name: string; full_name: string; clone_url: string; private: boolean; default_branch: string }>>(`${API_BASE}/github/repos?page=${page}`),
  githubClone: (workspaceId: string, cloneUrl: string) =>
    fetchJSON<{ success: boolean }>(`${API_BASE}/github/clone`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, cloneUrl }) }),
  githubStatus: (workspaceId: string) => fetchJSON<{ initialized: boolean; branch?: string; ahead?: number; behind?: number; dirty?: number }>(`${API_BASE}/github/status/${workspaceId}`),
};
