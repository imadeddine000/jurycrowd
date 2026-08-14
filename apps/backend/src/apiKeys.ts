import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const CONFIG_DIR = path.join(os.homedir(), '.jurycrowd');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface ApiKey {
  id: string;
  name: string;        // display name (e.g. "OpenAI GPT-4")
  endpoint: string;    // custom API endpoint URL
  model: string;       // model name (e.g. "gpt-4-turbo")
  key: string;         // API key value
  envVar: string;      // env var name to inject (e.g. OPENAI_API_KEY)
  createdAt: string;   // ISO timestamp
}

interface Config {
  adminPasswordHash?: string;
  githubToken?: string;
  apiKeys?: ApiKey[];
}

async function readConfig(): Promise<Config> {
  try { return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8')); } catch { return {}; }
}

async function writeConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/** List all API keys */
export async function listApiKeys(): Promise<ApiKey[]> {
  const config = await readConfig();
  return config.apiKeys ?? [];
}

/** Create a new API key */
export async function createApiKey(data: Omit<ApiKey, 'id' | 'createdAt'>): Promise<ApiKey> {
  const config = await readConfig();
  const apiKey: ApiKey = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  config.apiKeys = [...(config.apiKeys ?? []), apiKey];
  await writeConfig(config);
  return apiKey;
}

/** Update an API key */
export async function updateApiKey(id: string, data: Partial<Omit<ApiKey, 'id' | 'createdAt'>>): Promise<ApiKey | null> {
  const config = await readConfig();
  const keys = config.apiKeys ?? [];
  const idx = keys.findIndex((k) => k.id === id);
  if (idx === -1) return null;
  keys[idx] = { ...keys[idx], ...data };
  config.apiKeys = keys;
  await writeConfig(config);
  return keys[idx];
}

/** Delete an API key */
export async function deleteApiKey(id: string): Promise<boolean> {
  const config = await readConfig();
  const keys = config.apiKeys ?? [];
  const filtered = keys.filter((k) => k.id !== id);
  if (filtered.length === keys.length) return false;
  config.apiKeys = filtered;
  await writeConfig(config);
  return true;
}

/** Get all API keys as environment variables (for injecting into agent sessions) */
export async function getApiKeyEnvVars(): Promise<Record<string, string>> {
  const keys = await listApiKeys();
  const env: Record<string, string> = {};
  for (const k of keys) {
    // Set the API key as the env var
    if (k.envVar) env[k.envVar] = k.key;
    // Also set a corresponding BASE_URL env var if endpoint is provided
    if (k.endpoint && k.envVar) {
      const baseEnvVar = k.envVar.replace(/_KEY$/, '_BASE_URL');
      env[baseEnvVar] = k.endpoint;
    }
    // Also set a MODEL env var if model is provided
    if (k.model && k.envVar) {
      const modelEnvVar = k.envVar.replace(/_KEY$/, '_MODEL');
      env[modelEnvVar] = k.model;
    }
  }
  return env;
}
