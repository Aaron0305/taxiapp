import { NextRequest } from 'next/server';
import { verificarAuth } from '@/backend/guards/authGuard';
import type { Usuario } from '@/types/usuario';

/**
 * Middleware de autenticación para API routes.
 * Retorna el usuario autenticado o null si falla.
 */
export async function authMiddleware(
  req: NextRequest
): Promise<{ usuario: Usuario | null; error: string | null }> {
  try {
    const usuario = await verificarAuth(req);
    return { usuario, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de autenticación';
    return { usuario: null, error: message };
  }
}
