import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Usuario } from '@/types/usuario';

/**
 * Verifica el token JWT del header Authorization y devuelve el usuario.
 * Lanza error si no es válido.
 */
export async function verificarAuth(req: NextRequest): Promise<Usuario> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token de autorización requerido');
  }

  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Token inválido o expirado');
  }

  return {
    id: user.id,
    nombre: user.user_metadata?.nombre || '',
    email: user.email || '',
    telefono: user.user_metadata?.telefono || '',
    rol: user.user_metadata?.rol || 'pasajero',
    activo: true,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  };
}
