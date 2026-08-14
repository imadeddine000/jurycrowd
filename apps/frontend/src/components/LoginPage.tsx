import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TerminalSquare } from 'lucide-react';

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <TerminalSquare className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">JuryCrowd</h1>
          <p className="text-sm text-muted-foreground">Agent Workspace Manager</p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {setupRequired ? 'Welcome' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {setupRequired
                ? 'Set your admin password to get started. You\'ll use this every time you log in.'
                : 'Enter your password to access your workspaces.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="h-10"
                autoFocus
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading || !password.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : setupRequired ? 'Set Password & Continue' : 'Log In'}
            </Button>
          </CardFooter>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          JuryCrowd · Local-first agent workspace
        </p>
      </div>
    </div>
  );
}
