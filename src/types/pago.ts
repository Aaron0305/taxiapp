export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoPago = 'pendiente' | 'completado' | 'fallido' | 'reembolsado';

export interface Pago {
  id: string;
  viaje_id: string;
  pasajero_id: string;
  conductor_id: string;
  monto: number;
  metodo: MetodoPago;
  estado: EstadoPago;
  referencia?: string;
  created_at: string;
  updated_at: string;
}
