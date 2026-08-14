import { Router } from 'express';
import { isSetupRequired, setupPassword, login, setAuthCookie, clearAuthCookie, parseCookies, verifyToken, AUTH_COOKIE_NAME } from '../auth.js';

export const authRouter = Router();

// GET /api/auth/status — check if setup is needed
authRouter.get('/status', async (_req, res) => {
  const setupRequired = await isSetupRequired();
  res.json({ setupRequired });
});

// GET /api/auth/me — check if the current cookie is valid (used by frontend on load)
authRouter.get('/me', async (req, res) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? parseCookies(req.headers.cookie)[AUTH_COOKIE_NAME];
  if (!token) return res.status(401).json({ authenticated: false });
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true });
});

// POST /api/auth/setup — set admin password (first run only), sets HttpOnly cookie
authRouter.post('/setup', async (req, res) => {
  try {
    const { password } = req.body as { password: string };
    if (!password || password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
    const token = await setupPassword(password);
    setAuthCookie(res, token);
    res.json({ authenticated: true });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

// POST /api/auth/login — verify password, sets HttpOnly cookie
authRouter.post('/login', async (req, res) => {
  try {
    const { password } = req.body as { password: string };
    const token = await login(password);
    if (!token) return res.status(401).json({ error: 'Invalid password' });
    setAuthCookie(res, token);
    res.json({ authenticated: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/auth/logout — clear the auth cookie
authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ authenticated: false });
});
