import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/components/LoginPage';
import { api } from '@/lib/api';

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check auth via cookie-based /api/auth/me endpoint
    api.authMe()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
  }, []);

  return (
    <>
      {authenticated === null ? null : !authenticated ? <LoginPage onAuthenticated={() => setAuthenticated(true)} /> : <AppShell />}
      <Toaster richColors position="bottom-right" theme="dark" />
    </>
  );
}
