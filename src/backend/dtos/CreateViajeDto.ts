export interface CreateViajeDto {
  origen_lat: number;
  origen_lng: number;
  origen_direccion: string;
  destino_lat: number;
  destino_lng: number;
  destino_direccion: string;
}

export function validarCreateViaje(data: unknown): { valido: boolean; errores: Record<string, string> } {
  const errores: Record<string, string> = {};
  const d = data as Record<string, unknown>;

  if (typeof d.origen_lat !== 'number') errores.origen_lat = 'Latitud de origen requerida.';
  if (typeof d.origen_lng !== 'number') errores.origen_lng = 'Longitud de origen requerida.';
  if (!d.origen_direccion) errores.origen_direccion = 'Dirección de origen requerida.';
  if (typeof d.destino_lat !== 'number') errores.destino_lat = 'Latitud de destino requerida.';
  if (typeof d.destino_lng !== 'number') errores.destino_lng = 'Longitud de destino requerida.';
  if (!d.destino_direccion) errores.destino_direccion = 'Dirección de destino requerida.';

  return { valido: Object.keys(errores).length === 0, errores };
}
