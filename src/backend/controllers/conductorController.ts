import {
  obtenerConductorPorId,
  obtenerConductoresDisponibles,
  actualizarEstadoConductor,
  actualizarUbicacionConductor,
} from '@/backend/repositories/ConductorRepository';
import type { Conductor, EstadoConductor } from '@/types/conductor';

export async function listarConductoresDisponibles(): Promise<Conductor[]> {
  return obtenerConductoresDisponibles();
}

export async function obtenerConductor(id: string): Promise<Conductor | null> {
  return obtenerConductorPorId(id);
}

export async function cambiarEstadoConductor(id: string, estado: EstadoConductor): Promise<boolean> {
  return actualizarEstadoConductor(id, estado);
}

export async function registrarUbicacion(id: string, lat: number, lng: number): Promise<boolean> {
  return actualizarUbicacionConductor(id, lat, lng);
}
