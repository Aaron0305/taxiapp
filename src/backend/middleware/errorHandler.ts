import { NextResponse } from 'next/server';
import { HttpException } from '@/backend/exceptions/HttpException';
import { logger } from '@/backend/logger/logger';

/**
 * Maneja errores de API routes y devuelve respuestas consistentes.
 */
export function manejarError(error: unknown): NextResponse {
  if (error instanceof HttpException) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  const message = error instanceof Error ? error.message : 'Error interno del servidor';
  logger.error('Error no controlado en API', { error: message });

  return NextResponse.json(
    { error: 'Error interno del servidor' },
    { status: 500 }
  );
}
