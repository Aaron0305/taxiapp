'use client';

interface MapaBaseProps {
  className?: string;
  opacidad?: number;
}

/**
 * Componente de mapa base decorativo.
 * TODO: Reemplazar con Google Maps / Mapbox real.
 */
export default function MapaBase({ className = '', opacidad = 0.4 }: MapaBaseProps) {
  return (
    <div className={`absolute inset-0 z-0 ${className}`} style={{ opacity: opacidad }}>
      <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/dataviz-dark/256/0/0/0.png')] bg-cover bg-center mix-blend-lighten" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-[#0a0f1c]" />
    </div>
  );
}
