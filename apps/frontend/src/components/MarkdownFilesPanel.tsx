import { useCallback, useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownFilesPanelProps {
  workspaceId: string;
  kind: 'notes' | 'skills';
}

export function MarkdownFilesPanel({ workspaceId, kind }: MarkdownFilesPanelProps) {
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
    try { setFiles(await apiMethods.list(workspaceId)); } catch {}
  }, [workspaceId, apiMethods]);

  const loadFile = useCallback(async (name: string) => {
    setLoading(true);
    try { const f = await apiMethods.get(workspaceId, name); setContent(f.content); setSelected(name); } catch {}
    finally { setLoading(false); }
  }, [workspaceId, apiMethods]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try { await apiMethods.update(workspaceId, selected, { content }); } catch {}
      finally { setSaving(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [content, selected, workspaceId, apiMethods]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try { await apiMethods.create(workspaceId, newName.trim()); setNewName(''); await loadFiles(); await loadFile(newName.trim()); } catch {}
    finally { setCreating(false); }
  };

  const handleDelete = async (name: string) => {
    try { await apiMethods.remove(workspaceId, name); if (selected === name) { setSelected(null); setContent(''); } await loadFiles(); } catch {}
  };

  return (
    <div className="flex h-full flex-col">
      {/* File list */}
      <div className="border-b p-2">
        <div className="flex items-center gap-1">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New file..." onKeyDown={(e) => e.key === 'Enter' && handleCreate()} className="h-7 text-xs" />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>
        <div className="mt-1 max-h-32 overflow-y-auto">
          {files.map((name) => (
            <div key={name} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', `.agent-workspace/${kind}/${name}.md`); }} className={cn('group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer', selected === name ? 'bg-accent' : 'hover:bg-secondary')} onClick={() => loadFile(name)}>
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{name}</span>
              <button className="p-0.5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDelete(name); }}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="dark">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : selected ? (
          <div className="flex h-full flex-col">
            <span className="px-2 py-0.5 text-xs text-muted-foreground">{selected}.md {saving && '(saving...)'}</span>
            <div className="flex-1 overflow-auto">
              <MDEditor value={content} onChange={(val) => setContent(val ?? '')} height={600} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select or create a file</div>
        )}
      </div>
    </div>
  );
}
