import { supabase } from '@/backend/config/database';

// ============================================================
// SERVICIO DE VIAJES — Toda la lógica de negocio con Supabase
// ============================================================

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface ViajeDB {
  id: string;
  pasajero_id: string;
  conductor_id: string | null;
  estado: 'solicitado' | 'aceptado' | 'en_curso' | 'completado' | 'cancelado';
  origen_direccion: string | null;
  destino_direccion: string | null;
  origen_lat: number | null;
  origen_lng: number | null;
  destino_lat: number | null;
  destino_lng: number | null;
  precio_estimado: number | null;
  precio_final: number | null;
  creado_en: string;
  iniciado_en: string | null;
  finalizado_en: string | null;
}

// --- Crear viaje (pasajero solicita) ---
export async function crearViaje(params: {
  pasajero_id: string;
  origen: Coordenada;
  origen_direccion: string;
  destino: Coordenada;
  destino_direccion: string;
  precio_estimado: number;
}) {
  const { data, error } = await supabase
    .from('viajes')
    .insert({
      pasajero_id: params.pasajero_id,
      estado: 'solicitado',
      origen_direccion: params.origen_direccion,
      destino_direccion: params.destino_direccion,
      origen_lat: params.origen.lat,
      origen_lng: params.origen.lng,
      destino_lat: params.destino.lat,
      destino_lng: params.destino.lng,
      // Usar formato GeoJSON para columnas PostGIS
      origen: { type: 'Point', coordinates: [params.origen.lng, params.origen.lat] },
      destino: { type: 'Point', coordinates: [params.destino.lng, params.destino.lat] },
      precio_estimado: params.precio_estimado,
    })
    .select()
    .single();

  return { data, error };
}

// --- Aceptar viaje (conductor) ---
export async function aceptarViaje(viajeId: string, conductorId: string) {
  const { data, error } = await supabase
    .from('viajes')
    .update({
      conductor_id: conductorId,
    })
    .eq('id', viajeId)
    .eq('estado', 'solicitado')
    .is('conductor_id', null)
    .select()
    .single();

  return { data, error };
}

// --- Confirmación del pasajero después de que conductor toma viaje ---
export async function confirmarConductorPorPasajero(viajeId: string, pasajeroId: string) {
  const { data, error } = await supabase
    .from('viajes')
    .update({
      estado: 'aceptado',
      // Marca de confirmacion del pasajero (luego se sobreescribe al iniciar el viaje real)
      iniciado_en: new Date().toISOString(),
    })
    .eq('id', viajeId)
    .eq('pasajero_id', pasajeroId)
    .in('estado', ['solicitado', 'aceptado'])
    .not('conductor_id', 'is', null)
    .select()
    .single();

  return { data, error };
}

// --- Pasajero rechaza conductor asignado y vuelve a buscar ---
export async function rechazarConductorPorPasajero(viajeId: string, pasajeroId: string) {
  const { data, error } = await supabase
    .from('viajes')
    .update({
      conductor_id: null,
      estado: 'solicitado',
      iniciado_en: null,
    })
    .eq('id', viajeId)
    .eq('pasajero_id', pasajeroId)
    .in('estado', ['solicitado', 'aceptado'])
    .select()
    .single();

  return { data, error };
}

// --- Iniciar viaje (conductor recogió al pasajero) ---
export async function iniciarViaje(viajeId: string) {
  const { data, error } = await supabase
    .from('viajes')
    .update({ estado: 'en_curso', iniciado_en: new Date().toISOString() })
    .eq('id', viajeId)
    .eq('estado', 'aceptado')
    .not('iniciado_en', 'is', null)
    .select()
    .single();

  return { data, error };
}

// --- Completar viaje ---
export async function completarViaje(viajeId: string, precioFinal: number) {
  const { data, error } = await supabase
    .from('viajes')
    .update({
      estado: 'completado',
      precio_final: precioFinal,
      finalizado_en: new Date().toISOString(),
    })
    .eq('id', viajeId)
    .select()
    .single();

  return { data, error };
}

// --- Cancelar viaje ---
export async function cancelarViaje(viajeId: string) {
  const { data, error } = await supabase
    .from('viajes')
    .update({ estado: 'cancelado' })
    .eq('id', viajeId)
    .select()
    .single();

  return { data, error };
}

// --- Obtener viajes solicitados (para conductores) ---
export async function obtenerViajesSolicitados() {
  const { data, error } = await supabase
    .from('viajes')
    .select('*')
    .eq('estado', 'solicitado')
    .is('conductor_id', null)
    .order('creado_en', { ascending: false })
    .limit(10);

  return { data, error };
}

// --- Obtener viaje activo del pasajero ---
export async function obtenerViajeActivoPasajero(pasajeroId: string) {
  const { data, error } = await supabase
    .from('viajes')
    .select('*')
    .eq('pasajero_id', pasajeroId)
    .in('estado', ['solicitado', 'aceptado', 'en_curso'])
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

// --- Obtener viaje activo del conductor ---
export async function obtenerViajeActivoConductor(conductorId: string) {
  const { data, error } = await supabase
    .from('viajes')
    .select('*')
    .eq('conductor_id', conductorId)
    .in('estado', ['solicitado', 'aceptado', 'en_curso'])
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

// --- Historial de viajes ---
export async function obtenerHistorialViajes(userId: string, rol: 'pasajero' | 'conductor') {
  const col = rol === 'pasajero' ? 'pasajero_id' : 'conductor_id';
  const { data, error } = await supabase
    .from('viajes')
    .select('*')
    .eq(col, userId)
    .eq('estado', 'completado')
    .order('creado_en', { ascending: false })
    .limit(20);

  return { data, error };
}

// --- Métricas del conductor (hoy) ---
export async function obtenerMetricasConductorHoy(conductorId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('viajes')
    .select('precio_final')
    .eq('conductor_id', conductorId)
    .eq('estado', 'completado')
    .gte('finalizado_en', hoy.toISOString());

  if (error) return { ganancia: 0, totalViajes: 0, error };

  const ganancia = (data || []).reduce((sum, v) => sum + (Number(v.precio_final) || 0), 0);
  return { ganancia, totalViajes: data?.length || 0, error: null };
}

// --- Suscripción en tiempo real a viajes solicitados ---
export function suscribirseViajesSolicitados(callback: (viaje: ViajeDB) => void) {
  const channel = supabase.channel('viajes-solicitados')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'viajes',
        filter: 'estado=eq.solicitado',
      },
      (payload) => {
        callback(payload.new as ViajeDB);
      }
    )
    .subscribe();

  return channel;
}

// --- Suscripción a cambios en un viaje específico ---
export function suscribirseViaje(viajeId: string, callback: (viaje: ViajeDB) => void) {
  const channel = supabase.channel(`viaje-${viajeId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'viajes',
        filter: `id=eq.${viajeId}`,
      },
      (payload) => {
        callback(payload.new as ViajeDB);
      }
    )
    .subscribe();

  return channel;
}

// --- Calcular precio estimado aproximado ---
export function calcularPrecioEstimado(origen: Coordenada, destino: Coordenada): number {
  // Fórmula Haversine para distancia
  const R = 6371;
  const dLat = (destino.lat - origen.lat) * (Math.PI / 180);
  const dLng = (destino.lng - origen.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origen.lat * (Math.PI / 180)) *
      Math.cos(destino.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanciaKm = R * c;

  // Tarifa base $25 + $12 por km (ajustado para Ixtlahuaca)
  const precio = Math.max(30, Math.round(25 + distanciaKm * 12));
  return precio;
}
