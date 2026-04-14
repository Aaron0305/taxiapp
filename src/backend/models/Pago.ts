export const TABLA_PAGOS = 'pagos';

export const COLUMNAS_PAGO = [
  'id',
  'viaje_id',
  'pasajero_id',
  'conductor_id',
  'monto',
  'metodo',
  'estado',
  'referencia',
  'created_at',
  'updated_at',
] as const;

export const PAGO_SELECT = COLUMNAS_PAGO.join(', ');
