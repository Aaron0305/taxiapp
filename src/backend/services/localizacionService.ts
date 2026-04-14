import { calcularDistanciaKm } from '@/backend/utils/distancia';

export interface Coordenadas {
  lat: number;
  lng: number;
}

/**
 * Calcula la distancia y tiempo estimado entre dos puntos.
 */
export function estimarRuta(origen: Coordenadas, destino: Coordenadas) {
  const distanciaKm = calcularDistanciaKm(
    origen.lat, origen.lng,
    destino.lat, destino.lng
  );

  // Estimación de tiempo: velocidad promedio 30 km/h en zona urbana
  const duracionMinutos = Math.ceil((distanciaKm / 30) * 60);

  return {
    distanciaKm,
    duracionMinutos,
  };
}

/**
 * Verifica si una coordenada está dentro de la zona de operación (Ixtlahuaca).
 */
export function estaEnZonaOperacion(lat: number, lng: number): boolean {
  // Zona aproximada de Ixtlahuaca, Estado de México
  const ZONA = {
    latMin: 19.50,
    latMax: 19.62,
    lngMin: -99.82,
    lngMax: -99.70,
  };

  return (
    lat >= ZONA.latMin &&
    lat <= ZONA.latMax &&
    lng >= ZONA.lngMin &&
    lng <= ZONA.lngMax
  );
}
