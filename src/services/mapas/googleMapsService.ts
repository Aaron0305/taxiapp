/**
 * Servicio de Google Maps (placeholder).
 * TODO: Integrar con Google Maps API / Mapbox.
 */

export interface DireccionResult {
  direccion: string;
  lat: number;
  lng: number;
}

// TODO: Implementar geocodificación real con API key
export async function geocodificar(_direccion: string): Promise<DireccionResult | null> {
  // Placeholder: devolver coordenadas de Ixtlahuaca centro
  return {
    direccion: 'Centro, Ixtlahuaca',
    lat: 19.5686,
    lng: -99.7677,
  };
}

export async function geocodificarInverso(_lat: number, _lng: number): Promise<string> {
  // Placeholder
  return 'Ixtlahuaca, Estado de México';
}
