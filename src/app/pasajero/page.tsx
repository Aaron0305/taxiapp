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
import { obtenerRutaConductor } from '@/services/mapas/ruta';
import { suscribirseAUbicacionConductor } from '@/services/socket/websocketService';
import { obtenerSesionSegura, obtenerUsuarioSeguro } from '@/services/auth/sessionSafe';

// Dynamic import Leaflet (avoid SSR issues)
const MapaLeaflet = dynamic(() => import('@/components/comun/MapaLeaflet'), { ssr: false });

type Paso = 'inicio' | 'buscando_destino' | 'confirmar' | 'esperando' | 'viaje_activo' | 'completado';

interface SugerenciaViaje {
  id: string;
  titulo: string;
  detalle: string;
  etaRecogidaMin: number;
  etaTotalMin: number;
}

interface ConductorCercanoRaw {
  id: string;
  ubicacion_actual: unknown;
  ultima_conexion: string | null;
  esta_disponible: boolean;
}

interface ConductorZona {
  id: string;
  lat: number;
  lng: number;
  distanciaConductorKm: number;
}

type PuntoRuta = [number, number];

const IXTLAHUACA_CENTER: [number, number] = [19.568, -99.768];
const HISTORIAL_DESTINOS_MAX = 6;
const RADIO_ZONA_KM = 30;
const ULTIMA_CONEXION_MAX_MS = 15 * 60 * 1000; // Aumentado de 10 a 15 min para tolerar conexiones irregulares

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

function parsePoint(point: string): [number, number] | null {
  const limpio = point.trim();
  const wkt = limpio
    .replace('SRID=4326;', '')
    .replace('POINT (', 'POINT(');
  if (!wkt.startsWith('POINT(') || !wkt.endsWith(')')) return null;

  const inner = wkt.slice(6, -1).trim();
  const [lngRaw, latRaw] = inner.split(/\s+/);
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function extraerCoordsConductor(raw: unknown): [number, number] | null {
  if (typeof raw === 'string') {
    const directo = parsePoint(raw);
    if (directo) return directo;

    try {
      const parsed = JSON.parse(raw) as { coordinates?: unknown };
      if (Array.isArray(parsed?.coordinates) && parsed.coordinates.length >= 2) {
        const lng = Number(parsed.coordinates[0]);
        const lat = Number(parsed.coordinates[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
      }
    } catch {
      // noop
    }

    return null;
  }
  if (typeof raw === 'object' && raw !== null && 'coordinates' in raw) {
    const coords = (raw as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }
  }
  return null;
}

function tituloSugerencia(index: number, etaRecogidaMin: number): string {
  if (index === 0 && etaRecogidaMin <= 4) return 'Express';
  if (index === 0) return 'Mas cercano';
  if (index === 1) return 'Alternativa rapida';
  return 'Opcion flexible';
}

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
  const [conductorLocation, setConductorLocation] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sugerenciasViaje, setSugerenciasViaje] = useState<SugerenciaViaje[]>([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [conductoresCercanos, setConductoresCercanos] = useState(0);
  const [conductoresZonaRealtime, setConductoresZonaRealtime] = useState(0);
  const [conductoresZonaLista, setConductoresZonaLista] = useState<ConductorZona[]>([]);
  const [actualizandoZona, setActualizandoZona] = useState(false);
  const [cancelandoViaje, setCancelandoViaje] = useState(false);
  const [historialDestinos, setHistorialDestinos] = useState<ResultadoBusqueda[]>([]);
  const [rutaActiva, setRutaActiva] = useState<PuntoRuta[]>([]);
  const [resumenRuta, setResumenRuta] = useState<{ distanciaKm: number; duracionMin: number } | null>(null);

  // Map markers
  const [marcadores, setMarcadores] = useState<Array<{ id: string; lat: number; lng: number; tipo: 'usuario' | 'destino' | 'conductor'; label?: string }>>([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRequestIdRef = useRef(0);
  const refreshConductoresTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const keyHistorialDestinos = useCallback((uid: string) => `ixtlappp:historial-destinos:${uid}`, []);

  const calcularRutaSegunEstado = useCallback(async (
    viaje: ViajeDB,
    conductorPosicion: PuntoRuta | null,
    pasajeroPosicion: PuntoRuta | null
  ) => {
    const origenViaje = viaje.origen_lat != null && viaje.origen_lng != null
      ? [Number(viaje.origen_lat), Number(viaje.origen_lng)] as PuntoRuta
      : null;
    const destinoViaje = viaje.destino_lat != null && viaje.destino_lng != null
      ? [Number(viaje.destino_lat), Number(viaje.destino_lng)] as PuntoRuta
      : null;

    if (viaje.estado === 'aceptado') {
      if (!conductorPosicion || !origenViaje) {
        setRutaActiva([]);
        setResumenRuta(null);
        return;
      }

      const ruta = await obtenerRutaConductor(conductorPosicion, origenViaje);
      if (!ruta) {
        setRutaActiva([conductorPosicion, origenViaje]);
        setResumenRuta(null);
        return;
      }

      setRutaActiva(ruta.puntos);
      setResumenRuta({ distanciaKm: ruta.distanciaKm, duracionMin: ruta.duracionMin });
      return;
    }

    if (viaje.estado === 'en_curso') {
      const origenRecorrido = conductorPosicion || pasajeroPosicion || origenViaje;
      if (!origenRecorrido || !destinoViaje) {
        setRutaActiva([]);
        setResumenRuta(null);
        return;
      }

      const ruta = await obtenerRutaConductor(origenRecorrido, destinoViaje);
      if (!ruta) {
        setRutaActiva([origenRecorrido, destinoViaje]);
        setResumenRuta(null);
        return;
      }

      setRutaActiva(ruta.puntos);
      setResumenRuta({ distanciaKm: ruta.distanciaKm, duracionMin: ruta.duracionMin });
      return;
    }

    setRutaActiva([]);
    setResumenRuta(null);
  }, []);

  const guardarDestinoEnHistorial = useCallback((destino: ResultadoBusqueda) => {
    if (!userId) return;

    setHistorialDestinos((prev) => {
      const sinDuplicados = prev.filter((item) => item.id !== destino.id);
      const actualizado = [destino, ...sinDuplicados].slice(0, HISTORIAL_DESTINOS_MAX);
      localStorage.setItem(keyHistorialDestinos(userId), JSON.stringify(actualizado));
      return actualizado;
    });
  }, [userId, keyHistorialDestinos]);

  const calcularConductoresEnZona = useCallback((conductores: ConductorCercanoRaw[], origen: [number, number]) => {
    const ahora = Date.now();

    const mapedConductores = conductores
      .map((c) => {
        const coords = extraerCoordsConductor(c.ubicacion_actual);
        if (!coords) {
          console.warn(`[FILTER] Conductor ${c.id}: ubicacion_actual no parseable`, c.ubicacion_actual);
          return null;
        }

        const actualizadoHaceMs = c.ultima_conexion
          ? ahora - new Date(c.ultima_conexion).getTime()
          : Infinity;

        const distanciaConductorKm = distanciaKm(coords[0], coords[1], origen[0], origen[1]);
        
        return {
          id: c.id,
          lat: coords[0],
          lng: coords[1],
          distanciaConductorKm,
          actualizadoHaceMs,
        };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        return true;
      });

    console.log(`[FILTER] After parsing coords: ${mapedConductores.length} conductores`);

    const afterTimestampFilter = mapedConductores
      .filter((item) => {
        if (item.actualizadoHaceMs > ULTIMA_CONEXION_MAX_MS) {
          console.warn(`[FILTER] Conductor ${item.id}: ultima_conexion vieja (${(item.actualizadoHaceMs / 1000 / 60).toFixed(1)} min atrás)`);
          return false;
        }
        return true;
      });

    console.log(`[FILTER] After timestamp filter: ${afterTimestampFilter.length} conductores`);

    const afterDistanceFilter = afterTimestampFilter
      .filter((item) => {
        if (item.distanciaConductorKm > RADIO_ZONA_KM) {
          console.warn(`[FILTER] Conductor ${item.id}: distancia muy lejana (${item.distanciaConductorKm.toFixed(2)} km)`);
          return false;
        }
        return true;
      })
      .sort((a, b) => a.distanciaConductorKm - b.distanciaConductorKm);

    console.log(`[FILTER] After distance filter: ${afterDistanceFilter.length} conductores`);

    return afterDistanceFilter;
  }, []);

   const refrescarConductoresZona = useCallback(async (location: [number, number] | null, silent = false) => {
     if (!location) return;
     if (!silent) setActualizandoZona(true);

     const { data, error: conductoresError } = await supabase
       .from('conductores')
       .select('id, ubicacion_actual, ultima_conexion, esta_disponible')
       .eq('esta_disponible', true)
       .not('ubicacion_actual', 'is', null)
       .limit(120);

     if (conductoresError || !Array.isArray(data)) {
       console.error('Error fetching conductores:', conductoresError);
       setConductoresZonaRealtime(0);
       if (!silent) setActualizandoZona(false);
       return;
     }

     console.log(`[DEBUG] Total conductores fetched: ${data.length}`);
     data.forEach((c: any, idx: number) => {
       console.log(`[CONDUCTOR ${idx}]`, {
         id: c.id,
         esta_disponible: c.esta_disponible,
         ultima_conexion: c.ultima_conexion,
         ubicacion_actual: c.ubicacion_actual ? 'PRESENT' : 'NULL'
       });
     });

     const lista = calcularConductoresEnZona(data as ConductorCercanoRaw[], location);
     console.log(`[DEBUG] Conductores after filtering: ${lista.length}`);
     lista.forEach((c, idx) => {
       console.log(`[AFTER FILTER ${idx}]`, {
         id: c.id,
         distancia_km: c.distanciaConductorKm.toFixed(2),
         atraso_ms: c.actualizadoHaceMs
       });
     });
     
     setConductoresZonaLista(lista);
     setConductoresZonaRealtime(lista.length);
     if (!silent) setActualizandoZona(false);
   }, [calcularConductoresEnZona]);

  const programarRefreshConductoresZona = useCallback((location: [number, number] | null) => {
    if (!location) return;

    if (refreshConductoresTimeoutRef.current) {
      clearTimeout(refreshConductoresTimeoutRef.current);
    }

    refreshConductoresTimeoutRef.current = setTimeout(() => {
      void refrescarConductoresZona(location, true);
    }, 250);
  }, [refrescarConductoresZona]);

  // === Auth & Session ===
  useEffect(() => {
    const iniciar = async () => {
      const { session } = await obtenerSesionSegura();
      if (!session) { router.push('/auth/login'); return; }

      const { user } = await obtenerUsuarioSeguro();
      if (user?.user_metadata?.nombre) setNombreUsuario(user.user_metadata.nombre);
      setUserId(user?.id || '');

      // Check existing active trip
      if (user?.id) {
        const { data: viaje } = await obtenerViajeActivoPasajero(user.id);
        if (viaje) {
          setViajeActivo(viaje);
          if (viaje.estado === 'solicitado') setPaso('esperando');
          else if (viaje.estado === 'aceptado' || viaje.estado === 'en_curso') setPaso('viaje_activo');
        } else {
          // Evita arrastrar destino visual de una sesión previa cuando no hay viaje activo.
          setDestinoSeleccionado(null);
          setQueryDestino('');
          setResultados([]);
          setPaso('inicio');
        }
      }

      setLoading(false);
    };
    iniciar();
  }, [router]);

  useEffect(() => {
    if (!userLocation) return;

    void refrescarConductoresZona(userLocation);
    const interval = setInterval(() => {
      void refrescarConductoresZona(userLocation, true);
    }, 20000);

    return () => clearInterval(interval);
  }, [userLocation, refrescarConductoresZona]);

  useEffect(() => {
    if (!userLocation) return;

    const channel = supabase
      .channel('conductores-zona-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conductores',
        },
        () => {
          programarRefreshConductoresZona(userLocation);
        }
      )
      .subscribe();

    return () => {
      if (refreshConductoresTimeoutRef.current) {
        clearTimeout(refreshConductoresTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [userLocation, programarRefreshConductoresZona]);

  useEffect(() => {
    if (!userId) return;

    const raw = localStorage.getItem(keyHistorialDestinos(userId));
    if (!raw) {
      setHistorialDestinos([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ResultadoBusqueda[];
      if (Array.isArray(parsed)) {
        setHistorialDestinos(parsed.slice(0, HISTORIAL_DESTINOS_MAX));
      } else {
        setHistorialDestinos([]);
      }
    } catch {
      setHistorialDestinos([]);
    }
  }, [userId, keyHistorialDestinos]);

  // === GPS del usuario — obtener ubicación real ===
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      setUserLocation(IXTLAHUACA_CENTER);
      return;
    }

    let ubicacionObtenida = false;

    // 1. Intentar obtener posición inmediata
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = normalizarUbicacion(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
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
          setUserLocation(IXTLAHUACA_CENTER);
          setOrigenDireccion('Ixtlahuaca, México');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // 2. Seguir observando cambios de posición
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = normalizarUbicacion(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
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

  // === Actualizar última conexión del pasajero ===
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(async () => {
      await supabase.from('usuarios').update({
        actualizado_en: new Date().toISOString(),
      }).eq('id', userId);
    }, 15000); // Cada 15 segundos para marcar actividad

    return () => clearInterval(interval);
  }, [userId]);

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
          setQueryDestino('');
          setResultados([]);
          setConductorLocation(null);
        }, 5000);
      } else if (viajeActualizado.estado === 'cancelado') {
        setPaso('inicio');
        setViajeActivo(null);
        setDestinoSeleccionado(null);
        setQueryDestino('');
        setResultados([]);
        setConductorLocation(null);
      }
    });

    // Suscribirse a la ubicación del conductor si el viaje está activo
    let gpsChannel: any = null;
    if (viajeActivo.conductor_id && (viajeActivo.estado === 'aceptado' || viajeActivo.estado === 'en_curso')) {
      gpsChannel = suscribirseAUbicacionConductor(viajeActivo.conductor_id, (payload: any) => {
        if (payload.ubicacion_actual) {
          // Parsear POINT(lng lat) o usar GeoJSON
          // Dependiendo de cómo lo devuelva Supabase Realtime
          console.log('GPS Conductor recibido:', payload.ubicacion_actual);
          // Un hack simple si viene como string:
          if (typeof payload.ubicacion_actual === 'string') {
             const coords = payload.ubicacion_actual.replace('POINT(', '').replace(')', '').split(' ');
             setConductorLocation([parseFloat(coords[1]), parseFloat(coords[0])]);
          } else if (payload.ubicacion_actual.coordinates) {
             setConductorLocation([payload.ubicacion_actual.coordinates[1], payload.ubicacion_actual.coordinates[0]]);
          }
        }
      });
    }

    return () => { 
      supabase.removeChannel(channel); 
      if (gpsChannel) supabase.removeChannel(gpsChannel);
    };
  }, [viajeActivo?.id, viajeActivo?.conductor_id, viajeActivo?.estado]);

  useEffect(() => {
    if (!viajeActivo || (paso !== 'viaje_activo' && paso !== 'esperando')) {
      setRutaActiva([]);
      setResumenRuta(null);
      return;
    }

    let cancelado = false;

    const ejecutar = async () => {
      const pasajeroPosicion = userLocation ? [userLocation[0], userLocation[1]] as PuntoRuta : null;
      const conductorPosicion = conductorLocation ? [conductorLocation[0], conductorLocation[1]] as PuntoRuta : null;

      await calcularRutaSegunEstado(viajeActivo, conductorPosicion, pasajeroPosicion);
      if (cancelado) return;
    };

    void ejecutar();

    return () => {
      cancelado = true;
    };
  }, [
    viajeActivo?.id,
    viajeActivo?.estado,
    viajeActivo?.origen_lat,
    viajeActivo?.origen_lng,
    viajeActivo?.destino_lat,
    viajeActivo?.destino_lng,
    conductorLocation?.[0],
    conductorLocation?.[1],
    userLocation?.[0],
    userLocation?.[1],
    paso,
    calcularRutaSegunEstado,
  ]);

  // === Buscar destinos con debounce ===
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (queryDestino.trim().length < 3) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setBuscando(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const res = await buscarDireccion(queryDestino);
      if (requestId !== searchRequestIdRef.current) return;
      setResultados(res);
      setBuscando(false);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [queryDestino]);

  const calcularSugerenciasConductor = useCallback(async () => {
    if (!userLocation || !destinoSeleccionado) {
      setSugerenciasViaje([]);
      setConductoresCercanos(0);
      return;
    }

    setCargandoSugerencias(true);
    const { data, error: conductoresError } = await supabase
      .from('conductores')
      .select('id, ubicacion_actual, ultima_conexion, esta_disponible')
      .eq('esta_disponible', true)
      .not('ubicacion_actual', 'is', null)
      .limit(40);

    if (conductoresError || !Array.isArray(data)) {
      setSugerenciasViaje([]);
      setConductoresCercanos(0);
      setCargandoSugerencias(false);
      return;
    }

    const distanciaTrayectoKm = distanciaKm(
      userLocation[0],
      userLocation[1],
      destinoSeleccionado.lat,
      destinoSeleccionado.lng
    );
    const ahora = Date.now();

    const candidatos = (data as ConductorCercanoRaw[])
      .map((c) => {
        const coords = extraerCoordsConductor(c.ubicacion_actual);
        if (!coords) return null;

        const actualizadoHaceMs = c.ultima_conexion
          ? ahora - new Date(c.ultima_conexion).getTime()
          : 0;

        const distanciaConductorKm = distanciaKm(coords[0], coords[1], userLocation[0], userLocation[1]);
        const etaRecogidaMin = Math.max(2, Math.ceil((distanciaConductorKm / 25) * 60));
        const etaViajeMin = Math.max(3, Math.ceil((distanciaTrayectoKm / 30) * 60));

        return {
          id: c.id,
          distanciaConductorKm,
          etaRecogidaMin,
          etaTotalMin: etaRecogidaMin + etaViajeMin,
          actualizadoHaceMs,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => item.actualizadoHaceMs <= 120000)
      .sort((a, b) => a.distanciaConductorKm - b.distanciaConductorKm);

    setConductoresCercanos(candidatos.length);

    const sugerencias = candidatos.slice(0, 3).map((c, index) => ({
      id: c.id,
      titulo: tituloSugerencia(index, c.etaRecogidaMin),
      detalle: `${c.distanciaConductorKm.toFixed(1)} km del punto de recogida`,
      etaRecogidaMin: c.etaRecogidaMin,
      etaTotalMin: c.etaTotalMin,
    }));

    setSugerenciasViaje(sugerencias);
    setCargandoSugerencias(false);
  }, [userLocation, destinoSeleccionado]);

  useEffect(() => {
    if (paso !== 'confirmar') return;

    const timer = setTimeout(() => {
      void calcularSugerenciasConductor();
    }, 0);
    const interval = setInterval(calcularSugerenciasConductor, 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [paso, calcularSugerenciasConductor]);

  // === Update map markers ===
  useEffect(() => {
    const marks: typeof marcadores = [];

    if (viajeActivo?.origen_lat != null && viajeActivo?.origen_lng != null) {
      marks.push({
        id: 'origen-viaje',
        lat: Number(viajeActivo.origen_lat),
        lng: Number(viajeActivo.origen_lng),
        tipo: 'usuario',
        label: viajeActivo.origen_direccion || 'Punto de recogida',
      });
    }

    if (viajeActivo?.destino_lat != null && viajeActivo?.destino_lng != null) {
      marks.push({
        id: 'destino-viaje',
        lat: Number(viajeActivo.destino_lat),
        lng: Number(viajeActivo.destino_lng),
        tipo: 'destino',
        label: viajeActivo.destino_direccion || 'Destino',
      });
    } else if (destinoSeleccionado) {
      marks.push({
        id: 'destino',
        lat: destinoSeleccionado.lat,
        lng: destinoSeleccionado.lng,
        tipo: 'destino',
        label: destinoSeleccionado.nombre,
      });
    }
    if (conductorLocation) {
      marks.push({
        id: 'conductor',
        lat: conductorLocation[0],
        lng: conductorLocation[1],
        tipo: 'conductor',
        label: 'Tu Taxi en camino',
      });
    } else if (!viajeActivo) {
      conductoresZonaLista.forEach((conductor, idx) => {
        marks.push({
          id: `conductor-zona-${conductor.id}`,
          lat: conductor.lat,
          lng: conductor.lng,
          tipo: 'conductor',
          label: `Conductor cerca ${idx + 1} · ${conductor.distanciaConductorKm.toFixed(1)} km`,
        });
      });
    }
    setMarcadores(marks);
  }, [destinoSeleccionado, viajeActivo, conductorLocation, conductoresZonaLista]);

  // === Acciones ===
  const manejarClickMapa = useCallback(async (lat: number, lng: number) => {
    // Solo permitir cambiar ubicación si estamos en el paso de inicio o confirmación
    if (paso === 'inicio' || paso === 'confirmar' || paso === 'buscando_destino') {
      const coords: [number, number] = [lat, lng];
      setUserLocation(coords);
      const dir = await obtenerDireccion(lat, lng);
      setOrigenDireccion(dir.split(',').slice(0, 2).join(','));
      
      // Si ya teníamos destino, recalcular precio
      if (destinoSeleccionado) {
        const precio = calcularPrecioEstimado(
          { lat, lng },
          { lat: destinoSeleccionado.lat, lng: destinoSeleccionado.lng }
        );
        setPrecioEstimado(precio);
      }
    }
  }, [paso, destinoSeleccionado]);

  const seleccionarDestino = useCallback((resultado: ResultadoBusqueda) => {
    setDestinoSeleccionado(resultado);
    setQueryDestino(resultado.nombre);
    setResultados([]);
    setPaso('confirmar');
    guardarDestinoEnHistorial(resultado);

    if (userLocation) {
      const precio = calcularPrecioEstimado(
        { lat: userLocation[0], lng: userLocation[1] },
        { lat: resultado.lat, lng: resultado.lng }
      );
      setPrecioEstimado(precio);
    }
  }, [userLocation, guardarDestinoEnHistorial]);

  const forzarIxtlahuaca = () => {
    const coords: [number, number] = [19.568, -99.768];
    setUserLocation(coords);
    setOrigenDireccion('Centro, Ixtlahuaca');
  };

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
    if (!viajeActivo || cancelandoViaje) return;

    setCancelandoViaje(true);
    await cancelarViaje(viajeActivo.id);
    setViajeActivo(null);
    setDestinoSeleccionado(null);
    setQueryDestino('');
    setResultados([]);
    setConductorLocation(null);
    setPrecioEstimado(0);
    setPaso('inicio');
    setCancelandoViaje(false);
  }, [viajeActivo, cancelandoViaje]);

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
          ruta={rutaActiva}
          colorRuta={paso === 'viaje_activo' ? '#34d399' : '#38bdf8'}
          onMapClick={manejarClickMapa}
        />
      </div>

      {/* BOTÓN FLOTANTE PARA CORREGIR GPS */}
      {paso === 'inicio' && (
        <button 
          onClick={forzarIxtlahuaca}
          className="absolute right-6 bottom-72 z-20 p-4 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-full text-blue-400 shadow-2xl hover:bg-blue-500/20 transition-all pointer-events-auto group"
          title="Corregir ubicación a Ixtlahuaca"
        >
          <svg className="w-6 h-6 group-hover:rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

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
            <p className="text-[10px] text-blue-300 mt-0.5">
              Conductores en tu zona ({RADIO_ZONA_KM} km): {actualizandoZona ? 'actualizando...' : conductoresZonaRealtime}
            </p>
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
                onChange={(e) => setOrigenDireccion(e.target.value)}
                placeholder="Tu ubicación (o toca el mapa)"
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 italic">GPS</span>
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
            <div className="flex flex-wrap gap-3">
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

            {historialDestinos.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Historial reciente</p>
                <div className="flex flex-wrap gap-2">
                  {historialDestinos.map((destino) => (
                    <button
                      key={`hist-${destino.id}`}
                      onClick={() => seleccionarDestino(destino)}
                      className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-200 text-xs hover:bg-blue-500/20 transition"
                    >
                      {destino.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase text-gray-400 font-semibold">Conductores cercanos en tiempo real</p>
                <p className="text-xs text-emerald-300 font-semibold">{actualizandoZona ? 'actualizando...' : `${conductoresZonaRealtime} activos`}</p>
              </div>

              {conductoresZonaLista.length === 0 ? (
                <p className="text-xs text-gray-500">Aun no hay conductores cercanos en tu radio actual.</p>
              ) : (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {conductoresZonaLista.slice(0, 8).map((conductor, idx) => (
                    <div key={`lista-conductor-${conductor.id}`} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">Conductor #{idx + 1}</span>
                      <span className="text-blue-300 font-semibold">{conductor.distanciaConductorKm.toFixed(1)} km</span>
                    </div>
                  ))}
                </div>
              )}
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
          <div className="pointer-events-auto bg-[#0f1629]/95 backdrop-blur-2xl border-t border-white/10 p-6 rounded-t-[2rem] shadow-2xl max-h-[78vh] overflow-y-auto">
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

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-300 text-sm font-semibold">Sugerencias por distancia de conductores</p>
                <p className="text-xs text-gray-400">{conductoresCercanos} cerca</p>
              </div>

              {cargandoSugerencias && (
                <p className="text-gray-400 text-sm">Analizando conductores cercanos...</p>
              )}

              {!cargandoSugerencias && sugerenciasViaje.length === 0 && (
                <p className="text-gray-400 text-sm">No hay suficientes conductores activos para sugerir tiempos.</p>
              )}

              {!cargandoSugerencias && sugerenciasViaje.length > 0 && (
                <div className="space-y-2">
                  {sugerenciasViaje.map((s) => (
                    <div key={s.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-white text-sm font-semibold">{s.titulo}</p>
                        <p className="text-emerald-400 text-sm font-bold">{s.etaRecogidaMin} min recogida</p>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">{s.detalle}</p>
                      <p className="text-blue-300 text-xs mt-1">Tiempo total estimado del viaje: {s.etaTotalMin} min</p>
                    </div>
                  ))}
                </div>
              )}
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

            {resumenRuta && rutaActiva.length > 1 && (
              <div className="w-full max-w-sm mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-left">
                <p className="text-blue-200 text-[11px] uppercase tracking-wide font-semibold">Ruta estimada conductor → recogida</p>
                <p className="text-white text-sm font-semibold mt-1">
                  {resumenRuta.distanciaKm.toFixed(1)} km · {resumenRuta.duracionMin} min aprox.
                </p>
                <p className="text-blue-200/90 text-xs mt-1">La ruta ya se muestra en el mapa en tiempo real.</p>
              </div>
            )}

            <button
              onClick={cancelar}
              className="px-8 py-3 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-red-400 transition-all font-medium"
            >
              {cancelandoViaje ? 'Cancelando...' : 'Cancelar solicitud'}
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
              {resumenRuta && rutaActiva.length > 1 && (
                <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-emerald-200 text-[11px] uppercase tracking-wide font-semibold">Ruta activa del viaje</p>
                  <p className="text-white text-sm font-semibold mt-1">
                    {resumenRuta.distanciaKm.toFixed(1)} km · {resumenRuta.duracionMin} min aprox.
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Precio estimado</span>
                <span className="text-white font-bold text-lg">${viajeActivo.precio_estimado}</span>
              </div>
            </div>

            <button
              onClick={cancelar}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-red-400 transition-all font-medium"
            >
              {cancelandoViaje ? 'Cancelando viaje...' : 'Cancelar viaje'}
            </button>
          </div>
        )}

        {/* === PASO: COMPLETADO === */}
        {paso === 'completado' && viajeActivo && (
          <div className="pointer-events-auto bg-[#0f1629]/95 backdrop-blur-2xl border-t border-emerald-500/30 p-8 rounded-t-[2rem] shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">¡Viaje completado!</h3>
            <p className="text-gray-400 mb-2">Gracias por viajar con Ixtlappp</p>
            <p className="text-2xl font-black text-emerald-400">${viajeActivo.precio_final || viajeActivo.precio_estimado}</p>
          </div>
        )}
      </main>
    </div>
  );
}
