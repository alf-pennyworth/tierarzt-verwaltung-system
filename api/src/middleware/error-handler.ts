/**
 * Error Handler Middleware
 * 
 * Centralized error handling with proper error responses
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ZodError } from 'zod';

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
  
  static badRequest(message: string, details?: Array<{ field: string; message: string }>) {
    return new ApiError('VALIDATION_ERROR', message, 400, details);
  }
  
  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError('AUTHENTICATION_ERROR', message, 401);
  }
  
  static forbidden(message: string = 'Forbidden') {
    return new ApiError('AUTHORIZATION_ERROR', message, 403);
  }
  
  static notFound(resource: string = 'Resource') {
    return new ApiError('RESOURCE_NOT_FOUND', `${resource} not found`, 404);
  }
  
  static conflict(message: string) {
    return new ApiError('CONFLICT', message, 409);
  }
  
  static tooManyRequests(retryAfter: number) {
    return new ApiError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429, undefined);
  }
  
  static internal(message: string = 'Internal server error') {
    return new ApiError('INTERNAL_ERROR', message, 500);
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
            message: error.message,
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
            message: 'Validation failed',
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
              message: 'A resource with this identifier already exists',
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
              message: 'Referenced resource does not exist',
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
        const message = process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message;
        
        return c.json({
          error: {
            code: 'INTERNAL_ERROR',
            message,
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
          message: 'An unexpected error occurred',
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
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    requestId,
    timestamp: new Date().toISOString(),
  }, 404);
}

