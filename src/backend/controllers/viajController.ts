import {
  crearViaje,
  obtenerViajePorId,
  obtenerViajesPorPasajero,
  obtenerViajesPorConductor,
  actualizarEstadoViaje,
} from '@/backend/repositories/ViajeRepository';
import { calcularPrecioEstimado } from '@/backend/utils/precio';
import { estimarRuta } from '@/backend/services/localizacionService';
import type { Viaje, SolicitudViaje } from '@/types/viaje';

export async function solicitarViaje(
  pasajeroId: string,
  solicitud: SolicitudViaje
): Promise<Viaje | null> {
  const ruta = estimarRuta(
    { lat: solicitud.origen_lat, lng: solicitud.origen_lng },
    { lat: solicitud.destino_lat, lng: solicitud.destino_lng }
  );

  const precioEstimado = calcularPrecioEstimado(ruta.distanciaKm, ruta.duracionMinutos);

  return crearViaje({
    pasajero_id: pasajeroId,
    ...solicitud,
    estado: 'solicitado',
    precio_estimado: precioEstimado,
    distancia_km: ruta.distanciaKm,
    duracion_minutos: ruta.duracionMinutos,
    fecha_solicitud: new Date().toISOString(),
  });
}

export async function obtenerViaje(id: string): Promise<Viaje | null> {
  return obtenerViajePorId(id);
}

export async function historialPasajero(pasajeroId: string): Promise<Viaje[]> {
  return obtenerViajesPorPasajero(pasajeroId);
}

export async function historialConductor(conductorId: string): Promise<Viaje[]> {
  return obtenerViajesPorConductor(conductorId);
}

export async function cancelarViaje(id: string): Promise<boolean> {
  return actualizarEstadoViaje(id, 'cancelado');
}
