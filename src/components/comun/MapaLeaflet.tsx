'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Coordenadas de Ixtlahuaca, Estado de México
const IXTLAHUACA_CENTER: [number, number] = [19.568, -99.768];

interface MapaProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  marcadores?: Array<{
    id: string;
    lat: number;
    lng: number;
    tipo: 'usuario' | 'destino' | 'conductor';
    label?: string;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  userLocation?: [number, number] | null;
  darkMode?: boolean;
  ruta?: Array<[number, number]>;
  colorRuta?: string;
}

// Custom markers using divIcons (no external images needed)
function crearIcono(tipo: 'usuario' | 'destino' | 'conductor') {
  const colores = {
    usuario: { bg: '#3b82f6', border: '#1d4ed8', icon: '📍' },
    destino: { bg: '#ef4444', border: '#b91c1c', icon: '🏁' },
    conductor: { bg: '#10b981', border: '#047857', icon: '🚕' },
  };
  const c = colores[tipo];

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 36px; height: 36px;
      background: ${c.bg};
      border: 3px solid ${c.border};
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      transform: translate(-50%, -50%);
    ">${c.icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function MapaLeaflet({
  center = IXTLAHUACA_CENTER,
  zoom = 14,
  className = '',
  marcadores = [],
  onMapClick,
  userLocation,
  darkMode = true,
  ruta = [],
  colorRuta = '#22d3ee',
}: MapaProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const hasCenteredOnRouteRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hasCenteredOnRouteRef.current = false;
  }, [colorRuta]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // OpenStreetMap tiles - dark or light
    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    setReady(true);

    // Force a resize after a small delay to fix rendering issues
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !ready) return;

    const currentIds = new Set(marcadores.map((m) => m.id));

    // Remove old markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add/update markers
    marcadores.forEach((m) => {
      const existing = markersRef.current.get(m.id);
      if (existing) {
        existing.setLatLng([m.lat, m.lng]);
      } else {
        const marker = L.marker([m.lat, m.lng], {
          icon: crearIcono(m.tipo),
        }).addTo(mapRef.current!);
        if (m.label) {
          marker.bindPopup(m.label);
        }
        markersRef.current.set(m.id, marker);
      }
    });
  }, [marcadores, ready]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !ready || !userLocation) return;

    // Update or create the user location marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
    } else {
      const marker = L.marker(userLocation, {
        icon: L.divIcon({
          className: 'user-pulse-marker',
          html: `<div style="
            position: relative;
            width: 22px; height: 22px;
          ">
            <div style="
              position: absolute; inset: -10px;
              background: rgba(59,130,246,0.25);
              border-radius: 50%;
              animation: pulse-ring 2s ease-out infinite;
            "></div>
            <div style="
              width: 22px; height: 22px;
              background: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 12px rgba(59,130,246,0.6);
            "></div>
          </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }).addTo(mapRef.current);
      userMarkerRef.current = marker;
    }

    // Center map on user location ONLY the first time we get real GPS
    if (!hasCenteredOnUserRef.current) {
      mapRef.current.setView(userLocation, 16, { animate: true });
      hasCenteredOnUserRef.current = true;
    }
  }, [userLocation, ready]);

  // Draw route polyline (conductor -> pasajero / pasajero -> destino)
  useEffect(() => {
    if (!mapRef.current || !ready) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (!Array.isArray(ruta) || ruta.length < 2) {
      hasCenteredOnRouteRef.current = false;
      return;
    }

    routeLineRef.current = L.polyline(ruta, {
      color: colorRuta,
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '10 8',
    }).addTo(mapRef.current);

    if (!hasCenteredOnRouteRef.current) {
      const bounds = routeLineRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, {
          padding: [70, 70],
          maxZoom: 16,
          animate: true,
        });
        hasCenteredOnRouteRef.current = true;
      }
    }
  }, [ruta, colorRuta, ready]);

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        .custom-marker { background: none !important; border: none !important; }
        .user-pulse-marker { background: none !important; border: none !important; }
      `}</style>
      <div ref={containerRef} className={`w-full h-full ${className}`} />
    </>
  );
}
