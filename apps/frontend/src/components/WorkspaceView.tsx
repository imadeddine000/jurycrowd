import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppWindowDTO, AgentRegistryEntry, AgentSessionDTO, WorkspaceDTO } from '@jurycrowd/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { TerminalPane } from './TerminalPane';
import { MarkdownFilesPanel } from './MarkdownFilesPanel';
import { CommandPalette } from './CommandPalette';
import type { Command } from './CommandPalette';
import { Plus, TerminalSquare, Folder, FileText, BookOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SpikeMark } from '@/components/ui/SpikeMark';

interface WorkspaceViewProps {
  workspace: WorkspaceDTO;
  agents: AgentRegistryEntry[];
}

type SidePanel = null | 'notes' | 'skills' | 'agents' | 'github';

/** Roughly-square grid for agent terminals: cols = ceil(√n), rows = ceil(n / cols). */
function computeGrid(n: number): { cols: number; rows: number } {
  if (n <= 1) return { cols: 1, rows: 1 };
  const cols = Math.ceil(Math.sqrt(n));
  return { cols, rows: Math.ceil(n / cols) };
}

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

  // Separate agent windows from the utility terminal window
  const agentWindows = useMemo(() => terminalWindows.filter((w) => !w.title.startsWith('terminal #')), [terminalWindows]);
  const terminalWin = useMemo(() => terminalWindows.find((w) => w.title.startsWith('terminal #')), [terminalWindows]);

  // Terminal toggle: only one terminal allowed — click again to close
  const handleToggleTerminal = useCallback(() => {
    if (terminalWin) {
      handleCloseTerminal(terminalWin.id);
    } else {
      handleNewAgent('terminal');
    }
  }, [terminalWin, handleCloseTerminal, handleNewAgent]);

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
    { label: 'Toggle Terminal', action: () => handleToggleTerminal() },
    { label: 'Toggle Notes', action: () => setSidePanel(sidePanel === 'notes' ? null : 'notes') },
    { label: 'Toggle Skills', action: () => setSidePanel(sidePanel === 'skills' ? null : 'skills') },
    { label: 'Close Side Panel', shortcut: 'Esc', action: () => setSidePanel(null) },
    { label: 'Toggle Theme', action: () => { const isDark = document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); } },
  ], [sidePanel, handleNewAgent, handleToggleTerminal]);

  // --- Main content: agents in an equal-size grid + optional terminal (bottom) ---
  const { cols, rows } = computeGrid(agentWindows.length);
  const agentsContent = agentWindows.length === 0 ? (
    <div className="flex h-full flex-col items-center justify-center bg-canvas text-center px-6">
      <SpikeMark className="h-7 w-7 text-coral/60" />
      <p className="mt-4 font-serif text-display-sm text-ink">No agents running</p>
      <p className="mt-2 text-body-sm text-muted-ink">Click "New agent" to launch an agent.</p>
    </div>
  ) : (
    <div
      className="grid h-full w-full bg-surface-dark"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
    >
      {agentWindows.map((tw) => (
        <TerminalPane
          key={tw.id}
          window={tw}
          onKill={() => handleCloseTerminal(tw.id)}
          tmuxSessionName={sessionMap.get(tw.refId ?? '')?.tmuxSession ?? ''}
        />
      ))}
    </div>
  );

  const terminalsContent = terminalWin ? (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel defaultSize={70} minSize={20}>
        {agentsContent}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30} minSize={10} maxSize={85}>
        <TerminalPane window={terminalWin} onKill={() => handleCloseTerminal(terminalWin.id)} tmuxSessionName={sessionMap.get(terminalWin.refId ?? '')?.tmuxSession ?? ''} />
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    agentsContent
  );

  // --- Side panel content (only for agents picker now) ---
  const sidePanelContent = (
    <div className="flex h-full flex-col bg-surface-card">
      <div className="flex items-center justify-between border-b border-hairline bg-surface-soft px-3 py-2">
        <span className="text-title-sm text-ink">New Agent</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidePanel(null)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="space-y-1 p-2">
          {agents.filter((a) => a.type !== 'terminal').map((a) => (
            <button key={a.type} disabled={!a.available} onClick={() => handleNewAgent(a.type)}
              className={cn('flex w-full items-center gap-2 rounded-md border border-hairline px-3 py-2 text-left text-body-sm text-ink transition-colors', a.available ? 'hover:bg-surface-soft' : 'cursor-not-allowed opacity-50')}>
              <TerminalSquare className="h-4 w-4 text-muted-ink" />
              <span className="flex-1">{a.label}</span>
              {!a.available && <span className="text-caption text-muted-ink">not installed</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const isFullPageView = sidePanel === 'notes' || sidePanel === 'skills';

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar — hidden when in full-page notes/skills view */}
      {!isFullPageView && (
        <div className="flex items-center gap-2 border-b border-hairline bg-surface-soft/40 px-3 py-2">
          <Folder className="h-4 w-4 text-muted-ink" />
          <span className="text-title-sm text-ink">{workspace.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSidePanel('notes')}>
              <FileText className="h-3.5 w-3.5" /> Notes
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSidePanel('skills')}>
              <BookOpen className="h-3.5 w-3.5" /> Skills
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleToggleTerminal}>
              <TerminalSquare className="h-3.5 w-3.5" /> Terminal
            </Button>
            <Button variant="default" size="sm" className={cn('gap-1.5', sidePanel === 'agents' && 'ring-2 ring-coral/30')} onClick={() => setSidePanel(sidePanel === 'agents' ? null : 'agents')}>
              <Plus className="h-3.5 w-3.5" /> New agent
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {sidePanel === 'notes' ? (
          <MarkdownFilesPanel workspaceId={workspace.id} kind="notes" onBack={() => setSidePanel(null)} />
        ) : sidePanel === 'skills' ? (
          <MarkdownFilesPanel workspaceId={workspace.id} kind="skills" onBack={() => setSidePanel(null)} />
        ) : sidePanel === 'agents' ? (
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
