// ============================================================
// SERVICIO DE GEOCODIFICACIÓN — Nominatim (OpenStreetMap) GRATIS
// ============================================================

export interface ResultadoBusqueda {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
}

// Buscar direcciones por texto (Nominatim API — gratis, sin key)
export async function buscarDireccion(query: string): Promise<ResultadoBusqueda[]> {
  if (!query || query.trim().length < 3) return [];

  try {
    const params = new URLSearchParams({ q: query.trim(), mode: 'search' });
    const response = await fetch(`/api/geocodificacion?${params}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('Respuesta de geocodificación no OK:', response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data?.resultados) ? data.resultados : [];
  } catch (error) {
    console.error('Error crítico buscando dirección:', error);
    return [];
  }
}

// Geocodificación inversa — obtener dirección de unas coordenadas
export async function obtenerDireccion(lat: number, lng: number): Promise<string> {
  const fallback = `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;

  try {
    const params = new URLSearchParams({
      mode: 'reverse',
      lat: String(lat),
      lng: String(lng),
    });

    const response = await fetch(`/api/geocodificacion?${params}`, {
      cache: 'no-store',
    });

    if (!response.ok) return fallback;

    const data = await response.json();
    return data?.direccion || fallback;
  } catch {
    return fallback;
  }
}
