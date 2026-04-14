export interface CreatePagoDto {
  viaje_id: string;
  monto: number;
  metodo: 'efectivo' | 'tarjeta' | 'transferencia';
}

export function validarCreatePago(data: unknown): { valido: boolean; errores: Record<string, string> } {
  const errores: Record<string, string> = {};
  const d = data as Record<string, unknown>;

  if (!d.viaje_id || typeof d.viaje_id !== 'string') {
    errores.viaje_id = 'ID del viaje requerido.';
  }
  if (typeof d.monto !== 'number' || d.monto <= 0) {
    errores.monto = 'El monto debe ser un número mayor a 0.';
  }
  if (!d.metodo || !['efectivo', 'tarjeta', 'transferencia'].includes(d.metodo as string)) {
    errores.metodo = 'Método de pago inválido.';
  }

  return { valido: Object.keys(errores).length === 0, errores };
}
