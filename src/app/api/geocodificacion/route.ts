import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type NominatimSearchItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

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

      const params = new URLSearchParams({
        lat,
        lon: lng,
        format: 'json',
        zoom: '18',
      });

      const response = await fetchJsonConTimeout(`${NOMINATIM_BASE_URL}/reverse?${params}`);
      if (!response.ok) {
        return NextResponse.json({ direccion: 'Ubicación desconocida' });
      }

      const data = await response.json();
      return NextResponse.json({ direccion: data?.display_name || 'Ubicación desconocida' });
    }

    const q = (searchParams.get('q') || '').trim();
    if (q.length < 3) {
      return NextResponse.json({ resultados: [] });
    }

    const resultados = await buscarConNominatim(q);
    return NextResponse.json({ resultados });
  } catch {
    return NextResponse.json({ resultados: [] }, { status: 200 });
  }
}