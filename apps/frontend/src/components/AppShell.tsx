import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentRegistryEntry, WorkspaceDTO } from '@jurycrowd/shared';
import { api } from '@/lib/api';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { WorkspaceView } from './WorkspaceView';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDTO[]>([]);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listWorkspaces(), api.listAgents()])
      .then(([ws, ag]) => {
        setWorkspaces(ws);
        setAgents(ag);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const wsMap = useMemo(() => {
    const m = new Map<string, WorkspaceDTO>();
    workspaces.forEach((w) => m.set(w.id, w));
    return m;
  }, [workspaces]);

  const activeWorkspace = activeId ? wsMap.get(activeId) ?? null : null;

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleCloseTab = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = prev.filter((x) => x !== id);
      if (activeId === id) {
        setActiveId(next[next.length - 1] ?? null);
      }
      return next;
    });
  }, [activeId]);

  const handleCreate = useCallback(async (title: string) => {
    const ws = await api.createWorkspace({ title });
    setWorkspaces((prev) => [ws, ...prev]);
    handleSelect(ws.id);
  }, [handleSelect]);

  const handleRename = useCallback(async (id: string, title: string) => {
    const ws = await api.updateWorkspace(id, { title });
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? ws : w)));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await api.deleteWorkspace(id);
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    setOpenIds((prev) => prev.filter((x) => x !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      {/* Sidebar */}
      <ResizablePanel defaultSize={16} minSize={10} maxSize={30}>
        <WorkspaceSidebar
          workspaces={workspaces}
          activeWorkspaceId={activeId}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />

      {/* Main content */}
      <ResizablePanel defaultSize={84}>
        <div className="flex h-full flex-col">
          {/* Top bar with workspace tabs (Windows-style) */}
          <div className="flex items-stretch border-b bg-secondary/40">
            {openIds.map((id) => {
              const ws = wsMap.get(id);
              if (!ws) return null;
              return (
                <div
                  key={id}
                  onClick={() => setActiveId(id)}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                    id === activeId
                      ? 'bg-card text-foreground'
                      : 'text-muted-foreground hover:bg-secondary',
                  )}
                >
                  <span className="max-w-[140px] truncate">{ws.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCloseTab(id); }}
                    className="p-0.5 opacity-0 transition-opacity hover:bg-destructive/20 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active workspace content */}
          <div className="flex-1 overflow-hidden">
            {activeWorkspace ? (
              <WorkspaceView key={activeWorkspace.id} workspace={activeWorkspace} agents={agents} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">No workspace selected</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Select one from the sidebar or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
