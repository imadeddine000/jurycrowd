import { Router } from 'express';
import { listApiKeys, createApiKey, updateApiKey, deleteApiKey, type ApiKey } from '../apiKeys.js';

export const apiKeysRouter = Router();

// GET /api/apikeys — list all API keys
apiKeysRouter.get('/', async (_req, res) => {
  try {
    const keys = await listApiKeys();
    // Don't return the full key value in the list — mask it
    const masked = keys.map((k) => ({ ...k, key: k.key.slice(0, 8) + '••••' + k.key.slice(-4) }));
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// POST /api/apikeys — create a new API key
apiKeysRouter.post('/', async (req, res) => {
  try {
    const { name, endpoint, model, key, envVar } = req.body as Partial<ApiKey>;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!key?.trim()) return res.status(400).json({ error: 'key is required' });
    if (!envVar?.trim()) return res.status(400).json({ error: 'envVar is required' });
    const apiKey = await createApiKey({
      name: name.trim(),
      endpoint: endpoint?.trim() || '',
      model: model?.trim() || '',
      key: key.trim(),
      envVar: envVar.trim().toUpperCase(),
    });
    res.status(201).json({ ...apiKey, key: apiKey.key.slice(0, 8) + '••••' + apiKey.key.slice(-4) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// PATCH /api/apikeys/:id — update an API key
apiKeysRouter.patch('/:id', async (req, res) => {
  try {
    const { name, endpoint, model, key, envVar } = req.body as Partial<ApiKey>;
    const updated = await updateApiKey(req.params.id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(endpoint !== undefined && { endpoint: endpoint.trim() }),
      ...(model !== undefined && { model: model.trim() }),
      ...(key !== undefined && { key: key.trim() }),
      ...(envVar !== undefined && { envVar: envVar.trim().toUpperCase() }),
    });
    if (!updated) return res.status(404).json({ error: 'API key not found' });
    res.json({ ...updated, key: updated.key.slice(0, 8) + '••••' + updated.key.slice(-4) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// DELETE /api/apikeys/:id — delete an API key
apiKeysRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteApiKey(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'API key not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});
