import { useCallback, useState } from 'react';
import type { AppWindowDTO } from '@jurycrowd/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TerminalPanel } from './TerminalPanel';
import { api } from '@/lib/api';
import { TerminalSquare, MoreVertical, Skull, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TerminalPaneProps {
  window: AppWindowDTO;
  onKill: () => void;
  tmuxSessionName: string;
}

const statusColors: Record<string, string> = {
  running: 'bg-green-500',
  connecting: 'bg-yellow-500',
  exited: 'bg-gray-500',
  crashed: 'bg-red-500',
  error: 'bg-red-500',
  killed: 'bg-gray-500',
};

export function TerminalPane({ window: win, onKill, tmuxSessionName }: TerminalPaneProps) {
  const [status, setStatus] = useState('connecting');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleCopySessionName = useCallback(() => {
    navigator.clipboard.writeText(tmuxSessionName).catch(() => {});
  }, [tmuxSessionName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const sessionId = win.refId;
    if (!sessionId) return;
    // Check for note/skill drag data (file path)
    const filePath = e.dataTransfer.getData('text/plain');
    if (filePath) {
      api.sendText(sessionId, filePath).catch(() => {});
      return;
    }
    // OS file drop — send file names
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const text = files.map((f) => f.name).join(' ');
      api.sendText(sessionId, text).catch(() => {});
    }
  }, [win.refId]);

  return (
    <div className="flex h-full flex-col overflow-hidden border-b border-r bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-secondary px-3 py-1.5">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{win.title}</span>
          <span className={cn('h-2 w-2 rounded-full', statusColors[status] ?? 'bg-gray-500')} />
        </div>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onKill} className="gap-2 text-destructive">
                <Skull className="h-3.5 w-3.5" />
                Kill session
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopySessionName} className="gap-2">
                <Copy className="h-3.5 w-3.5" />
                Copy session name
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCloseDialogOpen(true)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {/* Terminal */}
      <div
        className={cn('flex-1 overflow-hidden relative', dragOver && 'ring-2 ring-primary ring-inset bg-primary/5')}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        <TerminalPanel sessionId={win.refId ?? ''} onStatusChange={setStatus} />
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 pointer-events-none">
            <span className="text-sm text-muted-foreground">Drop to send to terminal</span>
          </div>
        )}
      </div>

      {/* Close confirmation dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kill agent session?</DialogTitle>
            <DialogDescription>
              Closing this panel will kill the agent session and terminate the running process. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setCloseDialogOpen(false); onKill(); }}>
              Kill session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
