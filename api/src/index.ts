/**
 * Vet App REST API
 * 
 * Headless API for veterinary practice management
 * Enables service-to-service communication with API key authentication
 * 
 * ENDPOINTS:
 * - GET  /health                    - Health check
 * - GET  /api-keys                  - List API keys
 * - POST /api-keys                  - Create API key
 * - GET  /patients                  - List patients
 * - POST /patients                  - Create patient
 * - GET  /treatments                - List treatments
 * - POST /treatments                - Create treatment
 * - GET  /tamg/prescriptions        - List antibiotic prescriptions
 * - POST /tamg/prescriptions        - Create prescription
 * - GET  /tamg/export               - BVL CSV export
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { createClient } from '@supabase/supabase-js';

import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';

import apiKeysRouter from './routes/api-keys.js';
import patientsRouter from './routes/patients.js';
import treatmentsRouter from './routes/treatments.js';
import tamgRouter from './routes/tamg.js';
import aiRouter from './routes/ai.js';
import { addPortalRoute } from './portal.js';

const app = new Hono();

// ============================================
// Environment
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// ============================================
// Global Middleware
// ============================================

// Security headers
app.use('*', secureHeaders());

// CORS
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3001',
      'https://vet-app.de',
      'https://app.vet-app.de',
    ];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type', 'X-Api-Key', 'X-Request-Id'],
  exposeHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
  credentials: true,
}));

// Request logging
app.use('*', logger());

// Pretty JSON in development
if (process.env.NODE_ENV !== 'production') {
  app.use('*', prettyJSON());
}

// ============================================
// Supabase Context Middleware
// ============================================
app.use('*', async (c, next) => {
  // Create Supabase client for this request
  const supabase = createClient(
    SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY || 'placeholder-key',
    { auth: { persistSession: false } }
  );
  
  c.set('supabase', supabase);
  await next();
});

// Error handler (must be before routes)
app.use('*', errorHandler());

// ============================================
// Health Check (no auth required)
// ============================================
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: [
      'GET  /health',
      'GET  /api-keys',
      'POST /api-keys',
      'GET  /patients',
      'POST /patients',
      'GET  /treatments',
      'POST /treatments',
      'GET  /tamg/prescriptions',
      'POST /tamg/prescriptions',
      'GET  /tamg/export',
      'GET  /tamg/antibiotics',
      'POST /transcribe',
      'POST /extract',
      'POST /soap',
    ],
  });
});

// ============================================
// API Documentation (OpenAPI)
// ============================================
app.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'Vet App API',
      version: '1.0.0',
      description: 'Headless API for veterinary practice management',
    },
    servers: [{ url: '/api' }],
    paths: {
      '/health': { get: { summary: 'Health check' } },
      '/patients': { get: { summary: 'List patients' }, post: { summary: 'Create patient' } },
      '/treatments': { get: { summary: 'List treatments' }, post: { summary: 'Create treatment' } },
      '/tamg/prescriptions': { get: { summary: 'List antibiotic prescriptions' }, post: { summary: 'Create prescription' } },
      '/tamg/export': { get: { summary: 'BVL CSV export' } },
    },
  });
});

// ============================================
// Auth & Rate Limiting (for protected routes)
// ============================================
app.use('/api-keys/*', authMiddleware(), rateLimitMiddleware);
app.use('/patients/*', authMiddleware(), rateLimitMiddleware);
app.use('/treatments/*', authMiddleware(), rateLimitMiddleware);
app.use('/tamg/*', authMiddleware(), rateLimitMiddleware);
app.use('/transcribe/*', authMiddleware(), rateLimitMiddleware);
app.use('/extract/*', authMiddleware(), rateLimitMiddleware);
app.use('/soap/*', authMiddleware(), rateLimitMiddleware);

// ============================================
// Routes
// ============================================
app.route('/api-keys', apiKeysRouter);
app.route('/patients', patientsRouter);
app.route('/treatments', treatmentsRouter);
app.route('/tamg', tamgRouter);
app.route('/', aiRouter);

// Portal page
addPortalRoute(app);

// 404 Handler
// ============================================
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// ============================================
// Start Server
// ============================================
const port = parseInt(process.env.API_PORT || '3001');

console.log(`🚀 Vet API starting on port ${port}`);
console.log(`📚 Health check: http://localhost:${port}/health`);
console.log(`📖 OpenAPI spec: http://localhost:${port}/openapi.json`);

export default {
  port,
  fetch: app.fetch,
};