import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Github, Loader2, GitBranch, AlertCircle, Lock, RefreshCw } from 'lucide-react';

interface GitHubPanelProps {
  workspaceId: string;
}

interface Repo {
  name: string;
  full_name: string;
  clone_url: string;
  private: boolean;
  default_branch: string;
}

export function GitHubPanel({ workspaceId }: GitHubPanelProps) {
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);
  const [status, setStatus] = useState<{ initialized: boolean; branch?: string; ahead?: number; behind?: number; dirty?: number } | null>(null);
  const [error, setError] = useState('');

  const checkConnected = useCallback(async () => {
    try { const r = await api.githubConnected(); setConnected(r.connected); } catch {}
  }, []);

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    try { setRepos(await api.githubRepos()); } catch { setError('Failed to load repos'); }
    finally { setLoadingRepos(false); }
  }, []);

  const loadStatus = useCallback(async () => {
    try { setStatus(await api.githubStatus(workspaceId)); } catch {}
  }, [workspaceId]);

  useEffect(() => { checkConnected(); }, [checkConnected]);
  useEffect(() => { if (connected) { loadRepos(); loadStatus(); } }, [connected, loadRepos, loadStatus]);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setConnecting(true); setError('');
    try { await api.githubConnect(token.trim()); setConnected(true); setToken(''); }
    catch { setError('Failed to connect'); }
    finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    try { await api.githubDisconnect(); setConnected(false); setRepos([]); } catch {}
  };

  const handleClone = async (repo: Repo) => {
    setCloning(repo.full_name); setError('');
    try { await api.githubClone(workspaceId, repo.clone_url); await loadStatus(); }
    catch (e) { setError(`Clone failed: ${(e as Error).message}`); }
    finally { setCloning(null); }
  };

  if (!connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 gap-3">
        <Github className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">Connect your GitHub account to clone repos into this workspace.</p>
        <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="GitHub Personal Access Token" onKeyDown={(e) => e.key === 'Enter' && handleConnect()} className="max-w-xs" />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={handleConnect} disabled={connecting || !token.trim()}>
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
        </Button>
        <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline">Create a token →</a>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Git status bar */}
      {status?.initialized && (
        <div className="flex items-center gap-2 border-b bg-secondary/50 px-3 py-1.5 text-xs">
          <GitBranch className="h-3 w-3" />
          <span className="font-medium">{status.branch}</span>
          {status.ahead! > 0 && <span className="text-green-500">↑{status.ahead}</span>}
          {status.behind! > 0 && <span className="text-orange-500">↓{status.behind}</span>}
          {status.dirty! > 0 && <span className="text-yellow-500">●{status.dirty}</span>}
          <Button variant="ghost" size="icon" className="ml-auto h-5 w-5" onClick={loadStatus}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Repo list */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <span className="text-xs font-medium text-muted-foreground">Repositories</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleDisconnect}>Disconnect</Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingRepos ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : repos.length === 0 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">No repos found</p>
        ) : (
          repos.map((repo) => (
            <div key={repo.full_name} className="group flex items-center gap-2 border-b px-3 py-2 text-sm hover:bg-secondary">
              {repo.private ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Github className="h-3 w-3 text-muted-foreground" />}
              <span className="flex-1 truncate">{repo.full_name}</span>
              <Button variant="ghost" size="sm" className="h-6 opacity-0 group-hover:opacity-100" disabled={cloning === repo.full_name} onClick={() => handleClone(repo)}>
                {cloning === repo.full_name ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Clone'}
              </Button>
            </div>
          ))
        )}
      </div>
      {error && <div className="flex items-center gap-1 border-t px-3 py-1.5 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{error}</div>}
    </div>
  );
}
