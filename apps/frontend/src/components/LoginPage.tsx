import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock } from 'lucide-react';

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
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 p-6">
        <div className="flex flex-col items-center gap-2">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-semibold">JuryCrowd</h1>
          <p className="text-sm text-muted-foreground">
            {setupRequired ? 'Set your admin password to get started.' : 'Enter your password to log in.'}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={handleSubmit} disabled={loading || !password.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : setupRequired ? 'Set Password' : 'Log In'}
        </Button>
      </div>
    </div>
  );
}
