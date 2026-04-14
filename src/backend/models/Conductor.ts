export const TABLA_CONDUCTORES = 'conductores';

export const COLUMNAS_CONDUCTOR = [
  'id',
  'usuario_id',
  'numero_licencia',
  'placa_vehiculo',
  'modelo_vehiculo',
  'color_vehiculo',
  'calificacion_promedio',
  'total_viajes',
  'estado',
  'ubicacion_lat',
  'ubicacion_lng',
  'activo',
  'created_at',
  'updated_at',
] as const;

export const CONDUCTOR_SELECT = COLUMNAS_CONDUCTOR.join(', ');
