/**
 * Vet App REST API
 * 
 * Headless API for veterinary practice management
 * Enables service-to-service communication with API key authentication
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { auditMiddleware } from './middleware/audit.js';
import { errorHandler } from './middleware/error-handler.js';

import patientsRouter from './routes/patients.js';
import treatmentsRouter from './routes/treatments.js';
import medicationsRouter from './routes/medications.js';
import tamgRouter from './routes/tamg.js';
import transcribeRouter from './routes/transcribe.js';

const app = new Hono();

// ============================================
// Global Middleware
// ============================================

// Security headers
app.use('*', secureHeaders());

// CORS (configure for your domains)
app.use('*', cors({
  origin: ['https://vet-app.de', 'https://app.vet-app.de'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
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

// Error handler (must be before routes)
app.use('*', errorHandler());

// Audit logging
app.use('*', auditMiddleware());

// ============================================
// Health Check (no auth required)
// ============================================

app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', async (c) => {
  // Check database connection
  try {
    // TODO: Add actual DB health check
    return c.json({ status: 'ready' });
  } catch (error) {
    return c.json({ status: 'not_ready', error: 'Database unavailable' }, 503);
  }
});

// ============================================
// API Routes (v1)
// ============================================

const v1 = new Hono();

// Auth & rate limiting for all v1 routes
v1.use('*', authMiddleware());
v1.use('*', rateLimitMiddleware());

// Mount routers
v1.route('/patients', patientsRouter);
v1.route('/treatments', treatmentsRouter);
v1.route('/medications', medicationsRouter);
v1.route('/tamg', tamgRouter);
v1.route('/transcribe', transcribeRouter);

// OpenAPI spec
v1.get('/openapi.json', (c) => {
  // TODO: Generate and serve OpenAPI spec
  return c.json({ 
    openapi: '3.1.0',
    info: { title: 'Vet App API', version: '1.0.0' },
    paths: {}
  });
});

app.route('/v1', v1);

// ============================================
// 404 Handler
// ============================================

app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`
    },
    requestId: c.get('requestId'),
    timestamp: new Date().toISOString()
  }, 404);
});

// ============================================
// Start Server
// ============================================

const port = parseInt(process.env.PORT || '3001');

console.log(`🏥 Vet API starting on port ${port}`);
console.log(`📚 API docs: http://localhost:${port}/v1/docs`);
console.log(`🔍 Health: http://localhost:${port}/health`);

export default {
  port,
  fetch: app.fetch,
};