'use client';

interface MapaConTaxiProps {
  buscando: boolean;
}

/**
 * Placeholder del mapa con indicador de taxi.
 * TODO: Integrar con mapa real mostrando posición del conductor asignado.
 */
export default function MapaConTaxi({ buscando }: MapaConTaxiProps) {
  return (
    <div className="relative w-full h-48 bg-[#111827] border border-white/10 rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/dataviz-dark/256/0/0/0.png')] bg-cover bg-center opacity-30" />
      {buscando && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-blue-500/50 animate-ping" />
        </div>
      )}
    </div>
  );
}
