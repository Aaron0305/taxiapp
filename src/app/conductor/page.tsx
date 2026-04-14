'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/backend/config/database';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  aceptarViaje,
  completarViaje,
  obtenerViajeActivoConductor,
  obtenerMetricasConductorHoy,
  suscribirseViajesSolicitados,
  type ViajeDB,
} from '@/services/api/viajeService';

const MapaLeaflet = dynamic(() => import('@/components/comun/MapaLeaflet'), { ssr: false });

type EstadoConductor = 'offline' | 'online' | 'viaje_aceptado' | 'viaje_en_curso';

export default function ConductorPanel() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoConductor>('offline');
  const [nombreUsuario, setNombreUsuario] = useState('Conductor');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  // Location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Trips
  const [solicitudPendiente, setSolicitudPendiente] = useState<ViajeDB | null>(null);
  const [viajeActivo, setViajeActivo] = useState<ViajeDB | null>(null);

  // Metrics
  const [gananciaHoy, setGananciaHoy] = useState(0);
  const [viajesHoy, setViajesHoy] = useState(0);

  // Map markers
  const [marcadores, setMarcadores] = useState<Array<{ id: string; lat: number; lng: number; tipo: 'usuario' | 'destino' | 'conductor'; label?: string }>>([]);

  // === Auth & Session ===
  useEffect(() => {
    const iniciar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }

      const { data: { user } } = await supabase.auth.getUser();
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
      setUserLocation([19.568, -99.768]);
      return;
    }

    // Posición inmediata
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setUserLocation([19.568, -99.768]),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Seguir observando
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => { /* fallback already set */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // === Guardar ubicación en BD cuando está online ===
  useEffect(() => {
    if (estado === 'offline' || !userLocation || !userId) return;

    const interval = setInterval(async () => {
      // PostGIS requiere formato POINT(longitud latitud)
      const point = `POINT(${userLocation[1]} ${userLocation[0]})`;

      await supabase.from('conductores').update({
        esta_disponible: estado === 'online',
        ultima_conexion: new Date().toISOString(),
        ubicacion_actual: point,
      }).eq('id', userId);
    }, 5000); // Intervalo de 5 segundos

    return () => clearInterval(interval);
  }, [estado, userLocation, userId]);

  // === Suscripción Realtime a viajes solicitados ===
  useEffect(() => {
    if (estado !== 'online') return;

    const channel = suscribirseViajesSolicitados((nuevoViaje) => {
      // Only show if no active trip
      if (!viajeActivo) {
        setSolicitudPendiente(nuevoViaje);
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [estado, viajeActivo]);

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
    if (solicitudPendiente) {
      if (solicitudPendiente.origen_lat && solicitudPendiente.origen_lng) {
        marks.push({
          id: 'solicitud',
          lat: Number(solicitudPendiente.origen_lat),
          lng: Number(solicitudPendiente.origen_lng),
          tipo: 'usuario',
          label: solicitudPendiente.origen_direccion || 'Pasajero',
        });
      }
    }
    setMarcadores(marks);
  }, [viajeActivo, solicitudPendiente]);

  // === Actions ===
  const toggleOnline = useCallback(async () => {
    if (estado === 'offline') {
      setEstado('online');
      await supabase.from('conductores').update({ esta_disponible: true }).eq('id', userId);
    } else if (estado === 'online') {
      setEstado('offline');
      setSolicitudPendiente(null);
      await supabase.from('conductores').update({ esta_disponible: false }).eq('id', userId);
    }
  }, [estado, userId]);

  const aceptar = useCallback(async () => {
    if (!solicitudPendiente) return;
    const { data, error } = await aceptarViaje(solicitudPendiente.id, userId);
    if (error) {
      setSolicitudPendiente(null); // Trip was already taken
      return;
    }
    setViajeActivo(data);
    setSolicitudPendiente(null);
    setEstado('viaje_aceptado');
  }, [solicitudPendiente, userId]);

  const rechazar = useCallback(() => {
    setSolicitudPendiente(null);
  }, []);

  const finalizarViaje = useCallback(async () => {
    if (!viajeActivo) return;
    const precio = Number(viajeActivo.precio_estimado) || 50;
    await completarViaje(viajeActivo.id, precio);

    // Update metrics
    setGananciaHoy((prev) => prev + precio);
    setViajesHoy((prev) => prev + 1);
    setViajeActivo(null);
    setEstado('online');
  }, [viajeActivo]);

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
      <header className="relative z-10 p-4 flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 p-[2px]">
            <div className="w-full h-full bg-[#111827] rounded-lg flex items-center justify-center overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nombreUsuario}`} alt="Avatar" className="w-10 h-10" />
            </div>
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">{nombreUsuario}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${estado !== 'offline' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-gray-400 text-xs font-medium">
                {estado === 'offline' ? 'Desconectado' : estado === 'online' ? 'En línea' : 'En servicio'}
              </span>
            </div>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Ganancias hoy</span>
            <span className="text-xl font-bold text-white">${gananciaHoy.toFixed(2)}</span>
          </div>
          <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Viajes hoy</span>
            <span className="text-xl font-bold text-white">{viajesHoy} completados</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="relative z-20 flex-1 flex flex-col justify-end p-4 pb-8 pointer-events-none">

        {/* SOLICITUD PENDIENTE */}
        {solicitudPendiente && estado === 'online' && (
          <div className="pointer-events-auto bg-black/80 backdrop-blur-2xl border-2 border-teal-500/50 p-6 rounded-[2rem] shadow-[0_0_60px_rgba(20,184,166,0.2)] w-full mb-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
                <h3 className="text-lg font-bold text-white">¡Nuevo Viaje!</h3>
              </div>
              <span className="text-teal-400 font-bold text-2xl">${solicitudPendiente.precio_estimado}</span>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs uppercase font-semibold">Origen</p>
                  <p className="text-white font-medium truncate">{solicitudPendiente.origen_direccion || 'Ubicación del pasajero'}</p>
                </div>
              </div>
              <div className="ml-1.5 h-3 border-l-2 border-dashed border-gray-600" />
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs uppercase font-semibold">Destino</p>
                  <p className="text-white font-medium truncate">{solicitudPendiente.destino_direccion || 'Sin nombre'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <button onClick={rechazar} className="col-span-2 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-all border border-white/10">
                Rechazar
              </button>
              <button onClick={aceptar} className="col-span-3 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-black font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                Aceptar
              </button>
            </div>
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

            <button
              onClick={finalizarViaje}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
            >
              ✅ Finalizar Viaje
            </button>
          </div>
        )}

        {/* BOTÓN CONECTAR/DESCONECTAR */}
        {!viajeActivo && !solicitudPendiente && (
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
