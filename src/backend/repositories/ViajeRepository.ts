import { supabaseServer as supabase } from '@/backend/config/databaseServer';
import { TABLA_VIAJES } from '@/backend/models/Viaje';
import type { Viaje } from '@/types/viaje';

export async function crearViaje(viaje: Omit<Viaje, 'id' | 'created_at' | 'updated_at'>): Promise<Viaje | null> {
  const { data, error } = await supabase
    .from(TABLA_VIAJES)
    .insert(viaje)
    .select()
    .single();

  if (error) return null;
  return data as Viaje;
}

export async function obtenerViajePorId(id: string): Promise<Viaje | null> {
  const { data, error } = await supabase
    .from(TABLA_VIAJES)
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Viaje;
}

export async function obtenerViajesPorPasajero(pasajeroId: string): Promise<Viaje[]> {
  const { data, error } = await supabase
    .from(TABLA_VIAJES)
    .select('*')
    .eq('pasajero_id', pasajeroId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data as Viaje[];
}

export async function obtenerViajesPorConductor(conductorId: string): Promise<Viaje[]> {
  const { data, error } = await supabase
    .from(TABLA_VIAJES)
    .select('*')
    .eq('conductor_id', conductorId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data as Viaje[];
}

export async function actualizarEstadoViaje(
  id: string,
  estado: Viaje['estado']
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLA_VIAJES)
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}
