import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/components/LoginPage';
import { ApiKeysPage } from '@/components/ApiKeysPage';
import { api } from '@/lib/api';

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    api.authMe()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/api-keys" element={authenticated ? <ApiKeysPage /> : <Navigate to="/" replace />} />
        <Route path="/*" element={authenticated ? <AppShell /> : <LoginPage onAuthenticated={() => setAuthenticated(true)} />} />
      </Routes>
      <Toaster richColors position="bottom-right" theme="dark" />
    </BrowserRouter>
  );
}
