import { crearPago, actualizarEstadoPago } from '@/backend/repositories/PagoRepository';
import { logger } from '@/backend/logger/logger';
import type { Pago, MetodoPago } from '@/types/pago';

/**
 * Procesa un pago para un viaje completado.
 */
export async function procesarPago(
  viajeId: string,
  pasajeroId: string,
  conductorId: string,
  monto: number,
  metodo: MetodoPago
): Promise<Pago | null> {
  const pago = await crearPago({
    viaje_id: viajeId,
    pasajero_id: pasajeroId,
    conductor_id: conductorId,
    monto,
    metodo,
    estado: metodo === 'efectivo' ? 'completado' : 'pendiente',
  });

  if (!pago) {
    logger.error('Error al crear pago', { viajeId, monto });
    return null;
  }

  logger.info('Pago creado', { pagoId: pago.id, metodo, monto });
  return pago;
}

/**
 * Confirma un pago pendiente (para pagos con tarjeta/transferencia).
 */
export async function confirmarPago(pagoId: string): Promise<boolean> {
  const resultado = await actualizarEstadoPago(pagoId, 'completado');
  if (resultado) {
    logger.info('Pago confirmado', { pagoId });
  }
  return resultado;
}
