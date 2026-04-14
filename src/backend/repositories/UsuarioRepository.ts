import { supabaseServer as supabase } from '@/backend/config/databaseServer';
import { TABLA_USUARIOS } from '@/backend/models/Usuario';
import type { Usuario } from '@/types/usuario';

export async function obtenerUsuarioPorId(id: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from(TABLA_USUARIOS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Usuario;
}

export async function obtenerUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from(TABLA_USUARIOS)
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data as Usuario[];
}

export async function actualizarUsuario(
  id: string,
  datos: Partial<Usuario>
): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from(TABLA_USUARIOS)
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data as Usuario;
}
