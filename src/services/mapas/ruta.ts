export type PuntoRuta = [number, number];

export type RutaCalculada = {
  puntos: PuntoRuta[];
  distanciaKm: number;
  duracionMin: number;
  proveedor: 'osrm' | 'fallback';
};

export async function obtenerRutaConductor(
  origen: PuntoRuta,
  destino: PuntoRuta
): Promise<RutaCalculada | null> {
  try {
    const params = new URLSearchParams({
      oLat: String(origen[0]),
      oLng: String(origen[1]),
      dLat: String(destino[0]),
      dLng: String(destino[1]),
    });

    const response = await fetch(`/api/ruta?${params}`, {
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json() as Partial<RutaCalculada>;
    if (!Array.isArray(data.puntos) || data.puntos.length < 2) return null;

    return {
      puntos: data.puntos,
      distanciaKm: Number(data.distanciaKm || 0),
      duracionMin: Number(data.duracionMin || 0),
      proveedor: data.proveedor === 'osrm' ? 'osrm' : 'fallback',
    };
  } catch {
    return null;
  }
}
