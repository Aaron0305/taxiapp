import { apiClient } from './client';
import type { Viaje, SolicitudViaje } from '@/types/viaje';

export async function solicitarViaje(pasajeroId: string, solicitud: SolicitudViaje) {
  return apiClient.post<Viaje>('/viajes', { pasajero_id: pasajeroId, ...solicitud });
}

export async function obtenerViaje(id: string) {
  return apiClient.get<Viaje>(`/viajes?id=${id}`);
}

export async function obtenerHistorial(pasajeroId: string) {
  return apiClient.get<Viaje[]>(`/viajes?pasajero_id=${pasajeroId}`);
}

export async function cancelarViaje(id: string) {
  return apiClient.delete<{ mensaje: string }>(`/viajes?id=${id}`);
}
