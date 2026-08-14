import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppWindowDTO, AgentRegistryEntry, AgentSessionDTO, WorkspaceDTO } from '@jurycrowd/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { TerminalPane } from './TerminalPane';
import { MarkdownFilesPanel } from './MarkdownFilesPanel';
import { GitHubPanel } from './GitHubPanel';
import { CommandPalette } from './CommandPalette';
import type { Command } from './CommandPalette';
import { useDebouncedCallback } from '@/hooks/useDebounced';
import { Plus, TerminalSquare, Folder, FileText, BookOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkspaceViewProps {
  workspace: WorkspaceDTO;
  agents: AgentRegistryEntry[];
}

type SidePanel = null | 'notes' | 'skills' | 'agents' | 'github';

export function WorkspaceView({ workspace, agents }: WorkspaceViewProps) {
  const [terminalWindows, setTerminalWindows] = useState<AppWindowDTO[]>([]);
  const [sessions, setSessions] = useState<AgentSessionDTO[]>([]);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const sessionMap = useMemo(() => {
    const m = new Map<string, AgentSessionDTO>();
    sessions.forEach((s) => m.set(s.id, s));
    return m;
  }, [sessions]);

  useEffect(() => {
    api.listWindowsByWorkspace(workspace.id).then((all) => {
      setTerminalWindows(all.filter((w) => w.kind === 'terminal').sort((a, b) => a.zIndex - b.zIndex));
    }).catch(() => {});
    api.listSessions(workspace.id).then(setSessions).catch(() => {});
  }, [workspace.id]);

  const handleNewAgent = useCallback(async (agentType: string) => {
    try {
      const session = await api.createSession(workspace.id, agentType);
      const instanceCount = terminalWindows.filter((w) => w.title.startsWith(`${agentType} #`)).length + 1;
      const newWin = await api.createWindow({
        workspaceId: workspace.id, kind: 'terminal', refId: session.id,
        title: `${agentType} #${instanceCount}`,
        x: 0, y: 0, width: 100 / (terminalWindows.length + 1), height: 400,
        zIndex: terminalWindows.length + 1,
      });
      setTerminalWindows((prev) => [...prev, newWin]);
      setSessions((prev) => [...prev, session]);
      setSidePanel(null);
      toast.success(`Agent launched: ${agentType}`);
    } catch (err) { console.error('Failed to create agent:', err); }
  }, [workspace.id, terminalWindows]);

  const handleCloseTerminal = useCallback(async (windowId: string) => {
    const tw = terminalWindows.find((w) => w.id === windowId);
    setTerminalWindows((prev) => prev.filter((w) => w.id !== windowId));
    if (tw?.refId) { try { await api.killSession(tw.refId); } catch {} }
    try { await api.deleteWindow(windowId); } catch {}
    toast.success('Session killed');
  }, [terminalWindows]);

  // Keyboard shortcuts: Escape closes side panel, Ctrl+K opens command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidePanel) setSidePanel(null);
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette((v) => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sidePanel]);

  // Command palette commands
  const commands: Command[] = useMemo(() => [
    { label: 'New Agent', shortcut: 'Ctrl+N', action: () => setSidePanel('agents') },
    { label: 'Open Terminal', action: () => handleNewAgent('terminal') },
    { label: 'Toggle Notes', action: () => setSidePanel(sidePanel === 'notes' ? null : 'notes') },
    { label: 'Toggle Skills', action: () => setSidePanel(sidePanel === 'skills' ? null : 'skills') },
    { label: 'Close Side Panel', shortcut: 'Esc', action: () => setSidePanel(null) },
    { label: 'Toggle Theme', action: () => { const isDark = document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); } },
  ], [sidePanel, handleNewAgent]);

  // --- Panel layout persistence ---
  const layoutInitialized = useRef(false);
  const debouncedSaveLayout = useDebouncedCallback(
    (updates: { id: string; width: number }[]) => {
      updates.forEach(({ id, width }) => { api.updateWindow(id, { width }).catch(() => {}); });
    }, 500,
  );
  const handleLayout = useCallback((sizes: number[]) => {
    if (!layoutInitialized.current) { layoutInitialized.current = true; return; }
    const total = sizes.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    const updates = terminalWindows.map((tw, i) => ({ id: tw.id, width: Math.round((sizes[i] / total) * 10000) / 100 }));
    debouncedSaveLayout(updates);
  }, [terminalWindows, debouncedSaveLayout]);

  // --- Terminal content (reused in both layouts) ---
  const terminalsContent = terminalWindows.length === 0 ? (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <TerminalSquare className="h-12 w-12 text-muted-foreground/30" />
      <p className="mt-4 text-sm text-muted-foreground">No agents running</p>
      <p className="mt-1 text-xs text-muted-foreground/60">Click "New agent" to launch a terminal.</p>
    </div>
  ) : (
    <ResizablePanelGroup direction="horizontal" onLayout={handleLayout}>
      {terminalWindows.flatMap((tw, i) => {
        const elements: React.ReactNode[] = [];
        if (i > 0) elements.push(<ResizableHandle key={`h-${tw.id}`} withHandle />);
        const savedSize = tw.width > 0 && tw.width <= 100 ? tw.width : 100 / terminalWindows.length;
        elements.push(
          <ResizablePanel key={tw.id} defaultSize={savedSize} minSize={10}>
            <TerminalPane window={tw} onKill={() => handleCloseTerminal(tw.id)} tmuxSessionName={sessionMap.get(tw.refId ?? '')?.tmuxSession ?? ''} />
          </ResizablePanel>
        );
        return elements;
      })}
    </ResizablePanelGroup>
  );

  // --- Side panel content ---
  const sidePanelTitle = sidePanel === 'notes' ? 'Notes' : sidePanel === 'skills' ? 'Skills' : sidePanel === 'github' ? 'GitHub' : 'New Agent';

  const sidePanelContent = (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b bg-secondary px-3 py-1.5">
        <span className="text-sm font-medium">{sidePanelTitle}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidePanel(null)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        {sidePanel === 'notes' && <MarkdownFilesPanel workspaceId={workspace.id} kind="notes" />}
        {sidePanel === 'skills' && <MarkdownFilesPanel workspaceId={workspace.id} kind="skills" />}
        {sidePanel === 'github' && <GitHubPanel workspaceId={workspace.id} />}
        {sidePanel === 'agents' && (
          <div className="space-y-1 p-2">
            {agents.map((a) => (
              <button key={a.type} disabled={!a.available} onClick={() => handleNewAgent(a.type)}
                className={cn('flex w-full items-center gap-2 border px-3 py-2 text-left text-sm transition-colors', a.available ? 'hover:bg-accent' : 'cursor-not-allowed opacity-50')}>
                <TerminalSquare className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{a.label}</span>
                {!a.available && <span className="text-xs text-muted-foreground">not installed</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b bg-secondary/30 px-3 py-1.5">
        <Folder className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{workspace.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className={cn('gap-1.5', sidePanel === 'notes' && 'bg-accent')} onClick={() => setSidePanel(sidePanel === 'notes' ? null : 'notes')}>
            <FileText className="h-3.5 w-3.5" /> Notes
          </Button>
          <Button variant="ghost" size="sm" className={cn('gap-1.5', sidePanel === 'skills' && 'bg-accent')} onClick={() => setSidePanel(sidePanel === 'skills' ? null : 'skills')}>
            <BookOpen className="h-3.5 w-3.5" /> Skills
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleNewAgent('terminal')}>
            <TerminalSquare className="h-3.5 w-3.5" /> Terminal
          </Button>
          <Button variant="outline" size="sm" className={cn('gap-1.5', sidePanel === 'agents' && 'bg-accent')} onClick={() => setSidePanel(sidePanel === 'agents' ? null : 'agents')}>
            <Plus className="h-3.5 w-3.5" /> New agent
          </Button>
        </div>
      </div>

      {/* Content: terminals + optional side panel */}
      <div className="flex-1 overflow-hidden">
        {sidePanel ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={70} minSize={30}>
              {terminalsContent}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
              {sidePanelContent}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          terminalsContent
        )}
      </div>

      {/* Command palette */}
      <CommandPalette open={showCommandPalette} onOpenChange={setShowCommandPalette} commands={commands} />
    </div>
  );
}
