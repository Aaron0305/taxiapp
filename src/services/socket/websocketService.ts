import { supabase } from '@/backend/config/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Servicio WebSocket usando Supabase Realtime.
 */

let canal: RealtimeChannel | null = null;

export function suscribirseACanalViaje(
  viajeId: string,
  onUpdate: (payload: unknown) => void
): RealtimeChannel {
  canal = supabase
    .channel(`viaje-${viajeId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'viajes',
      filter: `id=eq.${viajeId}`,
    }, (payload) => {
      onUpdate(payload.new);
    })
    .subscribe();

  return canal;
}

export function suscribirseAUbicacionConductor(
  conductorId: string,
  onUpdate: (payload: unknown) => void
): RealtimeChannel {
  canal = supabase
    .channel(`gps-${conductorId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'conductores',
      filter: `id=eq.${conductorId}`,
    }, (payload) => {
      onUpdate(payload.new);
    })
    .subscribe();

  return canal;
}

export function desuscribirse(): void {
  if (canal) {
    supabase.removeChannel(canal);
    canal = null;
  }
}
