import { useState } from 'react';
import type { WorkspaceDTO } from '@jurycrowd/shared';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder, FolderPlus, Loader2, MoreVertical, Pencil, Trash2, Sun, Moon, LogOut, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface WorkspaceSidebarProps {
  workspaces: WorkspaceDTO[];
  activeWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onShowApiKeys: () => void;
}

export function WorkspaceSidebar({ workspaces, activeWorkspaceId, onSelect, onCreate, onRename, onDelete, onShowApiKeys }: WorkspaceSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [renameWs, setRenameWs] = useState<WorkspaceDTO | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleteWs, setDeleteWs] = useState<WorkspaceDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try { await onCreate(title.trim()); setCreateOpen(false); setTitle(''); } catch {} finally { setCreating(false); }
  };
  const handleRename = async () => {
    if (!renameWs || !renameTitle.trim()) return;
    setRenaming(true);
    try { await onRename(renameWs.id, renameTitle.trim()); setRenameWs(null); } catch {} finally { setRenaming(false); }
  };
  const handleDelete = async () => {
    if (!deleteWs) return;
    setDeleting(true);
    try { await onDelete(deleteWs.id); setDeleteWs(null); } catch {} finally { setDeleting(false); }
  };

  return (
    <div className="flex h-full flex-col bg-secondary/30">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">Workspaces</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
          }}>
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCreateOpen(true)}>
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onShowApiKeys}>
            <Key className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { api.authLogout().catch(() => {}); window.location.reload(); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {workspaces.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">No workspaces yet.</p>
        ) : (
          workspaces.map((ws) => (
            <div key={ws.id} className={cn('group flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors', ws.id === activeWorkspaceId ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
              <Folder className="h-3.5 w-3.5 shrink-0" />
              <button onClick={() => onSelect(ws.id)} className="flex-1 truncate text-left">{ws.title}</button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100">
                    <MoreVertical className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setRenameWs(ws); setRenameTitle(ws.title); }} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteWs(ws)} className="gap-2 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Workspace</DialogTitle><DialogDescription>Create a new workspace tied to a project directory.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sc-title">Title</Label>
              <Input id="sc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Project" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !title.trim()}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameWs} onOpenChange={(open) => !open && setRenameWs(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Workspace</DialogTitle><DialogDescription>Enter a new title for this workspace.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sr-title">Title</Label>
              <Input id="sr-title" value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameWs(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={renaming || !renameTitle.trim()}>{renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rename'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteWs} onOpenChange={(open) => !open && setDeleteWs(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Workspace</DialogTitle><DialogDescription>Are you sure you want to delete "{deleteWs?.title}"? This will kill all running agent sessions and remove the workspace. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteWs(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
