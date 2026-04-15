import { obtenerConductoresDisponibles } from '@/backend/repositories/ConductorRepository';
import { calcularDistanciaKm } from '@/backend/utils/distancia';
import type { Conductor } from '@/types/conductor';

/**
 * Busca el conductor disponible más cercano a las coordenadas dadas.
 */
export async function buscarConductorCercano(
  lat: number,
  lng: number,
  radioMaxKm: number = 30
): Promise<Conductor | null> {
  const conductores = await obtenerConductoresDisponibles();

  if (conductores.length === 0) return null;

  let mejorConductor: Conductor | null = null;
  let menorDistancia = Infinity;

  for (const conductor of conductores) {
    if (conductor.ubicacion_lat == null || conductor.ubicacion_lng == null) continue;

    const distancia = calcularDistanciaKm(
      lat, lng,
      conductor.ubicacion_lat, conductor.ubicacion_lng
    );

    if (distancia <= radioMaxKm && distancia < menorDistancia) {
      menorDistancia = distancia;
      mejorConductor = conductor;
    }
  }

  return mejorConductor;
}
