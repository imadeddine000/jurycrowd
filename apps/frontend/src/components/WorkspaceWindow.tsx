import { useCallback, useEffect, useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';
import type { AppWindowDTO, AgentRegistryEntry, AgentSessionDTO, WorkspaceDTO } from '@jurycrowd/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TerminalWindow } from './TerminalWindow';
import { useDebouncedCallback } from '@/hooks/useDebounced';
import { Minimize2, X, Folder, Plus, TerminalSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceWindowProps {
  window: AppWindowDTO;
  workspace: WorkspaceDTO;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onUpdate: (id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => void;
}

export function WorkspaceWindow({
  window: win,
  workspace,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onUpdate,
}: WorkspaceWindowProps) {
  const [terminalWindows, setTerminalWindows] = useState<AppWindowDTO[]>([]);
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([]);
  const [sessions, setSessions] = useState<AgentSessionDTO[]>([]);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  // Map sessionId -> tmuxSession name for the kebab menu "Copy session name"
  const sessionMap = useMemo(() => {
    const m = new Map<string, AgentSessionDTO>();
    sessions.forEach((s) => m.set(s.id, s));
    return m;
  }, [sessions]);

  // Load terminal windows, sessions, and agents on mount
  useEffect(() => {
    api.listWindowsByWorkspace(workspace.id).then((all) => {
      setTerminalWindows(all.filter((w) => w.kind === 'terminal').sort((a, b) => a.zIndex - b.zIndex));
    }).catch(() => {});
    api.listSessions(workspace.id).then(setSessions).catch(() => {});
    api.listAgents().then(setAgents).catch(() => {});
  }, [workspace.id]);

  const maxTermZ = useMemo(() => terminalWindows.reduce((m, w) => Math.max(m, w.zIndex), 0), [terminalWindows]);

  // --- Terminal handlers ---
  const handleNewAgent = useCallback(async (agentType: string) => {
    try {
      const session = await api.createSession(workspace.id, agentType);
      // Count existing instances of this agent type for labelling
      const instanceCount = terminalWindows.filter((w) => w.title.startsWith(`${agentType} #`)).length + 1;
      const instanceLabel = `${agentType} #${instanceCount}`;
      const newWin = await api.createWindow({
        workspaceId: workspace.id,
        kind: 'terminal',
        refId: session.id,
        title: instanceLabel,
        x: 20 + terminalWindows.length * 20,
        y: 20 + terminalWindows.length * 20,
        width: 600,
        height: 400,
        zIndex: maxTermZ + 1,
      });
      setTerminalWindows((prev) => [...prev, newWin]);
      setSessions((prev) => [...prev, session]);
      setActiveTerminalId(newWin.id);
      setShowAgentDialog(false);
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
  }, [workspace.id, terminalWindows, maxTermZ]);

  const handleCloseTerminal = useCallback(async (windowId: string) => {
    const tw = terminalWindows.find((w) => w.id === windowId);
    setTerminalWindows((prev) => prev.filter((w) => w.id !== windowId));
    if (tw?.refId) { try { await api.killSession(tw.refId); } catch { /* ignore */ } }
    try { await api.deleteWindow(windowId); } catch { /* ignore */ }
  }, [terminalWindows]);

  const handleFocusTerminal = useCallback((windowId: string) => {
    setActiveTerminalId(windowId);
    setTerminalWindows((prev) => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 0);
      return prev.map((w) => (w.id === windowId ? { ...w, zIndex: maxZ + 1 } : w));
    });
  }, []);

  const handleUpdateTerminal = useCallback((id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => {
    setTerminalWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    debouncedTerminalUpdate(id, updates);
  }, []);

  const debouncedTerminalUpdate = useDebouncedCallback(
    (id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => {
      api.updateWindow(id, updates).catch(() => {});
    },
    400,
  );

  // --- Workspace window drag/resize ---
  const handleDragStop = useCallback((_e: unknown, d: { x: number; y: number }) => onUpdate(win.id, { x: d.x, y: d.y }), [win.id, onUpdate]);
  const handleResizeStop = useCallback((_e: unknown, _dir: unknown, ref: unknown, _delta: unknown, pos: { x: number; y: number }) => {
    const el = ref as HTMLElement;
    onUpdate(win.id, { x: pos.x, y: pos.y, width: el.offsetWidth, height: el.offsetHeight });
  }, [win.id, onUpdate]);

  if (win.minimized) return null;

  return (
    <Rnd
      size={{ width: win.width, height: win.height }}
      position={{ x: win.x, y: win.y }}
      onDragStart={onFocus}
      onDragStop={handleDragStop}
      onResizeStart={onFocus}
      onResizeStop={handleResizeStop}
      minWidth={500}
      minHeight={400}
      bounds="parent"
      style={{ zIndex: win.zIndex }}
      dragHandleClassName="window-drag-handle"
      enableResizing={{ top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }}
    >
      <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-xl', isActive ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border')} onMouseDown={onFocus}>
        {/* Title bar */}
        <div className="window-drag-handle flex items-center justify-between border-b bg-secondary px-3 py-2">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{workspace.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMinimize}><Minimize2 className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b bg-secondary/30 px-3 py-1.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAgentDialog(true)}>
            <Plus className="h-3.5 w-3.5" />
            New agent
          </Button>
          <span className="text-xs text-muted-foreground">{terminalWindows.length} panel(s)</span>
        </div>
        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden bg-background">
          {terminalWindows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <TerminalSquare className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No panels yet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Click "New agent" to launch a terminal.</p>
            </div>
          ) : (
            terminalWindows.map((tw) => (
              <TerminalWindow
                key={tw.id}
                window={tw}
                isActive={tw.id === activeTerminalId}
                onFocus={() => handleFocusTerminal(tw.id)}
                onClose={() => handleCloseTerminal(tw.id)}
                onKill={() => handleCloseTerminal(tw.id)}
                tmuxSessionName={sessionMap.get(tw.refId ?? '')?.tmuxSession ?? ''}
                onUpdate={handleUpdateTerminal}
              />
            ))
          )}
        </div>
      </div>

      {/* Agent picker dialog */}
      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Agent</DialogTitle>
            <DialogDescription>Select an agent to launch in this workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            {agents.map((a) => (
              <button
                key={a.type}
                disabled={!a.available}
                onClick={() => handleNewAgent(a.type)}
                className={cn('flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors', a.available ? 'hover:bg-accent' : 'cursor-not-allowed opacity-50')}
              >
                <TerminalSquare className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{a.label}</span>
                {!a.available && <span className="text-xs text-muted-foreground">not installed</span>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Rnd>
  );
}
