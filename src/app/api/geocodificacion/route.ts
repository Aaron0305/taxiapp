import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type NominatimSearchItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type PhotonFeature = {
  properties?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE_URL = 'https://photon.komoot.io';

function direccionPorCoordenadas(lat: number, lng: number) {
  return `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
}

function mapearResultados(items: NominatimSearchItem[]) {
  return items.map((item) => ({
    id: String(item.place_id),
    nombre: item.display_name.split(',')[0] || item.display_name,
    direccion: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

async function fetchJsonConTimeout(url: string, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'Ixtlappp-Ixtlahuaca/1.0 (contacto: soporte@ixtlappp.local)',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function buscarConNominatim(query: string) {
  const consultas = [
    `${query}, Ixtlahuaca, Estado de Mexico, Mexico`,
    query,
  ];

  const acumulados: NominatimSearchItem[] = [];

  for (const q of consultas) {
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '8',
      addressdetails: '1',
      viewbox: '-99.9,19.7,-99.6,19.4',
      bounded: '0',
    });

    const response = await fetchJsonConTimeout(`${NOMINATIM_BASE_URL}/search?${params}`);
    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as NominatimSearchItem[];
    if (Array.isArray(data)) {
      acumulados.push(...data);
    }

    if (acumulados.length >= 8) {
      break;
    }
  }

  const vistos = new Set<string>();
  const unicos = acumulados.filter((item) => {
    const key = `${item.place_id}-${item.lat}-${item.lon}`;
    if (vistos.has(key)) return false;
    vistos.add(key);
    return true;
  });

  return mapearResultados(unicos.slice(0, 8));
}

async function buscarConPhoton(query: string) {
  const params = new URLSearchParams({
    q: query,
    lang: 'es',
    limit: '8',
  });

  const response = await fetchJsonConTimeout(`${PHOTON_BASE_URL}/api/?${params}`);
  if (!response.ok) return [];

  const data = await response.json() as { features?: PhotonFeature[] };
  const features = Array.isArray(data?.features) ? data.features : [];

  return features
    .map((f, idx) => {
      const coords = f.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;

      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const nombre = f.properties?.name || f.properties?.street || 'Lugar';
      const direccion = [
        f.properties?.street,
        f.properties?.city,
        f.properties?.state,
        f.properties?.country,
      ].filter(Boolean).join(', ') || nombre;

      return {
        id: `photon-${idx}-${lat}-${lng}`,
        nombre,
        direccion,
        lat,
        lng,
      };
    })
    .filter((item): item is { id: string; nombre: string; direccion: string; lat: number; lng: number } => Boolean(item));
}

async function resolverDireccionReverse(lat: number, lng: number) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    zoom: '18',
  });

  const response = await fetchJsonConTimeout(`${NOMINATIM_BASE_URL}/reverse?${params}`);
  if (!response.ok) return null;

  const data = await response.json() as { display_name?: string };
  return data?.display_name || null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'search';

    if (mode === 'reverse') {
      const lat = searchParams.get('lat');
      const lng = searchParams.get('lng');
      if (!lat || !lng) {
        return NextResponse.json({ error: 'lat y lng son requeridos' }, { status: 400 });
      }

      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        return NextResponse.json({ direccion: 'Ubicación inválida' }, { status: 400 });
      }

      const direccion = await resolverDireccionReverse(latNum, lngNum);
      return NextResponse.json({ direccion: direccion || direccionPorCoordenadas(latNum, lngNum) });
    }

    const q = (searchParams.get('q') || '').trim();
    if (q.length < 3) {
      return NextResponse.json({ resultados: [] });
    }

    const resultadosNominatim = await buscarConNominatim(q);
    if (resultadosNominatim.length > 0) {
      return NextResponse.json({ resultados: resultadosNominatim });
    }

    const resultadosPhoton = await buscarConPhoton(q);
    if (resultadosPhoton.length > 0) {
      return NextResponse.json({ resultados: resultadosPhoton });
    }

    const fallbackLocal = [
      { id: 'fallback-centro', nombre: 'Centro Ixtlahuaca', direccion: 'Centro, Ixtlahuaca, Estado de México', lat: 19.568, lng: -99.768 },
      { id: 'fallback-terminal', nombre: 'Terminal de Autobuses Ixtlahuaca', direccion: 'Terminal, Ixtlahuaca, Estado de México', lat: 19.57, lng: -99.765 },
      { id: 'fallback-mercado', nombre: 'Mercado Ixtlahuaca', direccion: 'Mercado, Ixtlahuaca, Estado de México', lat: 19.5665, lng: -99.7672 },
    ].filter((item) => item.nombre.toLowerCase().includes(q.toLowerCase()) || item.direccion.toLowerCase().includes(q.toLowerCase()));

    const resultados = fallbackLocal;
    return NextResponse.json({ resultados });
  } catch {
    return NextResponse.json({ resultados: [] }, { status: 200 });
  }
}