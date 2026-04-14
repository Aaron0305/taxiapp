'use client';

interface MapaNavegacionProps {
  origenLat?: number;
  origenLng?: number;
  destinoLat?: number;
  destinoLng?: number;
}

/**
 * Placeholder para mapa de navegación del conductor.
 * TODO: Integrar con Google Maps Directions API.
 */
export default function MapaNavegacion({ origenLat, origenLng, destinoLat, destinoLng }: MapaNavegacionProps) {
  const tieneRuta = origenLat && origenLng && destinoLat && destinoLng;

  return (
    <div className="relative w-full h-64 bg-[#111827] border border-white/10 rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/dataviz-dark/256/0/0/0.png')] bg-cover bg-center opacity-30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-gray-400 text-sm font-medium">
          {tieneRuta ? 'Navegando hacia destino...' : 'Esperando ruta...'}
        </p>
      </div>
    </div>
  );
}
