/**
 * Error Handler Middleware
 * 
 * Centralized error handling with proper error responses
 * German messages for user-facing errors, English codes for debugging
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ZodError } from 'zod';

/**
 * German error messages for user-facing errors
 */
const ERROR_MESSAGES_DE = {
  VALIDATION_ERROR: 'Die eingegebenen Daten sind ungültig',
  AUTHENTICATION_ERROR: 'Sie sind nicht angemeldet',
  AUTHORIZATION_ERROR: 'Sie haben keine Berechtigung für diese Aktion',
  RESOURCE_NOT_FOUND: 'Die angeforderte Ressource wurde nicht gefunden',
  NOT_FOUND: 'Die angeforderte Ressource wurde nicht gefunden',
  CONFLICT: 'Ein Konflikt ist aufgetreten',
  RATE_LIMIT_EXCEEDED: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut',
  INTERNAL_ERROR: 'Ein unerwarteter Fehler ist aufgetreten',
} as const;

/**
 * API Error class with German user messages
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Array<{ field: string; message: string }>,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.userMessage = userMessage || ERROR_MESSAGES_DE[code as keyof typeof ERROR_MESSAGES_DE] || message;
  }
  
  static badRequest(message: string, details?: Array<{ field: string; message: string }>, userMessage?: string) {
    return new ApiError('VALIDATION_ERROR', message, 400, details, userMessage);
  }
  
  static unauthorized(message: string = 'Unauthorized', userMessage?: string) {
    return new ApiError('AUTHENTICATION_ERROR', message, 401, undefined, userMessage);
  }
  
  static forbidden(message: string = 'Forbidden', userMessage?: string) {
    return new ApiError('AUTHORIZATION_ERROR', message, 403, undefined, userMessage);
  }
  
  static notFound(resource: string = 'Resource', userMessage?: string) {
    const defaultUserMessage = resource === 'Resource' 
      ? ERROR_MESSAGES_DE.RESOURCE_NOT_FOUND
      : `${resource} wurde nicht gefunden`;
    return new ApiError('RESOURCE_NOT_FOUND', `${resource} not found`, 404, undefined, userMessage || defaultUserMessage);
  }
  
  static conflict(message: string, userMessage?: string) {
    return new ApiError('CONFLICT', message, 409, undefined, userMessage);
  }
  
  static tooManyRequests(retryAfter: number) {
    return new ApiError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429, undefined, ERROR_MESSAGES_DE.RATE_LIMIT_EXCEEDED);
  }
  
  static internal(message: string = 'Internal server error', userMessage?: string) {
    return new ApiError('INTERNAL_ERROR', message, 500, undefined, userMessage);
  }
}

/**
 * Error handler middleware
 */
export function errorHandler() {
  return createMiddleware(async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId') || crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      // Handle known error types
      if (error instanceof ApiError) {
        return c.json({
          error: {
            code: error.code,
            message: error.userMessage || error.message,
            debugMessage: process.env.NODE_ENV !== 'production' ? error.message : undefined,
            details: error.details,
          },
          requestId,
          timestamp,
        }, error.statusCode);
      }
      
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const details = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        
        return c.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: ERROR_MESSAGES_DE.VALIDATION_ERROR,
            debugMessage: 'Validation failed',
            details,
          },
          requestId,
          timestamp,
        }, 400);
      }
      
      // Handle database errors
      if (error instanceof Error) {
        // Check for common database error codes
        const dbError = error as any;
        
        // PostgreSQL unique constraint violation
        if (dbError.code === '23505') {
          return c.json({
            error: {
              code: 'CONFLICT',
              message: 'Ein Datensatz mit dieser Kennung existiert bereits',
              debugMessage: 'Unique constraint violation',
            },
            requestId,
            timestamp,
          }, 409);
        }
        
        // PostgreSQL foreign key constraint violation
        if (dbError.code === '23503') {
          return c.json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Die referenzierte Ressource existiert nicht',
              debugMessage: 'Foreign key constraint violation',
            },
            requestId,
            timestamp,
          }, 400);
        }
        
        // Log unexpected errors
        console.error('[ERROR]', {
          requestId,
          error: error.message,
          stack: error.stack,
          path: c.req.path,
          method: c.req.method,
        });
        
        // Return generic error in production
        const userMessage = ERROR_MESSAGES_DE.INTERNAL_ERROR;
        const debugMessage = process.env.NODE_ENV === 'production'
          ? undefined
          : error.message;
        
        return c.json({
          error: {
            code: 'INTERNAL_ERROR',
            message: userMessage,
            debugMessage,
          },
          requestId,
          timestamp,
        }, 500);
      }
      
      // Unknown error type
      console.error('[ERROR]', {
        requestId,
        error: String(error),
        path: c.req.path,
        method: c.req.method,
      });
      
      return c.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: ERROR_MESSAGES_DE.INTERNAL_ERROR,
        },
        requestId,
        timestamp,
      }, 500);
    }
  });
}

/**
 * Not found handler (for routes)
 */
export function notFoundHandler(c: Context) {
  const requestId = c.get('requestId') || crypto.randomUUID();
  
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: ERROR_MESSAGES_DE.NOT_FOUND,
      debugMessage: `Route ${c.req.method} ${c.req.path} not found`,
    },
    requestId,
    timestamp: new Date().toISOString(),
  }, 404);
}

