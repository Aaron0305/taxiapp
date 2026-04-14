// Constantes globales de la aplicación
export const APP_NAME = 'TaxiApp Ixtlahuaca';
export const APP_VERSION = '0.1.0';

export const RUTAS = {
  LOGIN: '/auth/login',
  REGISTRO: '/auth/registro',
  PASAJERO: '/pasajero',
  CONDUCTOR: '/conductor',
  ADMIN: '/admin',
} as const;

export const LIMITES = {
  MAX_RADIO_BUSQUEDA_KM: 10,
  TIMEOUT_SOLICITUD_SEGUNDOS: 30,
  MAX_HISTORIAL_VIAJES: 50,
} as const;
