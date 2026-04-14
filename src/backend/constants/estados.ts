export const ESTADOS_VIAJE = {
  SOLICITADO: 'solicitado',
  ACEPTADO: 'aceptado',
  EN_CAMINO: 'en_camino',
  EN_CURSO: 'en_curso',
  COMPLETADO: 'completado',
  CANCELADO: 'cancelado',
} as const;

export const ESTADOS_CONDUCTOR = {
  DISPONIBLE: 'disponible',
  OCUPADO: 'ocupado',
  DESCONECTADO: 'desconectado',
} as const;

export const ESTADOS_PAGO = {
  PENDIENTE: 'pendiente',
  COMPLETADO: 'completado',
  FALLIDO: 'fallido',
  REEMBOLSADO: 'reembolsado',
} as const;
