import { Router } from 'express';
import { isSetupRequired, setupPassword, login } from '../auth.js';

export const authRouter = Router();

// GET /api/auth/status — check if setup is needed
authRouter.get('/status', async (_req, res) => {
  const setupRequired = await isSetupRequired();
  res.json({ setupRequired });
});

// POST /api/auth/setup — set admin password (first run only)
authRouter.post('/setup', async (req, res) => {
  try {
    const { password } = req.body as { password: string };
    if (!password || password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
    const token = await setupPassword(password);
    res.json({ token });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

// POST /api/auth/login — verify password and return token
authRouter.post('/login', async (req, res) => {
  try {
    const { password } = req.body as { password: string };
    const token = await login(password);
    if (!token) return res.status(401).json({ error: 'Invalid password' });
    res.json({ token });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});
