export const TABLA_VIAJES = 'viajes';

export const COLUMNAS_VIAJE = [
  'id',
  'pasajero_id',
  'conductor_id',
  'origen_lat',
  'origen_lng',
  'origen_direccion',
  'destino_lat',
  'destino_lng',
  'destino_direccion',
  'estado',
  'precio_estimado',
  'precio_final',
  'distancia_km',
  'duracion_minutos',
  'calificacion_pasajero',
  'calificacion_conductor',
  'fecha_solicitud',
  'fecha_inicio',
  'fecha_fin',
  'created_at',
  'updated_at',
] as const;

export const VIAJE_SELECT = COLUMNAS_VIAJE.join(', ');
