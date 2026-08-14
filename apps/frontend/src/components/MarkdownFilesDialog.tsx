import { useCallback, useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  kind: 'notes' | 'skills';
}

export function MarkdownFilesDialog({ open, onOpenChange, workspaceId, kind }: MarkdownFilesDialogProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const apiMethods = kind === 'notes'
    ? { list: api.listNotes, get: api.getNote, create: api.createNote, update: api.updateNote, remove: api.deleteNote }
    : { list: api.listSkills, get: api.getSkill, create: api.createSkill, update: api.updateSkill, remove: api.deleteSkill };

  const loadFiles = useCallback(async () => {
    try {
      const list = await apiMethods.list(workspaceId);
      setFiles(list);
    } catch { /* ignore */ }
  }, [workspaceId, apiMethods]);

  const loadFile = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const file = await apiMethods.get(workspaceId, name);
      setContent(file.content);
      setSelected(name);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [workspaceId, apiMethods]);

  useEffect(() => {
    if (open) loadFiles();
  }, [open, loadFiles]);

  // Debounced save
  useEffect(() => {
    if (!selected || !open) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try { await apiMethods.update(workspaceId, selected, { content }); } catch { /* ignore */ }
      finally { setSaving(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [content, selected, open, workspaceId, apiMethods]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await apiMethods.create(workspaceId, newName.trim());
      setNewName('');
      await loadFiles();
      await loadFile(newName.trim());
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleDelete = async (name: string) => {
    try {
      await apiMethods.remove(workspaceId, name);
      if (selected === name) { setSelected(null); setContent(''); }
      await loadFiles();
    } catch { /* ignore */ }
  };

  const title = kind === 'notes' ? 'Notes' : 'Skills';
  const description = kind === 'notes'
    ? 'Markdown notes saved to .agent-workspace/notes/. Agents can read these files directly.'
    : 'Skill docs saved to .agent-workspace/skills/. Tell agents to read these for shared context.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-1 gap-2 overflow-hidden" style={{ minHeight: 0 }}>
          {/* File list sidebar */}
          <div className="flex w-48 shrink-0 flex-col border-r pr-2">
            <div className="flex items-center gap-1 pb-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New file..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="h-7 text-xs"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {files.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">No files yet</p>
              ) : (
                files.map((name) => (
                  <div key={name} className={cn('group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer', selected === name ? 'bg-accent' : 'hover:bg-secondary')} onClick={() => loadFile(name)}>
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{name}</span>
                    <button className="p-0.5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDelete(name); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Editor */}
          <div className="flex-1 overflow-hidden" data-color-mode="dark">
            {loading ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : selected ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs text-muted-foreground">{selected}.md {saving && '(saving...)'}</span>
                </div>
                <div className="flex-1 overflow-auto">
                  <MDEditor value={content} onChange={(val) => setContent(val ?? '')} height={500} />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a file or create a new one
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
