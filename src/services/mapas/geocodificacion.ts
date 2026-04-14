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
    // Centrar búsqueda en Ixtlahuaca, Estado de México
    const params = new URLSearchParams({
      q: `${query}, Ixtlahuaca, México`,
      format: 'json',
      limit: '5',
      addressdetails: '1',
      viewbox: '-99.9,-99.6,19.4,19.7', // Bounding box de Ixtlahuaca
      bounded: '0',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'TaxiApp-Ixtlahuaca-App/1.1 (contact: admin@taxiapp.com)',
        },
      }
    );

    if (!response.ok) {
      console.warn('Respuesta de geocodificación no OK:', response.status);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: String(item.place_id),
      nombre: item.display_name.split(',')[0],
      direccion: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('Error crítico buscando dirección:', error);
    return [];
  }
}

// Geocodificación inversa — obtener dirección de unas coordenadas
export async function obtenerDireccion(lat: number, lng: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      zoom: '18',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'TaxiApp-Ixtlahuaca-App/1.1 (contact: admin@taxiapp.com)',
        },
      }
    );

    if (!response.ok) return 'Ubicación desconocida';

    const data = await response.json();
    return data.display_name || 'Ubicación desconocida';
  } catch {
    return 'Ubicación desconocida';
  }
}
