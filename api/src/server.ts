/**
 * Node.js server adapter for Vet API
 * 
 * This file wraps the Hono app with @hono/node-server
 * for running with Node.js instead of Bun
 */

import { config } from 'dotenv';
import { serve } from '@hono/node-server';

// Load environment variables BEFORE any other imports
// This ensures process.env is populated when modules are loaded
const envResult = config({ path: '../.env' });
const envResult2 = config({ path: '.env' });

console.log('📁 Loaded environment files');

// Verify critical environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL environment variable');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_SERVICE_KEY environment variable');
  process.exit(1);
}

console.log(`✅ Supabase URL: ${SUPABASE_URL?.substring(0, 30)}...`);
console.log(`✅ Service key: ${SUPABASE_SERVICE_KEY ? 'present' : 'missing'}`);

// NOW import the Hono app - after env vars are loaded
import app, { port } from './index.js';

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