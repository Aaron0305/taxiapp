import { logger } from '@/backend/logger/logger';

/**
 * Handler para actualizaciones GPS en tiempo real (via WebSocket/Realtime).
 * TODO: Conectar con Supabase Realtime channels.
 */
export interface GpsUpdate {
  conductorId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export function procesarActualizacionGps(update: GpsUpdate): void {
  logger.debug('GPS update recibido', {
    conductorId: update.conductorId,
    lat: update.lat,
    lng: update.lng,
  });

  // TODO: Actualizar ubicación en la base de datos
  // TODO: Broadcast a pasajeros que estén esperando a este conductor
}

export function validarGpsData(data: unknown): data is GpsUpdate {
  const d = data as Record<string, unknown>;
  return (
    typeof d.conductorId === 'string' &&
    typeof d.lat === 'number' &&
    typeof d.lng === 'number' &&
    typeof d.timestamp === 'string'
  );
}
