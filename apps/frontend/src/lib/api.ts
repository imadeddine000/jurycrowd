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
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
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

  deleteWorkspace: (id: string) =>
    fetch(`${API_BASE}/workspaces/${id}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed: ${res.status}`);
      }
    }),

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

  deleteWindow: (id: string) =>
    fetch(`${API_BASE}/windows/${id}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed: ${res.status}`);
      }
    }),

  // Sessions (AgentSession)
  listSessions: (workspaceId: string) =>
    fetchJSON<AgentSessionDTO[]>(`${API_BASE}/workspaces/${workspaceId}/sessions`),

  createSession: (workspaceId: string, agentType: string) =>
    fetchJSON<AgentSessionDTO>(`${API_BASE}/workspaces/${workspaceId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentType }),
    }),

  killSession: (sessionId: string) =>
    fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok && res.status !== 204) {
        throw new Error(`Kill failed: ${res.status}`);
      }
    }),

  // Agents
  listAgents: () => fetchJSON<AgentRegistryEntry[]>(`${API_BASE}/agents`),

  // Notes (markdown files on disk)
  listNotes: (wsId: string) => fetchJSON<string[]>(`${API_BASE}/notes/${wsId}`),
  getNote: (wsId: string, name: string) => fetchJSON<{ name: string; content: string }>(`${API_BASE}/notes/${wsId}/${name}`),
  createNote: (wsId: string, name: string, content = '') =>
    fetchJSON<{ name: string }>(`${API_BASE}/notes/${wsId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, content }) }),
  updateNote: (wsId: string, name: string, body: { content?: string; newName?: string }) =>
    fetchJSON<{ name: string }>(`${API_BASE}/notes/${wsId}/${name}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  deleteNote: (wsId: string, name: string) =>
    fetch(`${API_BASE}/notes/${wsId}/${name}`, { method: 'DELETE' }).then((res) => { if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`); }),

  // Skills (markdown files on disk)
  listSkills: (wsId: string) => fetchJSON<string[]>(`${API_BASE}/skills/${wsId}`),
  getSkill: (wsId: string, name: string) => fetchJSON<{ name: string; content: string }>(`${API_BASE}/skills/${wsId}/${name}`),
  createSkill: (wsId: string, name: string, content = '') =>
    fetchJSON<{ name: string }>(`${API_BASE}/skills/${wsId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, content }) }),
  updateSkill: (wsId: string, name: string, body: { content?: string; newName?: string }) =>
    fetchJSON<{ name: string }>(`${API_BASE}/skills/${wsId}/${name}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  deleteSkill: (wsId: string, name: string) =>
    fetch(`${API_BASE}/skills/${wsId}/${name}`, { method: 'DELETE' }).then((res) => { if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`); }),
};
