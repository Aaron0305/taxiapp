import { procesarPago, confirmarPago } from '@/backend/services/pagoService';
import { obtenerPagoPorViajeId } from '@/backend/repositories/PagoRepository';
import type { Pago, MetodoPago } from '@/types/pago';

export async function crearPagoViaje(
  viajeId: string,
  pasajeroId: string,
  conductorId: string,
  monto: number,
  metodo: MetodoPago
): Promise<Pago | null> {
  return procesarPago(viajeId, pasajeroId, conductorId, monto, metodo);
}

export async function consultarPagoViaje(viajeId: string): Promise<Pago | null> {
  return obtenerPagoPorViajeId(viajeId);
}

export async function confirmarPagoViaje(pagoId: string): Promise<boolean> {
  return confirmarPago(pagoId);
}
