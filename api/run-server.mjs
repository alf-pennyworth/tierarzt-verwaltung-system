/**
 * Node.js server wrapper for Vet API
 * 
 * This wrapper loads environment variables BEFORE importing the app
 * to ensure they're available when modules are initialized.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env files BEFORE importing anything else
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '.env') });

// Verify critical environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📁 Environment loaded');
console.log(`✅ Supabase URL: ${SUPABASE_URL?.substring(0, 30)}...`);
console.log(`✅ Service key: ${SUPABASE_SERVICE_KEY ? 'present' : 'missing'}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Now dynamically import the server
const { default: serve } = await import('@hono/node-server');
const { default: app, port } = await import('./src/index.ts');

console.log(`🚀 Starting Vet API server on port ${port}...`);

serve({
  fetch: app.fetch,
  port: port,
}, (addr) => {
  console.log(`✅ Vet API running at http://localhost:${addr.port}`);
  console.log(`📚 Health check: http://localhost:${addr.port}/health`);
  console.log(`📖 OpenAPI spec: http://localhost:${addr.port}/openapi.json`);
  console.log(`🌐 Portal: http://localhost:${addr.port}/portal`);
});