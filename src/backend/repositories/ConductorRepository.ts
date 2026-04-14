import { supabaseServer as supabase } from '@/backend/config/databaseServer';
import { TABLA_CONDUCTORES } from '@/backend/models/Conductor';
import type { Conductor } from '@/types/conductor';

export async function obtenerConductorPorId(id: string): Promise<Conductor | null> {
  const { data, error } = await supabase
    .from(TABLA_CONDUCTORES)
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Conductor;
}

export async function obtenerConductorPorUsuarioId(usuarioId: string): Promise<Conductor | null> {
  const { data, error } = await supabase
    .from(TABLA_CONDUCTORES)
    .select('*')
    .eq('usuario_id', usuarioId)
    .single();

  if (error) return null;
  return data as Conductor;
}

export async function obtenerConductoresDisponibles(): Promise<Conductor[]> {
  const { data, error } = await supabase
    .from(TABLA_CONDUCTORES)
    .select('*')
    .eq('estado', 'disponible')
    .eq('activo', true);

  if (error) return [];
  return data as Conductor[];
}

export async function actualizarEstadoConductor(
  id: string,
  estado: Conductor['estado']
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLA_CONDUCTORES)
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}

export async function actualizarUbicacionConductor(
  id: string,
  lat: number,
  lng: number
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLA_CONDUCTORES)
    .update({
      ubicacion_lat: lat,
      ubicacion_lng: lng,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return !error;
}
