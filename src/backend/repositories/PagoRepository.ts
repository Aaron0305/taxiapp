import { supabaseServer as supabase } from '@/backend/config/databaseServer';
import { TABLA_PAGOS } from '@/backend/models/Pago';
import type { Pago } from '@/types/pago';

export async function crearPago(pago: Omit<Pago, 'id' | 'created_at' | 'updated_at'>): Promise<Pago | null> {
  const { data, error } = await supabase
    .from(TABLA_PAGOS)
    .insert(pago)
    .select()
    .single();

  if (error) return null;
  return data as Pago;
}

export async function obtenerPagoPorViajeId(viajeId: string): Promise<Pago | null> {
  const { data, error } = await supabase
    .from(TABLA_PAGOS)
    .select('*')
    .eq('viaje_id', viajeId)
    .single();

  if (error) return null;
  return data as Pago;
}

export async function actualizarEstadoPago(
  id: string,
  estado: Pago['estado']
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLA_PAGOS)
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}
