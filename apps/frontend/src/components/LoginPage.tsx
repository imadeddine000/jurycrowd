import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { SpikeMark } from '@/components/ui/SpikeMark';

interface LoginPageProps {
  onAuthenticated: () => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.authStatus().then((r) => setSetupRequired(r.setupRequired)).catch(() => setSetupRequired(true));
  }, []);

  const handleSubmit = async () => {
    if (!password.trim()) return;
    setLoading(true); setError('');
    try {
      if (setupRequired) {
        await api.authSetup(password);
      } else {
        await api.authLogin(password);
      }
      onAuthenticated();
    } catch (e) {
      setError((e as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (setupRequired === null) {
    return <div className="flex h-screen items-center justify-center bg-canvas"><Loader2 className="h-6 w-6 animate-spin text-coral" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md">
        {/* Brand header — spike-mark + wordmark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <SpikeMark className="h-5 w-5" accent />
            <span className="font-serif text-display-sm text-ink">JuryCrowd</span>
          </div>
          <p className="text-body-sm text-muted-ink">Agent Workspace Manager</p>
        </div>

        <Card variant="outline" className="p-8">
          <div className="space-y-1.5">
            <h1 className="font-serif text-display-md text-ink">
              {setupRequired ? 'Welcome' : 'Welcome back'}
            </h1>
            <p className="text-body-sm text-muted-ink">
              {setupRequired
                ? 'Set your admin password to get started. You\'ll use this every time you log in.'
                : 'Enter your password to access your workspaces.'}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>
            {error && (
              <p className="rounded-md bg-error/10 px-3 py-2 text-body-sm text-error">{error}</p>
            )}
            <Button className="w-full" onClick={handleSubmit} disabled={loading || !password.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : setupRequired ? 'Set Password & Continue' : 'Log In'}
            </Button>
          </div>
        </Card>

        <p className="mt-8 text-center text-caption text-muted-soft-ink">
          JuryCrowd · Local-first agent workspace
        </p>
      </div>
    </div>
  );
}
