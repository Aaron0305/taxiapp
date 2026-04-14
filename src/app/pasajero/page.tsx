'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/backend/config/database';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  crearViaje,
  cancelarViaje,
  obtenerViajeActivoPasajero,
  suscribirseViaje,
  calcularPrecioEstimado,
  type ViajeDB,
} from '@/services/api/viajeService';
import { buscarDireccion, obtenerDireccion, type ResultadoBusqueda } from '@/services/mapas/geocodificacion';

// Dynamic import Leaflet (avoid SSR issues)
const MapaLeaflet = dynamic(() => import('@/components/comun/MapaLeaflet'), { ssr: false });

type Paso = 'inicio' | 'buscando_destino' | 'confirmar' | 'esperando' | 'viaje_activo' | 'completado';

export default function PasajeroPanel() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('inicio');
  const [nombreUsuario, setNombreUsuario] = useState('Pasajero');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  // Location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [origenDireccion, setOrigenDireccion] = useState('Mi ubicación');

  // Destination search
  const [queryDestino, setQueryDestino] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<ResultadoBusqueda | null>(null);
  const [buscando, setBuscando] = useState(false);

  // Trip
  const [precioEstimado, setPrecioEstimado] = useState(0);
  const [viajeActivo, setViajeActivo] = useState<ViajeDB | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Map markers
  const [marcadores, setMarcadores] = useState<Array<{ id: string; lat: number; lng: number; tipo: 'usuario' | 'destino' | 'conductor'; label?: string }>>([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // === Auth & Session ===
  useEffect(() => {
    const iniciar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.nombre) setNombreUsuario(user.user_metadata.nombre);
      setUserId(user?.id || '');

      // Check existing active trip
      if (user?.id) {
        const { data: viaje } = await obtenerViajeActivoPasajero(user.id);
        if (viaje) {
          setViajeActivo(viaje);
          if (viaje.estado === 'solicitado') setPaso('esperando');
          else if (viaje.estado === 'aceptado' || viaje.estado === 'en_curso') setPaso('viaje_activo');
        }
      }

      setLoading(false);
    };
    iniciar();
  }, [router]);

  // === GPS del usuario — obtener ubicación real ===
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      setUserLocation([19.568, -99.768]);
      return;
    }

    let ubicacionObtenida = false;

    // 1. Intentar obtener posición inmediata
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        ubicacionObtenida = true;
        try {
          const dir = await obtenerDireccion(coords[0], coords[1]);
          setOrigenDireccion(dir.split(',').slice(0, 2).join(','));
        } catch { /* ignore */ }
      },
      (err) => {
        console.warn('GPS getCurrentPosition error:', err.message);
        if (!ubicacionObtenida) {
          setUserLocation([19.568, -99.768]);
          setOrigenDireccion('Ixtlahuaca, México');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // 2. Seguir observando cambios de posición
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        ubicacionObtenida = true;
        if (origenDireccion === 'Mi ubicación' || origenDireccion === 'Ixtlahuaca, México') {
          try {
            const dir = await obtenerDireccion(coords[0], coords[1]);
            setOrigenDireccion(dir.split(',').slice(0, 2).join(','));
          } catch { /* ignore */ }
        }
      },
      () => { /* silent fallback, getCurrentPosition already handled it */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // === Suscripción Realtime al viaje activo ===
  useEffect(() => {
    if (!viajeActivo) return;

    const channel = suscribirseViaje(viajeActivo.id, (viajeActualizado) => {
      setViajeActivo(viajeActualizado);
      if (viajeActualizado.estado === 'aceptado') setPaso('viaje_activo');
      else if (viajeActualizado.estado === 'completado') {
        setPaso('completado');
        setTimeout(() => {
          setPaso('inicio');
          setViajeActivo(null);
          setDestinoSeleccionado(null);
        }, 5000);
      } else if (viajeActualizado.estado === 'cancelado') {
        setPaso('inicio');
        setViajeActivo(null);
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [viajeActivo?.id]);

  // === Buscar destinos con debounce ===
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (queryDestino.length < 3) { setResultados([]); return; }

    setBuscando(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const res = await buscarDireccion(queryDestino);
      setResultados(res);
      setBuscando(false);
    }, 500);
  }, [queryDestino]);

  // === Update map markers ===
  useEffect(() => {
    const marks: typeof marcadores = [];
    if (destinoSeleccionado) {
      marks.push({
        id: 'destino',
        lat: destinoSeleccionado.lat,
        lng: destinoSeleccionado.lng,
        tipo: 'destino',
        label: destinoSeleccionado.nombre,
      });
    }
    if (viajeActivo?.conductor_id) {
      // If we had conductor position we'd add it here
    }
    setMarcadores(marks);
  }, [destinoSeleccionado, viajeActivo]);

  // === Acciones ===
  const seleccionarDestino = useCallback((resultado: ResultadoBusqueda) => {
    setDestinoSeleccionado(resultado);
    setQueryDestino(resultado.nombre);
    setResultados([]);
    setPaso('confirmar');

    if (userLocation) {
      const precio = calcularPrecioEstimado(
        { lat: userLocation[0], lng: userLocation[1] },
        { lat: resultado.lat, lng: resultado.lng }
      );
      setPrecioEstimado(precio);
    }
  }, [userLocation]);

  const pedirTaxi = useCallback(async () => {
    if (!userLocation || !destinoSeleccionado || !userId) return;
    setError(null);

    const { data, error: err } = await crearViaje({
      pasajero_id: userId,
      origen: { lat: userLocation[0], lng: userLocation[1] },
      origen_direccion: origenDireccion,
      destino: { lat: destinoSeleccionado.lat, lng: destinoSeleccionado.lng },
      destino_direccion: destinoSeleccionado.nombre,
      precio_estimado: precioEstimado,
    });

    if (err) {
      setError('Error al solicitar viaje: ' + err.message);
      return;
    }

    setViajeActivo(data);
    setPaso('esperando');
  }, [userLocation, destinoSeleccionado, userId, origenDireccion, precioEstimado]);

  const cancelar = useCallback(async () => {
    if (!viajeActivo) return;
    await cancelarViaje(viajeActivo.id);
    setViajeActivo(null);
    setDestinoSeleccionado(null);
    setPaso('inicio');
  }, [viajeActivo]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0f1c] flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#0a0f1c] overflow-hidden flex flex-col font-sans">
      
      {/* MAPA REAL LEAFLET */}
      <div className="absolute inset-0 z-0">
        <MapaLeaflet
          center={userLocation || [19.568, -99.768]}
          zoom={15}
          darkMode={true}
          userLocation={userLocation}
          marcadores={marcadores}
        />
      </div>

      {/* HEADER */}
      <header className="relative z-10 p-4 flex justify-between items-center">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-400 p-[2px]">
            <div className="w-full h-full bg-[#111827] rounded-full flex items-center justify-center overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nombreUsuario}`} alt="Avatar" className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h2 className="text-white font-bold text-sm leading-tight">{nombreUsuario}</h2>
            <p className="text-emerald-400 text-[10px] font-semibold tracking-wide">PASAJERO</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-3 bg-black/60 backdrop-blur-xl hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-gray-400 hover:text-white shadow-xl">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {/* CONTENIDO INFERIOR */}
      <main className="relative z-10 flex-1 flex flex-col justify-end pointer-events-none">

        {/* === PASO: INICIO === */}
        {paso === 'inicio' && (
          <div className="pointer-events-auto bg-[#0f1629]/95 backdrop-blur-2xl border-t border-white/10 p-6 rounded-t-[2rem] shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">¿A dónde vamos?</h3>

            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <input
                type="text"
                value={origenDireccion}
                readOnly
                className="w-full bg-white/5 border border-white/10 text-gray-400 rounded-xl py-3 pl-11 pr-4 text-sm"
              />
            </div>

            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <input
                type="text"
                value={queryDestino}
                onChange={(e) => { setQueryDestino(e.target.value); setPaso('buscando_destino'); }}
                onFocus={() => setPaso('buscando_destino')}
                placeholder="Busca tu destino..."
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-gray-500"
              />
            </div>

            {/* Accesos rápidos */}
            <div className="flex gap-3">
              <button
                onClick={() => { setQueryDestino('Centro Ixtlahuaca'); setPaso('buscando_destino'); }}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2.5 rounded-xl transition-all"
              >
                <span className="text-blue-400">🏛️</span>
                <span className="text-gray-300 text-sm font-medium">Centro</span>
              </button>
              <button
                onClick={() => { setQueryDestino('Terminal Autobuses Ixtlahuaca'); setPaso('buscando_destino'); }}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2.5 rounded-xl transition-all"
              >
                <span className="text-purple-400">🚌</span>
                <span className="text-gray-300 text-sm font-medium">Terminal</span>
              </button>
              <button
                onClick={() => { setQueryDestino('Mercado Ixtlahuaca'); setPaso('buscando_destino'); }}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2.5 rounded-xl transition-all"
              >
                <span className="text-yellow-400">🛒</span>
                <span className="text-gray-300 text-sm font-medium">Mercado</span>
              </button>
            </div>
          </div>
        )}

        {/* === PASO: BUSCANDO DESTINO === */}
        {paso === 'buscando_destino' && (
          <div className="pointer-events-auto bg-[#0f1629]/95 backdrop-blur-2xl border-t border-white/10 p-6 rounded-t-[2rem] shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => { setPaso('inicio'); setResultados([]); }} className="p-2 bg-white/10 rounded-full">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h3 className="text-lg font-bold text-white">Buscar destino</h3>
            </div>

            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500" />
              <input
                type="text"
                autoFocus
                value={queryDestino}
                onChange={(e) => setQueryDestino(e.target.value)}
                placeholder="Escribe una dirección..."
                className="w-full bg-white/5 border border-blue-500/50 text-white rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-gray-500"
              />
            </div>

            {buscando && <p className="text-gray-500 text-sm text-center py-4">Buscando...</p>}

            {resultados.map((r) => (
              <button
                key={r.id}
                onClick={() => seleccionarDestino(r)}
                className="w-full flex items-start gap-3 p-3 hover:bg-white/5 rounded-xl transition text-left group mb-1"
              >
                <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-red-400 group-hover:bg-red-500/20 mt-0.5 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{r.nombre}</p>
                  <p className="text-gray-500 text-xs truncate">{r.direccion}</p>
                </div>
              </button>
            ))}

            {queryDestino.length >= 3 && !buscando && resultados.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No se encontraron resultados</p>
            )}
          </div>
        )}

        {/* === PASO: CONFIRMAR VIAJE === */}
        {paso === 'confirmar' && destinoSeleccionado && (
          <div className="pointer-events-auto bg-[#0f1629]/95 backdrop-blur-2xl border-t border-white/10 p-6 rounded-t-[2rem] shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Confirmar viaje</h3>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs uppercase font-semibold">Origen</p>
                  <p className="text-white text-sm font-medium truncate">{origenDireccion}</p>
                </div>
              </div>
              <div className="ml-1.5 h-4 border-l-2 border-dashed border-gray-600" />
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs uppercase font-semibold">Destino</p>
                  <p className="text-white text-sm font-medium truncate">{destinoSeleccionado.nombre}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-xs uppercase font-semibold">Precio estimado</p>
                <p className="text-3xl font-black text-white">${precioEstimado}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">🚕 Taxi Clásico</p>
                <p className="text-emerald-400 text-xs font-semibold">Pago en efectivo</p>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-xl">{error}</p>}

            <div className="grid grid-cols-5 gap-3">
              <button
                onClick={() => { setPaso('inicio'); setDestinoSeleccionado(null); }}
                className="col-span-2 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-all border border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={pedirTaxi}
                className="col-span-3 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
              >
                🚕 Pedir Taxi
              </button>
            </div>
          </div>
        )}

        {/* === PASO: ESPERANDO CONDUCTOR === */}
        {paso === 'esperando' && (
          <div className="pointer-events-auto bg-[#0f1629]/95 backdrop-blur-2xl border-t border-blue-500/30 p-8 rounded-t-[2rem] shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-30 rounded-full animate-pulse" />
              <div className="w-20 h-20 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-full border-2 border-blue-500/50 flex items-center justify-center relative z-10">
                <span className="text-4xl animate-bounce">🚕</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Buscando conductor...</h3>
            <p className="text-gray-400 text-sm mb-2">Tu solicitud está visible para los conductores cercanos</p>
            <p className="text-blue-400 text-sm font-semibold mb-6">{destinoSeleccionado?.nombre || viajeActivo?.destino_direccion}</p>

            <button
              onClick={cancelar}
              className="px-8 py-3 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-red-400 transition-all font-medium"
            >
              Cancelar solicitud
            </button>
          </div>
        )}

        {/* === PASO: VIAJE ACTIVO === */}
        {paso === 'viaje_activo' && viajeActivo && (
          <div className="pointer-events-auto bg-[#0f1629]/95 backdrop-blur-2xl border-t border-emerald-500/30 p-6 rounded-t-[2rem] shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-lg font-bold text-white">
                {viajeActivo.estado === 'aceptado' ? 'Conductor en camino' : 'Viaje en curso'}
              </h3>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-lg">🏁</span>
                <div>
                  <p className="text-gray-400 text-xs uppercase">Destino</p>
                  <p className="text-white font-medium">{viajeActivo.destino_direccion}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Precio estimado</span>
                <span className="text-white font-bold text-lg">${viajeActivo.precio_estimado}</span>
              </div>
            </div>
          </div>
        )}

        {/* === PASO: COMPLETADO === */}
        {paso === 'completado' && viajeActivo && (
          <div className="pointer-events-auto bg-[#0f1629]/95 backdrop-blur-2xl border-t border-emerald-500/30 p-8 rounded-t-[2rem] shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">¡Viaje completado!</h3>
            <p className="text-gray-400 mb-2">Gracias por viajar con TaxiApp</p>
            <p className="text-2xl font-black text-emerald-400">${viajeActivo.precio_final || viajeActivo.precio_estimado}</p>
          </div>
        )}
      </main>
    </div>
  );
}
