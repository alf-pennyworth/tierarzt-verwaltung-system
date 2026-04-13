/**
 * Audit Logging Middleware
 * 
 * Logs all API requests for compliance and debugging
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

interface AuditLog {
  id: string;
  apiKeyId?: string;
  praxisId?: string;
  requestId: string;
  method: string;
  path: string;
  queryParams?: Record<string, string>;
  requestBody?: unknown;
  responseStatus: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// In-memory audit log buffer (use proper database in production)
const auditBuffer: AuditLog[] = [];

// Flush audit logs to database periodically
const FLUSH_INTERVAL = 5000; // 5 seconds
const BUFFER_SIZE = 100;

setInterval(async () => {
  if (auditBuffer.length > 0) {
    await flushAuditLogs();
  }
}, FLUSH_INTERVAL);

async function flushAuditLogs() {
  const logs = auditBuffer.splice(0, auditBuffer.length);
  
  // TODO: Insert into database
  // await db.insert(auditLogs).values(logs);
  
  // For development, log to console
  if (process.env.NODE_ENV !== 'production') {
    for (const log of logs) {
      console.log('[AUDIT]', JSON.stringify({
        requestId: log.requestId,
        method: log.method,
        path: log.path,
        status: log.responseStatus,
        timeMs: log.responseTimeMs,
        praxisId: log.praxisId,
      }));
    }
  }
}

/**
 * Fields to redact from request body logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'api_key',
  'apiKey',
  'authorization',
  'credit_card',
  'ssn',
];

/**
 * Redact sensitive fields from object
 */
function redactSensitiveFields(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveFields);
  }
  
  const redacted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveFields(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Audit logging middleware
 */
export function auditMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    const startTime = Date.now();
    const requestId = c.get('requestId') || crypto.randomUUID();
    
    // Capture request info
    const apiKey = c.get('apiKey');
    const praxisId = c.get('praxisId');
    
    let requestBody: unknown = undefined;
    
    // Only log request body for non-GET requests
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      try {
        const contentType = c.req.header('Content-Type') || '';
        if (contentType.includes('application/json')) {
          const body = await c.req.json();
          requestBody = redactSensitiveFields(body);
          // Re-parse body for downstream handlers
          c.req.raw = new Request(c.req.url, {
            ...c.req.raw,
            body: JSON.stringify(body),
            headers: c.req.raw.headers,
          });
        }
      } catch {
        // Body not parseable, skip
      }
    }
    
    // Parse query params
    const queryParams: Record<string, string> = {};
    const url = new URL(c.req.url);
    for (const [key, value] of url.searchParams.entries()) {
      queryParams[key] = value;
    }
    
    // Execute request
    await next();
    
    const responseTimeMs = Date.now() - startTime;
    
    // Create audit log
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      apiKeyId: apiKey?.id,
      praxisId: praxisId,
      requestId,
      method: c.req.method,
      path: c.req.path,
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      requestBody,
      responseStatus: c.res.status,
      responseTimeMs,
      ipAddress: c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 
                 c.req.header('X-Real-IP') ||
                 'unknown',
      userAgent: c.req.header('User-Agent'),
      createdAt: new Date(),
    };
    
    // Add to buffer
    auditBuffer.push(auditLog);
    
    // Flush if buffer is full
    if (auditBuffer.length >= BUFFER_SIZE) {
      // Non-blocking flush
      flushAuditLogs().catch(console.error);
    }
    
    // Add request ID to response headers
    c.header('X-Request-Id', requestId);
  });
}

/**
 * Get audit logs for a praxis (admin endpoint)
 */
export async function getAuditLogs(praxisId: string, options?: {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<{ data: AuditLog[]; total: number }> {
  // TODO: Query from database
  // const logs = await db.query.auditLogs.findMany({
  //   where: and(
  //     eq(auditLogs.praxisId, praxisId),
  //     gte(auditLogs.createdAt, options?.startDate),
  //     lte(auditLogs.createdAt, options?.endDate),
  //   ),
  //   limit: options?.limit || 50,
  //   offset: ((options?.page || 1) - 1) * (options?.limit || 50),
  //   orderBy: desc(auditLogs.createdAt),
  // });
  
  return {
    data: [],
    total: 0,
  };
}

export type { AuditLog };