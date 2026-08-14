import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AppWindowDTO, WorkspaceDTO } from '@jurycrowd/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkspaceWindow } from './WorkspaceWindow';
import { useDebouncedCallback } from '@/hooks/useDebounced';
import { FolderPlus, Folder, X, Loader2, Plus, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Sortable Tab ---
interface TabProps {
  win: AppWindowDTO;
  title: string;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}
function SortableTab({ win, title, isActive, onClick, onClose }: TabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: win.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-t-md border border-b-0 px-3 py-1.5 text-sm transition-colors',
        isActive
          ? 'border-primary/60 bg-card text-foreground'
          : 'border-transparent bg-secondary/60 text-muted-foreground hover:bg-secondary',
      )}
    >
      <Folder className="h-3.5 w-3.5" />
      <span className="max-w-[140px] truncate">{title}</span>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="ml-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/20 group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// --- Desktop Shell ---
export function DesktopShell() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDTO[]>([]);
  const [windows, setWindows] = useState<AppWindowDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Load data
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ws, wins] = await Promise.all([
        api.listWorkspaces(),
        api.listWindows('workspace'),
      ]);
      setWorkspaces(ws);
      setWindows(wins.sort((a, b) => a.zIndex - b.zIndex));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Map workspaceId -> workspace for quick lookup
  const wsMap = useMemo(() => {
    const m = new Map<string, WorkspaceDTO>();
    workspaces.forEach((w) => m.set(w.id, w));
    return m;
  }, [workspaces]);

  // Active window = highest zIndex
  const activeWindowId = useMemo(() => {
    if (windows.length === 0) return null;
    return windows.reduce((max, w) => (w.zIndex > max.zIndex ? w : max)).id;
  }, [windows]);

  // --- Handlers ---
  const maxZ = useMemo(() => windows.reduce((m, w) => Math.max(m, w.zIndex), 0), [windows]);

  const handleOpenWorkspace = useCallback(async (workspaceId: string) => {
    const ws = wsMap.get(workspaceId);
    if (!ws) return;
    // Check if already open
    const existing = windows.find((w) => w.refId === workspaceId);
    if (existing) {
      // Just focus it
      handleFocus(existing.id);
      return;
    }
    try {
      const newWin = await api.createWindow({
        workspaceId,
        kind: 'workspace',
        refId: workspaceId,
        title: ws.title,
        x: 40 + windows.length * 30,
        y: 40 + windows.length * 30,
        width: 900,
        height: 650,
        zIndex: maxZ + 1,
      });
      setWindows((prev) => [...prev, newWin]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open workspace');
    }
  }, [wsMap, windows, maxZ]);

  const handleCloseWindow = useCallback(async (windowId: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== windowId));
    try { await api.deleteWindow(windowId); } catch { /* ignore */ }
  }, []);

  const handleMinimizeWindow = useCallback(async (windowId: string) => {
    setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, minimized: true } : w)));
    try { await api.updateWindow(windowId, { minimized: true }); } catch { /* ignore */ }
  }, []);

  const handleFocus = useCallback((windowId: string) => {
    setWindows((prev) => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
      return prev.map((w) => (w.id === windowId ? { ...w, zIndex: maxZ + 1 } : w));
    });
    // Debounced persist
    debouncedFocusPersist(windowId);
  }, []);

  const debouncedFocusPersist = useDebouncedCallback((windowId: string) => {
    const win = windows.find((w) => w.id === windowId);
    if (win) api.updateWindow(windowId, { zIndex: win.zIndex }).catch(() => {});
  }, 300);

  const handleUpdateWindow = useCallback((id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    debouncedUpdatePersist(id, updates);
  }, []);

  const debouncedUpdatePersist = useDebouncedCallback(
    (id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => {
      api.updateWindow(id, updates).catch(() => {});
    },
    400,
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWindows((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id);
      const newIndex = prev.findIndex((w) => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      // Reassign zIndex based on new order
      reordered.forEach((w, i) => {
        api.updateWindow(w.id, { zIndex: i + 1 }).catch(() => {});
      });
      return reordered.map((w, i) => ({ ...w, zIndex: i + 1 }));
    });
  }, []);

  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    try {
      setCreating(true);
      const ws = await api.createWorkspace({ title: createTitle.trim() });
      setWorkspaces((prev) => [ws, ...prev]);
      setCreateDialog(false);
      setCreateTitle('');
      await handleOpenWorkspace(ws.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-1 border-b bg-secondary/40 px-2 py-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={windows.map((w) => w.id)} strategy={horizontalListSortingStrategy}>
            {windows.map((win) => {
              const ws = win.refId ? wsMap.get(win.refId) : null;
              return (
                <SortableTab
                  key={win.id}
                  win={win}
                  title={ws?.title ?? win.title}
                  isActive={win.id === activeWindowId}
                  onClick={() => handleFocus(win.id)}
                  onClose={() => handleCloseWindow(win.id)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
        <Button variant="ghost" size="sm" className="ml-1 gap-1.5" onClick={() => setOpenDialog(true)}>
          <Plus className="h-3.5 w-3.5" />
          Open
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setCreateDialog(true)}>
          <FolderPlus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-destructive/10 px-4 py-1.5 text-xs text-destructive">{error}</div>
      )}

      {/* Window canvas */}
      <div className="relative flex-1 overflow-hidden">
        {windows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Layers className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">No workspaces open.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Use "Open" to open an existing workspace or "New" to create one.
            </p>
          </div>
        ) : (
          windows.map((win) => {
            const ws = win.refId ? wsMap.get(win.refId) : null;
            if (!ws) return null;
            return (
              <WorkspaceWindow
                key={win.id}
                window={win}
                workspace={ws}
                isActive={win.id === activeWindowId}
                onFocus={() => handleFocus(win.id)}
                onClose={() => handleCloseWindow(win.id)}
                onMinimize={() => handleMinimizeWindow(win.id)}
                onUpdate={handleUpdateWindow}
              />
            );
          })
        )}
      </div>

      {/* Open Workspace Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Workspace</DialogTitle>
            <DialogDescription>Select a workspace to open.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] space-y-1 overflow-y-auto py-2">
            {workspaces.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No workspaces available. Create one first.
              </p>
            ) : (
              workspaces.map((ws) => {
                const isOpen = windows.some((w) => w.refId === ws.id);
                return (
                  <button
                    key={ws.id}
                    onClick={() => { handleOpenWorkspace(ws.id); setOpenDialog(false); }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                      isOpen && 'border-primary/40 bg-primary/5',
                    )}
                  >
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{ws.title}</span>
                    {isOpen && <span className="text-xs text-muted-foreground">open</span>}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Workspace Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Workspace</DialogTitle>
            <DialogDescription>Create a new workspace tied to a project directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="shell-create-title">Title</Label>
              <Input
                id="shell-create-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="My Project"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !createTitle.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create & Open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
