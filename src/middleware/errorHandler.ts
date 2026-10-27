import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data.',
        details: formattedErrors,
      },
    });
    return;
  }

  // Handle JSON parse errors from express.json()
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.',
      },
    });
    return;
  }

  // Handle SQLite specific constraint errors if unhandled by service
  if (err && typeof err === 'object' && 'code' in err) {
    const sqliteErr = err as { code: string; message: string };
    if (sqliteErr.code === 'SQLITE_CONSTRAINT_UNIQUE' || sqliteErr.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({
        status: 'error',
        error: {
          code: 'DUPLICATE_REFERENCE_ID',
          message: 'A record with this reference identifier already exists for this account.',
        },
      });
      return;
    }
    if (sqliteErr.code === 'SQLITE_CONSTRAINT_CHECK' || sqliteErr.message?.includes('CHECK constraint failed')) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'DATA_INTEGRITY_VIOLATION',
          message: 'Operation violated data integrity constraints (e.g. negative balance or invalid amount).',
        },
      });
      return;
    }
  }

  // Unexpected fallback
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
    },
  });
}
