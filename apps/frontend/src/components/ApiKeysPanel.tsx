import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Key, Trash2, Loader2, Pencil } from 'lucide-react';

interface ApiKey {
  id: string; name: string; endpoint: string; model: string; key: string; envVar: string; createdAt: string;
}

interface ApiKeysPanelProps { onBack: () => void; }

export function ApiKeysPanel({ onBack }: ApiKeysPanelProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [form, setForm] = useState({ name: '', endpoint: '', model: '', key: '', envVar: '' });
  const [saving, setSaving] = useState(false);

  const loadKeys = useCallback(async () => {
    try { setKeys(await api.listApiKeys()); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.key.trim() || !form.envVar.trim()) return;
    setSaving(true);
    try {
      if (editing) { await api.updateApiKey(editing.id, form); }
      else { await api.createApiKey(form); }
      setForm({ name: '', endpoint: '', model: '', key: '', envVar: '' });
      setEditing(null);
      await loadKeys();
    } catch {}
    finally { setSaving(false); }
  };

  const handleEdit = (k: ApiKey) => {
    setEditing(k);
    setForm({ name: k.name, endpoint: k.endpoint, model: k.model, key: '', envVar: k.envVar });
  };

  const handleDelete = async (id: string) => {
    try { await api.deleteApiKey(id); await loadKeys(); } catch {}
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-secondary/30 px-3 py-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Key className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">API Keys</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{editing ? 'Edit API Key' : 'Add API Key'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="OpenAI GPT-4" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Env Variable</Label>
                  <Input value={form.envVar} onChange={(e) => setForm({ ...form, envVar: e.target.value })} placeholder="OPENAI_API_KEY" className="h-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Endpoint (optional)</Label>
                  <Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://api.openai.com/v1" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Model (optional)</Label>
                  <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="gpt-4-turbo" className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">API Key</Label>
                <Input type="password" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder={editing ? 'Leave empty to keep current' : 'sk-...'} className="h-8 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={saving || !form.name.trim() || (!editing && !form.key.trim()) || !form.envVar.trim()}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Update' : 'Add'}
                </Button>
                {editing && (
                  <Button variant="outline" size="sm" onClick={() => { setEditing(null); setForm({ name: '', endpoint: '', model: '', key: '', envVar: '' }); }}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No API keys yet. Add one above.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Keys are injected as env vars when launching agents.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <Card key={k.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{k.name}</span>
                        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{k.envVar}</code>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{k.key}</span>
                        {k.endpoint && <span>· {k.endpoint}</span>}
                        {k.model && <span>· {k.model}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(k.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
