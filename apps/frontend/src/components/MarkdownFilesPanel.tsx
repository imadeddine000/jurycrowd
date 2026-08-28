import { useCallback, useEffect, useMemo, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownFilesPanelProps {
  workspaceId: string;
  kind: 'notes' | 'skills';
  onBack: () => void;
}

export function MarkdownFilesPanel({ workspaceId, kind, onBack }: MarkdownFilesPanelProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const apiMethods = useMemo(() => kind === 'notes'
    ? { list: api.listNotes, get: api.getNote, create: api.createNote, update: api.updateNote, remove: api.deleteNote }
    : { list: api.listSkills, get: api.getSkill, create: api.createSkill, update: api.updateSkill, remove: api.deleteSkill }, [kind]);

  const loadFiles = useCallback(async () => {
    try { setFiles(await apiMethods.list(workspaceId)); } catch {}
  }, [workspaceId, apiMethods]);

  const loadFile = useCallback(async (name: string) => {
    setLoading(true);
    try { const f = await apiMethods.get(workspaceId, name); setContent(f.content); setSelected(name); } catch {}
    finally { setLoading(false); }
  }, [workspaceId, apiMethods]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Debounced auto-save — only depends on content + selected (apiMethods is stable via useMemo)
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

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const title = kind === 'notes' ? 'Notes' : 'Skills';

  return (
    <div className="flex h-full flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-soft/40 px-3 py-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-title-sm text-ink">{title}</span>
        {saving && <span className="text-caption text-muted-ink">saving...</span>}
      </div>
      {/* Content: file list (left) + editor (right) */}
      <div className="flex flex-1 overflow-hidden">
        {/* File list sidebar */}
        <div className="w-56 shrink-0 border-r border-hairline p-2">
          <div className="flex items-center gap-1">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New file..." onKeyDown={(e) => e.key === 'Enter' && handleCreate()} className="h-7 text-xs" />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </Button>
          </div>
          <div className="mt-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 40px)' }}>
            {files.length === 0 ? (
              <p className="px-2 py-3 text-center text-caption text-muted-ink">No files yet</p>
            ) : files.map((name) => (
              <div key={name} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', `.agent-workspace/${kind}/${name}.md`); }} className={cn('group flex items-center gap-1 rounded-md px-2 py-1.5 text-body-sm cursor-pointer', selected === name ? 'bg-surface-card' : 'hover:bg-surface-soft')} onClick={() => loadFile(name)}>
                <FileText className="h-3 w-3 shrink-0 text-muted-ink" />
                <span className="flex-1 truncate">{name}</span>
                <button className="p-0.5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDelete(name); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Editor */}
        <div className="flex-1 overflow-hidden" data-color-mode={isDark ? 'dark' : 'light'}>
          {loading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : selected ? (
            <div className="flex h-full flex-col">
              <span className="border-b border-hairline px-3 py-1 text-caption text-muted-ink">{selected}.md</span>
              <div className="flex-1 overflow-auto">
                <MDEditor value={content} onChange={(val) => setContent(val ?? '')} height="100%" />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-body-sm text-muted-ink">Select or create a file</div>
          )}
        </div>
      </div>
    </div>
  );
}
