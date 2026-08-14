import { useCallback, useState } from 'react';
import { Rnd } from 'react-rnd';
import type { AppWindowDTO } from '@jurycrowd/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TerminalPanel } from './TerminalPanel';
import { X, TerminalSquare, MoreVertical, Skull, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TerminalWindowProps {
  window: AppWindowDTO;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onKill: () => void;
  tmuxSessionName: string;
  onUpdate: (id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => void;
}

const statusColors: Record<string, string> = {
  running: 'bg-green-500',
  connecting: 'bg-yellow-500',
  exited: 'bg-gray-500',
  crashed: 'bg-red-500',
  error: 'bg-red-500',
  killed: 'bg-gray-500',
};

export function TerminalWindow({
  window: win,
  isActive,
  onFocus,
  onClose,
  onKill,
  tmuxSessionName,
  onUpdate,
}: TerminalWindowProps) {
  const [status, setStatus] = useState('connecting');

  const handleDragStop = useCallback(
    (_e: unknown, d: { x: number; y: number }) => onUpdate(win.id, { x: d.x, y: d.y }),
    [win.id, onUpdate],
  );

  const handleResizeStop = useCallback(
    (
      _e: unknown,
      _dir: unknown,
      ref: unknown,
      _delta: unknown,
      position: { x: number; y: number },
    ) => {
      const el = ref as HTMLElement;
      onUpdate(win.id, {
        x: position.x,
        y: position.y,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    },
    [win.id, onUpdate],
  );

  const handleCopySessionName = useCallback(() => {
    navigator.clipboard.writeText(tmuxSessionName).catch(() => {});
  }, [tmuxSessionName]);

  if (win.minimized) return null;

  return (
    <Rnd
      size={{ width: win.width, height: win.height }}
      position={{ x: win.x, y: win.y }}
      onDragStart={onFocus}
      onDragStop={handleDragStop}
      onResizeStart={onFocus}
      onResizeStop={handleResizeStop}
      minWidth={300}
      minHeight={200}
      bounds="parent"
      style={{ zIndex: win.zIndex }}
      dragHandleClassName="terminal-drag-handle"
      enableResizing={{
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
      }}
    >
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-lg',
          isActive ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border',
        )}
        onMouseDown={onFocus}
      >
        {/* Title bar */}
        <div className="terminal-drag-handle flex items-center justify-between border-b bg-secondary px-3 py-1.5">
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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {/* Terminal */}
        <div className="flex-1 overflow-hidden">
          <TerminalPanel sessionId={win.refId ?? ''} onStatusChange={setStatus} />
        </div>
      </div>
    </Rnd>
  );
}
