export type EstadoViaje = 
  | 'solicitado' 
  | 'aceptado' 
  | 'en_camino' 
  | 'en_curso' 
  | 'completado' 
  | 'cancelado';

export interface Viaje {
  id: string;
  pasajero_id: string;
  conductor_id?: string;
  origen_lat: number;
  origen_lng: number;
  origen_direccion: string;
  destino_lat: number;
  destino_lng: number;
  destino_direccion: string;
  estado: EstadoViaje;
  precio_estimado: number;
  precio_final?: number;
  distancia_km?: number;
  duracion_minutos?: number;
  calificacion_pasajero?: number;
  calificacion_conductor?: number;
  fecha_solicitud: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  created_at: string;
  updated_at: string;
}

export interface SolicitudViaje {
  origen_lat: number;
  origen_lng: number;
  origen_direccion: string;
  destino_lat: number;
  destino_lng: number;
  destino_direccion: string;
}
