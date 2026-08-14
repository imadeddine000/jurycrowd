import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/components/LoginPage';

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setAuthenticated(!!token);
  }, []);

  return (
    <>
      {authenticated === null ? null : !authenticated ? <LoginPage onAuthenticated={() => setAuthenticated(true)} /> : <AppShell />}
      <Toaster richColors position="bottom-right" theme="dark" />
    </>
  );
}
