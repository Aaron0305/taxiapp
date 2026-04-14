export type EstadoConductor = 'disponible' | 'ocupado' | 'desconectado';

export interface Conductor {
  id: string;
  usuario_id: string;
  numero_licencia: string;
  placa_vehiculo: string;
  modelo_vehiculo: string;
  color_vehiculo: string;
  calificacion_promedio: number;
  total_viajes: number;
  estado: EstadoConductor;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConductorConUsuario extends Conductor {
  nombre: string;
  telefono: string;
  avatar_url?: string;
}
