/**
 * Test script: verify RAG_LLM_API_KEY against OpenAI's API.
 * Loads .env and .env.local from the frontend directory (same order as the app).
 *
 * Run from repo root:  node frontend/scripts/test-openai-key.mjs
 * Or from frontend:    node scripts/test-openai-key.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    env[key] = val;
  }
  return env;
}

// Resolve frontend dir: script lives in frontend/scripts/ so parent is frontend
const frontendDir = path.resolve(__dirname, '..');
const env = { ...loadEnvFile(path.join(frontendDir, '.env')), ...loadEnvFile(path.join(frontendDir, '.env.local')) };

// Allow override from process env (e.g. RAG_LLM_API_KEY=sk-... node scripts/test-openai-key.mjs)
const apiKey = process.env.RAG_LLM_API_KEY ?? env.RAG_LLM_API_KEY?.trim();
const provider = (process.env.RAG_LLM_PROVIDER ?? env.RAG_LLM_PROVIDER ?? 'openai').toLowerCase();
const model = process.env.RAG_LLM_MODEL?.trim() || env.RAG_LLM_MODEL?.trim() || 'gpt-4o';

console.log('Testing LLM API key');
console.log('  Provider:     ', provider);
console.log('  Model:        ', model);
console.log('  API key set:  ', !!apiKey);
console.log('  API key len:  ', apiKey?.length ?? 0);
console.log('');

if (!apiKey) {
  console.error('ERROR: RAG_LLM_API_KEY is not set. Set it in frontend/.env or frontend/.env.local (or pass RAG_LLM_API_KEY=... when running this script).');
  process.exit(1);
}

if (provider !== 'openai') {
  console.log('This script only tests the OpenAI API. Your RAG_LLM_PROVIDER is "%s". Switching to OpenAI for the test (key is still from your env).', provider);
  console.log('');
}

const openai = new OpenAI({ apiKey, timeout: 15000 });

try {
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    max_tokens: 10,
  });
  const text = completion.choices[0]?.message?.content ?? '';
  console.log('SUCCESS: OpenAI API accepted the key.');
  console.log('  Model used:  ', completion.model);
  console.log('  Reply:       ', JSON.stringify(text));
} catch (err) {
  const status = err?.status ?? err?.code;
  const message = err?.message ?? String(err);
  console.error('FAILED: OpenAI API rejected the request.');
  console.error('  Status:      ', status ?? '(none)');
  console.error('  Error:       ', message);
  if (status === 401) {
    console.error('');
    console.error('401 = Invalid or unauthorized API key. Check:');
    console.error('  - Key is copied correctly from https://platform.openai.com/api-keys (no spaces/newlines)');
    console.error('  - Key is active and has not been revoked');
    console.error('  - Account has access to the API and billing is in order');
  }
  process.exit(1);
}
