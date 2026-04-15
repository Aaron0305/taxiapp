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

type ResultadoGeocodificacion = {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
};

type LugarLocal = ResultadoGeocodificacion & {
  aliases?: string[];
};

const STOPWORDS = new Set(['de', 'la', 'el', 'del', 'los', 'las', 'y', 'a', 'en', 'al']);

const LUGARES_IXTLAHUACA: LugarLocal[] = [
  {
    id: 'local-cui',
    nombre: 'CUI Universidad de Ixtlahuaca',
    direccion: 'CUI, Ixtlahuaca, Estado de Mexico',
    lat: 19.5665,
    lng: -99.7617,
    aliases: ['cui', 'universidad de ixtlahuaca', 'ui', 'universidad ixtlahuaca', 'cui de ixtlahuaca'],
  },
  {
    id: 'local-centro',
    nombre: 'Centro Ixtlahuaca',
    direccion: 'Centro, Ixtlahuaca, Estado de Mexico',
    lat: 19.568,
    lng: -99.768,
    aliases: ['zocalo ixtlahuaca', 'centro de ixtlahuaca', 'plaza central ixtlahuaca'],
  },
  {
    id: 'local-terminal',
    nombre: 'Terminal de Autobuses Ixtlahuaca',
    direccion: 'Terminal, Ixtlahuaca, Estado de Mexico',
    lat: 19.57,
    lng: -99.765,
    aliases: ['terminal ixtlahuaca', 'autobuses ixtlahuaca', 'terminal camionera'],
  },
  {
    id: 'local-mercado',
    nombre: 'Mercado Municipal Ixtlahuaca',
    direccion: 'Mercado, Ixtlahuaca, Estado de Mexico',
    lat: 19.5665,
    lng: -99.7672,
    aliases: ['mercado ixtlahuaca', 'mercado municipal', 'tianguis ixtlahuaca'],
  },
  {
    id: 'local-palacio',
    nombre: 'Palacio Municipal de Ixtlahuaca',
    direccion: 'Palacio Municipal, Ixtlahuaca, Estado de Mexico',
    lat: 19.5677,
    lng: -99.7677,
    aliases: ['presidencia ixtlahuaca', 'ayuntamiento ixtlahuaca', 'palacio ixtlahuaca'],
  },
  {
    id: 'local-imss',
    nombre: 'Clinica IMSS Ixtlahuaca',
    direccion: 'IMSS, Ixtlahuaca, Estado de Mexico',
    lat: 19.5712,
    lng: -99.7639,
    aliases: ['imss ixtlahuaca', 'clinica ixtlahuaca', 'hospital imss'],
  },
  {
    id: 'local-soriana',
    nombre: 'Soriana Ixtlahuaca',
    direccion: 'Soriana, Ixtlahuaca, Estado de Mexico',
    lat: 19.5639,
    lng: -99.7631,
    aliases: ['soriana ixtlahuaca', 'soriana', 'supermercado ixtlahuaca'],
  },
  {
    id: 'local-aurrera',
    nombre: 'Bodega Aurrera Ixtlahuaca',
    direccion: 'Bodega Aurrera, Ixtlahuaca, Estado de Mexico',
    lat: 19.5628,
    lng: -99.7622,
    aliases: ['aurrera ixtlahuaca', 'bodega ixtlahuaca', 'aurrera'],
  },
  {
    id: 'local-issste',
    nombre: 'Clinica ISSSTE Ixtlahuaca',
    direccion: 'ISSSTE, Ixtlahuaca, Estado de Mexico',
    lat: 19.5698,
    lng: -99.7704,
    aliases: ['issste ixtlahuaca', 'clinica issste', 'hospital issste'],
  },
  {
    id: 'local-toluca',
    nombre: 'Salida a Toluca Ixtlahuaca',
    direccion: 'Carretera Toluca-Ixtlahuaca, Ixtlahuaca, Estado de Mexico',
    lat: 19.5598,
    lng: -99.7788,
    aliases: ['toluca ixtlahuaca', 'salida toluca', 'carretera toluca'],
  },
];

function direccionPorCoordenadas(lat: number, lng: number) {
  return `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function obtenerTokensBusqueda(queryNormalizada: string) {
  return queryNormalizada
    .split(' ')
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function buscarEnLugaresLocales(query: string): ResultadoGeocodificacion[] {
  const queryNormalizada = normalizarTexto(query);
  if (!queryNormalizada) return [];

  const tokens = obtenerTokensBusqueda(queryNormalizada);

  const candidatos = LUGARES_IXTLAHUACA.map((lugar) => {
    const corpus = normalizarTexto([
      lugar.nombre,
      lugar.direccion,
      ...(lugar.aliases || []),
    ].join(' '));

    const contieneConsultaCompleta = corpus.includes(queryNormalizada);
    const palabrasCorpus = corpus.split(' ');
    let tokensCoincidentes = 0;
    let puntaje = contieneConsultaCompleta ? 120 : 0;

    for (const token of tokens) {
      if (corpus.includes(token)) {
        tokensCoincidentes += 1;
        puntaje += token.length >= 5 ? 24 : 14;
        continue;
      }

      const parecidoPorPrefijo = palabrasCorpus.some((palabra) =>
        palabra.startsWith(token) || token.startsWith(palabra)
      );

      if (parecidoPorPrefijo) {
        tokensCoincidentes += 1;
        puntaje += 7;
      }
    }

    return {
      lugar,
      puntaje,
      contieneConsultaCompleta,
      tokensCoincidentes,
      totalTokens: tokens.length,
    };
  });

  const filtrados = candidatos
    .filter((item) => {
      if (item.contieneConsultaCompleta) return true;
      if (item.totalTokens === 0) return false;
      if (item.totalTokens === 1) return item.tokensCoincidentes >= 1;
      return item.tokensCoincidentes >= 2;
    })
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, 8)
    .map(({ lugar }) => ({
      id: lugar.id,
      nombre: lugar.nombre,
      direccion: lugar.direccion,
      lat: lugar.lat,
      lng: lugar.lng,
    }));

  return filtrados;
}

function deduplicarResultados(resultados: ResultadoGeocodificacion[]) {
  const vistos = new Set<string>();

  return resultados.filter((item) => {
    const key = `${normalizarTexto(item.nombre)}-${item.lat.toFixed(4)}-${item.lng.toFixed(4)}`;
    if (vistos.has(key)) return false;
    vistos.add(key);
    return true;
  });
}

function mapearResultados(items: NominatimSearchItem[]): ResultadoGeocodificacion[] {
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
    query,
    `${query}, Ixtlahuaca, Estado de Mexico, Mexico`,
  ];

  const acumulados: NominatimSearchItem[] = [];

  for (const [index, q] of consultas.entries()) {
    const aplicarSesgoLocal = index > 0;
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '8',
      addressdetails: '1',
      countrycodes: 'mx',
      bounded: '0',
    });

    if (aplicarSesgoLocal) {
      params.set('viewbox', '-99.9,19.7,-99.6,19.4');
    }

    const response = await fetchJsonConTimeout(`${NOMINATIM_BASE_URL}/search?${params}`);
    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as NominatimSearchItem[];
    if (Array.isArray(data)) {
      acumulados.push(...data);
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

async function buscarConPhoton(query: string): Promise<ResultadoGeocodificacion[]> {
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
    .filter((item): item is ResultadoGeocodificacion => Boolean(item));
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

    const resultadosLocales = buscarEnLugaresLocales(q);
    const resultadosNominatim = await buscarConNominatim(q);
    const resultadosPhoton = await buscarConPhoton(q);

    const resultados = deduplicarResultados([
      ...resultadosLocales,
      ...resultadosNominatim,
      ...resultadosPhoton,
    ]).slice(0, 8);

    return NextResponse.json({ resultados });
  } catch {
    return NextResponse.json({ resultados: [] }, { status: 200 });
  }
}
