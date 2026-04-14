/**
 * Configuración de tarifas para el sistema de taxi de Ixtlahuaca.
 */
const TARIFA_BASE = 25; // MXN
const TARIFA_POR_KM = 12; // MXN por km
const TARIFA_POR_MINUTO = 2.5; // MXN por minuto
const TARIFA_MINIMA = 35; // MXN

/**
 * Calcula el precio estimado de un viaje.
 */
export function calcularPrecioEstimado(
  distanciaKm: number,
  duracionMinutos: number = 0
): number {
  const precioDistancia = TARIFA_BASE + distanciaKm * TARIFA_POR_KM;
  const precioTiempo = duracionMinutos * TARIFA_POR_MINUTO;
  const precioTotal = precioDistancia + precioTiempo;

  return Math.max(precioTotal, TARIFA_MINIMA);
}

/**
 * Formatea un precio como moneda mexicana.
 */
export function formatearPrecioMXN(precio: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(precio);
}
