'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/backend/config/database';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  aceptarViaje,
  iniciarViaje,
  completarViaje,
  obtenerViajeActivoConductor,
  obtenerViajesSolicitados,
  obtenerMetricasConductorHoy,
  suscribirseViajesSolicitados,
  type ViajeDB,
} from '@/services/api/viajeService';
import { obtenerSesionSegura, obtenerUsuarioSeguro } from '@/services/auth/sessionSafe';
import IndicadorGPS from '@/components/conductor/IndicadorGPS';

const MapaLeaflet = dynamic(() => import('@/components/comun/MapaLeaflet'), { ssr: false });

type EstadoConductor = 'offline' | 'online' | 'viaje_aceptado' | 'viaje_en_curso';

const IXTLAHUACA_CENTER: [number, number] = [19.568, -99.768];
const RADIO_CLIENTES_CERCANOS_KM = 10; // Aumentado de 5 a 10 km para mejor cobertura

type ProveedorNavegacion = 'google' | 'waze' | 'osm';

function construirUrlNavegacion(
  proveedor: ProveedorNavegacion,
  origen: [number, number] | null,
  destino: [number, number] | null
) {
  if (!destino) return null;

  const destinoTexto = `${destino[0]},${destino[1]}`;
  const origenTexto = origen ? `${origen[0]},${origen[1]}` : null;

  if (proveedor === 'google') {
    if (origenTexto) {
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origenTexto)}&destination=${encodeURIComponent(destinoTexto)}&travelmode=driving`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinoTexto)}`;
  }

  if (proveedor === 'waze') {
    return `https://waze.com/ul?ll=${encodeURIComponent(destinoTexto)}&navigate=yes`;
  }

  if (origenTexto) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(origenTexto)}%3B${encodeURIComponent(destinoTexto)}`;
  }
  return `https://www.openstreetmap.org/?mlat=${destino[0]}&mlon=${destino[1]}#map=16/${destino[0]}/${destino[1]}`;
}

function formatDistanciaEstimacion(km: number) {
  if (km < 1) return `${Math.max(100, Math.round(km * 1000))} m`;
  return `${km.toFixed(1)} km`;
}

function formatTiempoEstimacion(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h} h ${m} min`;
}

function distanciaKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = (bLat - aLat) * (Math.PI / 180);
  const dLng = (bLng - aLng) * (Math.PI / 180);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aLat * (Math.PI / 180)) *
      Math.cos(bLat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function normalizarUbicacion(lat: number, lng: number, accuracy?: number | null): [number, number] {
  const precision = accuracy ?? 0;
  const lejosDeZona = distanciaKm(lat, lng, IXTLAHUACA_CENTER[0], IXTLAHUACA_CENTER[1]) > 35;
  if (lejosDeZona || precision > 2500) {
    return IXTLAHUACA_CENTER;
  }
  return [lat, lng];
}

export default function ConductorPanel() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoConductor>('offline');
  const [nombreUsuario, setNombreUsuario] = useState('Conductor');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  // Location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Trips
  const [solicitudesDisponibles, setSolicitudesDisponibles] = useState<ViajeDB[]>([]);
  const [viajeActivo, setViajeActivo] = useState<ViajeDB | null>(null);

  // Metrics
  const [gananciaHoy, setGananciaHoy] = useState(0);
  const [viajesHoy, setViajesHoy] = useState(0);
  const [aceptandoViajeId, setAceptandoViajeId] = useState<string | null>(null);
  const [procesandoViaje, setProcesandoViaje] = useState(false);

  // Map markers
  const [marcadores, setMarcadores] = useState<Array<{ id: string; lat: number; lng: number; tipo: 'usuario' | 'destino' | 'conductor'; label?: string }>>([]);

  // === Auth & Session ===
  useEffect(() => {
    const iniciar = async () => {
      const { session } = await obtenerSesionSegura();
      if (!session) { router.push('/auth/login'); return; }

      const { user } = await obtenerUsuarioSeguro();
      if (user?.user_metadata?.nombre) setNombreUsuario(user.user_metadata.nombre);
      setUserId(user?.id || '');

      // Ensure conductor profile exists
      if (user?.id) {
        const { data: conductorProfile } = await supabase.from('conductores').select('id').eq('id', user.id).maybeSingle();
        if (!conductorProfile) {
          await supabase.from('conductores').insert({
            id: user.id,
            placa: 'POR-ASIGNAR',
            esta_disponible: false,
          });
        }

        // Check existing active trip
        const { data: viaje } = await obtenerViajeActivoConductor(user.id);
        if (viaje) {
          setViajeActivo(viaje);
          setEstado(viaje.estado === 'en_curso' ? 'viaje_en_curso' : 'viaje_aceptado');
        }

        // Load today's metrics
        const m = await obtenerMetricasConductorHoy(user.id);
        setGananciaHoy(m.ganancia);
        setViajesHoy(m.totalViajes);
      }

      setLoading(false);
    };
    iniciar();
  }, [router]);

  // === GPS conductor — obtener ubicación real ===
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(IXTLAHUACA_CENTER);
      return;
    }

    // Posición inmediata
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation(normalizarUbicacion(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)),
      () => setUserLocation(IXTLAHUACA_CENTER),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Seguir observando
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation(normalizarUbicacion(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)),
      () => { /* fallback already set */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // === Guardar ubicación en BD siempre (online u offline), así pasajero ve conductor ===
  useEffect(() => {
    if (!userLocation || !userId) return;

    const actualizarUbicacion = async () => {
      const point = `POINT(${userLocation[1]} ${userLocation[0]})`;
      console.log(`[CONDUCTOR] Updating location: ${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`);
      
      const { error } = await supabase.from('conductores').update({
        esta_disponible: estado === 'online',
        ultima_conexion: new Date().toISOString(),
        ubicacion_actual: point,
      }).eq('id', userId);
      
      if (error) {
        console.error('[CONDUCTOR] Error updating location:', error);
      }
    };

    // Push inmediato para evitar ventana de 5s con datos stale en pasajero.
    void actualizarUbicacion();

    const interval = setInterval(async () => {
      await actualizarUbicacion();
    }, 5000); // Intervalo de 5 segundos

    return () => clearInterval(interval);
  }, [userLocation, userId, estado]);

  // === Cargar solicitudes existentes cuando está online ===
  useEffect(() => {
    if (estado !== 'online' || viajeActivo) return;

    let activo = true;
    const cargar = async () => {
      const { data } = await obtenerViajesSolicitados();
      if (!activo) return;
      setSolicitudesDisponibles(Array.isArray(data) ? data : []);
    };

    cargar();
    const interval = setInterval(cargar, 10000);

    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [estado, viajeActivo]);

  // === Suscripción Realtime a viajes solicitados ===
  useEffect(() => {
    if (estado !== 'online') return;

    const channel = suscribirseViajesSolicitados((nuevoViaje) => {
      if (viajeActivo) return;
      setSolicitudesDisponibles((prev) => {
        if (prev.some((v) => v.id === nuevoViaje.id)) return prev;
        return [nuevoViaje, ...prev];
      });
    });

    return () => { supabase.removeChannel(channel); };
  }, [estado, viajeActivo]);

  const solicitudesCercanas = solicitudesDisponibles
    .filter((solicitud) => solicitud.origen_lat && solicitud.origen_lng)
    .map((solicitud) => {
      const distancia = userLocation
        ? distanciaKm(userLocation[0], userLocation[1], Number(solicitud.origen_lat), Number(solicitud.origen_lng))
        : Number.MAX_SAFE_INTEGER;

      return {
        solicitud,
        distancia,
      };
    })
    .filter((item) => item.distancia <= RADIO_CLIENTES_CERCANOS_KM)
    .sort((a, b) => a.distancia - b.distancia);

  // === Update markers ===
  useEffect(() => {
    const marks: typeof marcadores = [];
    if (viajeActivo) {
      if (viajeActivo.origen_lat && viajeActivo.origen_lng) {
        marks.push({
          id: 'origen',
          lat: Number(viajeActivo.origen_lat),
          lng: Number(viajeActivo.origen_lng),
          tipo: 'usuario',
          label: viajeActivo.origen_direccion || 'Pasajero',
        });
      }
      if (viajeActivo.destino_lat && viajeActivo.destino_lng) {
        marks.push({
          id: 'destino',
          lat: Number(viajeActivo.destino_lat),
          lng: Number(viajeActivo.destino_lng),
          tipo: 'destino',
          label: viajeActivo.destino_direccion || 'Destino',
        });
      }
    }
    solicitudesCercanas.forEach((solicitud) => {
      if (solicitud.origen_lat && solicitud.origen_lng) {
        marks.push({
          id: `solicitud-${solicitud.id}`,
          lat: Number(solicitud.origen_lat),
          lng: Number(solicitud.origen_lng),
          tipo: 'usuario',
          label: solicitud.origen_direccion || 'Pasajero',
        });
      }
    });
    setMarcadores(marks);
  }, [viajeActivo, solicitudesCercanas]);

  // === Actions ===
  const toggleOnline = useCallback(async () => {
    if (estado === 'offline') {
      setEstado('online');
      await supabase.from('conductores').update({ esta_disponible: true }).eq('id', userId);
    } else if (estado === 'online') {
      setEstado('offline');
      setSolicitudesDisponibles([]);
      await supabase.from('conductores').update({ esta_disponible: false }).eq('id', userId);
    }
  }, [estado, userId]);

  const aceptar = useCallback(async (viaje: ViajeDB) => {
    setAceptandoViajeId(viaje.id);
    const { data, error } = await aceptarViaje(viaje.id, userId);
    if (error) {
      setSolicitudesDisponibles((prev) => prev.filter((item) => item.id !== viaje.id));
      setAceptandoViajeId(null);
      return;
    }
    setViajeActivo(data);
    setSolicitudesDisponibles((prev) => prev.filter((item) => item.id !== viaje.id));
    setEstado('viaje_aceptado');
    setAceptandoViajeId(null);
  }, [userId]);

  const rechazar = useCallback((viajeId: string) => {
    setSolicitudesDisponibles((prev) => prev.filter((item) => item.id !== viajeId));
  }, []);

  const iniciarRecorrido = useCallback(async () => {
    if (!viajeActivo || procesandoViaje) return;
    setProcesandoViaje(true);
    const { data } = await iniciarViaje(viajeActivo.id);
    if (data) {
      setViajeActivo(data);
      setEstado('viaje_en_curso');
    }
    setProcesandoViaje(false);
  }, [viajeActivo, procesandoViaje]);

  const finalizarViaje = useCallback(async () => {
    if (!viajeActivo || procesandoViaje) return;
    setProcesandoViaje(true);
    const precio = Number(viajeActivo.precio_estimado) || 50;
    await completarViaje(viajeActivo.id, precio);

    // Update metrics
    setGananciaHoy((prev) => prev + precio);
    setViajesHoy((prev) => prev + 1);
    setViajeActivo(null);
    setEstado('online');
    setProcesandoViaje(false);
  }, [viajeActivo, procesandoViaje]);

  const abrirNavegacion = useCallback((proveedor: ProveedorNavegacion, hacia: 'origen' | 'destino') => {
    const destino =
      hacia === 'origen'
        ? (viajeActivo?.origen_lat && viajeActivo?.origen_lng ? [Number(viajeActivo.origen_lat), Number(viajeActivo.origen_lng)] as [number, number] : null)
        : (viajeActivo?.destino_lat && viajeActivo?.destino_lng ? [Number(viajeActivo.destino_lat), Number(viajeActivo.destino_lng)] as [number, number] : null);

    const url = construirUrlNavegacion(proveedor, userLocation, destino);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [viajeActivo, userLocation]);

  const distanciaAlPasajeroKm = viajeActivo?.origen_lat && viajeActivo?.origen_lng && userLocation
    ? distanciaKm(userLocation[0], userLocation[1], Number(viajeActivo.origen_lat), Number(viajeActivo.origen_lng))
    : null;
  const etaPasajeroMin = distanciaAlPasajeroKm !== null ? Math.max(2, Math.ceil((distanciaAlPasajeroKm / 25) * 60)) : null;
  const distanciaRutaKm = viajeActivo?.origen_lat && viajeActivo?.origen_lng && viajeActivo?.destino_lat && viajeActivo?.destino_lng
    ? distanciaKm(Number(viajeActivo.origen_lat), Number(viajeActivo.origen_lng), Number(viajeActivo.destino_lat), Number(viajeActivo.destino_lng))
    : null;
  const etaRutaMin = distanciaRutaKm !== null ? Math.max(4, Math.ceil((distanciaRutaKm / 30) * 60)) : null;

  const handleLogout = async () => {
    await supabase.from('conductores').update({ esta_disponible: false }).eq('id', userId);
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#050B14] flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Cargando panel...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#050B14] overflow-hidden flex flex-col font-sans">

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_45%),radial-gradient(ellipse_at_bottom,rgba(45,212,191,0.10),transparent_40%)]" />

      {/* MAPA REAL */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${estado !== 'offline' ? 'opacity-100' : 'opacity-40 grayscale'}`}>
        <MapaLeaflet
          center={userLocation || [19.568, -99.768]}
          zoom={15}
          darkMode={true}
          userLocation={estado !== 'offline' ? userLocation : null}
          marcadores={marcadores}
        />
      </div>

      {/* HEADER */}
      <header className="relative z-10 p-4 flex justify-between items-start gap-3">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center gap-3 shadow-xl min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 p-[2px]">
            <div className="w-full h-full bg-[#111827] rounded-lg flex items-center justify-center overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nombreUsuario}`} alt="Avatar" className="w-10 h-10" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm">{nombreUsuario}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${estado !== 'offline' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-gray-400 text-xs font-medium">
                {estado === 'offline' ? 'Desconectado' : estado === 'online' ? 'En línea' : 'En servicio'}
              </span>
            </div>
            <IndicadorGPS
              activo={Boolean(userLocation)}
              lat={userLocation?.[0]}
              lng={userLocation?.[1]}
            />
          </div>
        </div>
        <button onClick={handleLogout} className="p-3 bg-black/60 backdrop-blur-xl border border-red-500/20 rounded-2xl text-red-400 hover:bg-red-500/10 transition shadow-xl">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {/* METRICS BAR */}
      <div className="relative z-10 px-4 mt-1">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Ganancias hoy</span>
            <span className="text-xl font-bold text-white">${gananciaHoy.toFixed(2)}</span>
          </div>
          <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Viajes hoy</span>
            <span className="text-xl font-bold text-white">{viajesHoy} completados</span>
          </div>
          <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Clientes cerca</span>
            <span className="text-xl font-bold text-emerald-300">
              {estado === 'online' && !viajeActivo ? solicitudesCercanas.length : 0}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="relative z-20 flex-1 flex flex-col justify-end p-4 pb-8 pointer-events-none">

        {/* SOLICITUD PENDIENTE */}
        {solicitudesCercanas.length > 0 && estado === 'online' && (
          <div className="pointer-events-auto bg-black/80 backdrop-blur-2xl border-2 border-teal-500/50 p-6 rounded-[2rem] shadow-[0_0_60px_rgba(20,184,166,0.2)] w-full mb-4 animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[55vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
                <h3 className="text-lg font-bold text-white">Viajes disponibles</h3>
              </div>
              <span className="text-teal-300 text-sm font-semibold">
                {solicitudesCercanas.length} cerca
              </span>
            </div>

            {solicitudesDisponibles.length > solicitudesCercanas.length && (
              <p className="text-xs text-gray-400 mb-3">
                {solicitudesDisponibles.length - solicitudesCercanas.length} solicitudes fuera del radio de {RADIO_CLIENTES_CERCANOS_KM} km
              </p>
            )}

            <div className="space-y-4">
              {solicitudesCercanas.map(({ solicitud, distancia }) => (
                <div key={solicitud.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-bold">Solicitud</p>
                    <div className="text-right">
                      <span className="text-teal-400 font-bold text-xl block">${solicitud.precio_estimado}</span>
                      <span className="text-[10px] text-blue-300 font-semibold">{distancia.toFixed(1)} km</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs uppercase font-semibold">Origen</p>
                        <p className="text-white font-medium truncate">{solicitud.origen_direccion || 'Ubicación del pasajero'}</p>
                      </div>
                    </div>
                    <div className="ml-1.5 h-3 border-l-2 border-dashed border-gray-600" />
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs uppercase font-semibold">Destino</p>
                        <p className="text-white font-medium truncate">{solicitud.destino_direccion || 'Sin nombre'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    <button onClick={() => rechazar(solicitud.id)} className="col-span-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-all border border-white/10">
                      Rechazar
                    </button>
                    <button onClick={() => aceptar(solicitud)} className="col-span-3 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-black font-extrabold transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-60" disabled={aceptandoViajeId === solicitud.id}>
                      {aceptandoViajeId === solicitud.id ? 'Aceptando...' : 'Aceptar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {estado === 'online' && !viajeActivo && solicitudesDisponibles.length > 0 && solicitudesCercanas.length === 0 && (
          <div className="pointer-events-auto bg-black/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl w-full mb-4 text-center">
            <p className="text-white font-semibold">No hay clientes dentro de tu zona cercana</p>
            <p className="text-xs text-gray-400 mt-1">Mantente en línea o cambia tu posición para recibir solicitudes dentro de {RADIO_CLIENTES_CERCANOS_KM} km.</p>
          </div>
        )}

        {/* VIAJE ACTIVO */}
        {(estado === 'viaje_aceptado' || estado === 'viaje_en_curso') && viajeActivo && (
          <div className="pointer-events-auto bg-black/80 backdrop-blur-2xl border border-emerald-500/30 p-6 rounded-[2rem] shadow-2xl w-full mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-lg font-bold text-white">
                {estado === 'viaje_aceptado' ? 'Dirígete al pasajero' : 'Viaje en curso'}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-gray-400 text-[10px] uppercase font-semibold">ETA al pasajero</p>
                <p className="text-white font-bold text-base">{etaPasajeroMin !== null ? formatTiempoEstimacion(etaPasajeroMin) : 'Calculando...'}</p>
                <p className="text-gray-400 text-xs">{distanciaAlPasajeroKm !== null ? formatDistanciaEstimacion(distanciaAlPasajeroKm) : 'Sin GPS suficiente'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-gray-400 text-[10px] uppercase font-semibold">Ruta estimada</p>
                <p className="text-white font-bold text-base">{etaRutaMin !== null ? formatTiempoEstimacion(etaRutaMin) : 'Calculando...'}</p>
                <p className="text-gray-400 text-xs">{distanciaRutaKm !== null ? formatDistanciaEstimacion(distanciaRutaKm) : 'Sin coordenadas'}</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-lg">📍</span>
                <div>
                  <p className="text-gray-400 text-xs uppercase">Recoger en</p>
                  <p className="text-white font-medium text-sm">{viajeActivo.origen_direccion}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">🏁</span>
                <div>
                  <p className="text-gray-400 text-xs uppercase">Llevar a</p>
                  <p className="text-white font-medium text-sm">{viajeActivo.destino_direccion}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">Cobrar al pasajero</span>
              <span className="text-2xl font-black text-emerald-400">${viajeActivo.precio_estimado}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => abrirNavegacion('google', estado === 'viaje_aceptado' ? 'origen' : 'destino')}
                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition"
              >
                Google Maps
              </button>
              <button
                onClick={() => abrirNavegacion('waze', estado === 'viaje_aceptado' ? 'origen' : 'destino')}
                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition"
              >
                Waze
              </button>
              <button
                onClick={() => abrirNavegacion('osm', estado === 'viaje_aceptado' ? 'origen' : 'destino')}
                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition"
              >
                OpenStreetMap
              </button>
            </div>

            {estado === 'viaje_aceptado' ? (
              <button
                onClick={iniciarRecorrido}
                disabled={procesandoViaje}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-lg shadow-[0_0_20px_rgba(14,165,233,0.35)] transition-all disabled:opacity-60"
              >
                {procesandoViaje ? 'Iniciando...' : 'Iniciar Viaje'}
              </button>
            ) : (
              <button
                onClick={finalizarViaje}
                disabled={procesandoViaje}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-60"
              >
                {procesandoViaje ? 'Finalizando...' : 'Finalizar Viaje'}
              </button>
            )}
          </div>
        )}

        {/* BOTÓN CONECTAR/DESCONECTAR */}
        {!viajeActivo && solicitudesDisponibles.length === 0 && (
          <div className="pointer-events-auto w-full flex justify-center">
            <button
              onClick={toggleOnline}
              className={`w-44 h-44 rounded-full flex flex-col items-center justify-center font-bold text-lg shadow-2xl transition-all duration-500 ${estado === 'online'
                  ? 'bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_50px_rgba(239,68,68,0.5)] border-4 border-red-400/30 text-white'
                  : 'bg-gradient-to-b from-emerald-500 to-teal-500 shadow-[0_0_50px_rgba(16,185,129,0.3)] border-4 border-emerald-400/30 text-white'
                }`}
            >
              <span className="text-3xl mb-1">{estado === 'online' ? '🔴' : '🟢'}</span>
              <span>{estado === 'online' ? 'DESCONECTAR' : 'CONECTAR'}</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
