import { supabase } from '@/backend/config/database';
import type { User } from '@supabase/supabase-js';

const INVALID_REFRESH_PATTERNS = [
  'Invalid Refresh Token',
  'Refresh Token Not Found',
  'refresh_token_not_found',
  'Invalid JWT',
];

function esErrorDeRefreshToken(message?: string | null) {
  if (!message) return false;
  return INVALID_REFRESH_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function limpiarSesionCorruptaSiExiste(errorMessage?: string | null) {
  if (!esErrorDeRefreshToken(errorMessage)) return false;
  await supabase.auth.signOut({ scope: 'local' });
  return true;
}

export async function obtenerSesionSegura() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    await limpiarSesionCorruptaSiExiste(error.message);
    return { session: null, error };
  }

  return { session: data.session, error: null };
}

export async function obtenerUsuarioSeguro(): Promise<{ user: User | null }> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    await limpiarSesionCorruptaSiExiste(error.message);
    return { user: null };
  }

  return { user: data.user };
}
