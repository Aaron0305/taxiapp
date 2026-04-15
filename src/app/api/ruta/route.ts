import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Punto = [number, number];

type OsrmRoute = {
  distance?: number;
  duration?: number;
  geometry?: {
    coordinates?: [number, number][];
  };
};

type OsrmResponse = {
  routes?: OsrmRoute[];
};

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

function esNumeroValido(valor: number) {
  return Number.isFinite(valor);
}

function calcularDistanciaKm(aLat: number, aLng: number, bLat: number, bLng: number) {
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

function respuestaFallback(origen: Punto, destino: Punto) {
  const distanciaKm = calcularDistanciaKm(origen[0], origen[1], destino[0], destino[1]);
  const duracionMin = Math.max(2, Math.ceil((distanciaKm / 28) * 60));

  return NextResponse.json({
    puntos: [origen, destino],
    distanciaKm,
    duracionMin,
    proveedor: 'fallback',
  });
}

async function obtenerRutaOsrm(origen: Punto, destino: Punto): Promise<{
  puntos: Punto[];
  distanciaKm: number;
  duracionMin: number;
} | null> {
  const [oLat, oLng] = origen;
  const [dLat, dLng] = destino;

  const url = `${OSRM_BASE_URL}/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson&steps=false`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as OsrmResponse;
    const ruta = data?.routes?.[0];
    const coordenadas = ruta?.geometry?.coordinates;

    if (!Array.isArray(coordenadas) || coordenadas.length < 2) return null;

    const puntos: Punto[] = coordenadas
      .map((coord) => {
        if (!Array.isArray(coord) || coord.length < 2) return null;
        const lng = Number(coord[0]);
        const lat = Number(coord[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng] as Punto;
      })
      .filter((punto): punto is Punto => Boolean(punto));

    if (puntos.length < 2) return null;

    const distanciaKm = Number(ruta?.distance ?? 0) / 1000;
    const duracionMin = Math.max(1, Math.round(Number(ruta?.duration ?? 0) / 60));

    return {
      puntos,
      distanciaKm: Number.isFinite(distanciaKm) && distanciaKm > 0
        ? distanciaKm
        : calcularDistanciaKm(oLat, oLng, dLat, dLng),
      duracionMin,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const oLat = Number(searchParams.get('oLat'));
  const oLng = Number(searchParams.get('oLng'));
  const dLat = Number(searchParams.get('dLat'));
  const dLng = Number(searchParams.get('dLng'));

  if (![oLat, oLng, dLat, dLng].every(esNumeroValido)) {
    return NextResponse.json({ error: 'Parámetros de ruta inválidos' }, { status: 400 });
  }

  const origen: Punto = [oLat, oLng];
  const destino: Punto = [dLat, dLng];

  const ruta = await obtenerRutaOsrm(origen, destino);
  if (!ruta) {
    return respuestaFallback(origen, destino);
  }

  return NextResponse.json({
    puntos: ruta.puntos,
    distanciaKm: ruta.distanciaKm,
    duracionMin: ruta.duracionMin,
    proveedor: 'osrm',
  });
}
