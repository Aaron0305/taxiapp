'use client';

interface IndicadorGPSProps {
  activo: boolean;
  lat?: number;
  lng?: number;
}

export default function IndicadorGPS({ activo, lat, lng }: IndicadorGPSProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          activo ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
        }`}
      />
      <span className={activo ? 'text-emerald-400' : 'text-gray-500'}>
        {activo
          ? `GPS activo${lat && lng ? ` (${lat.toFixed(4)}, ${lng.toFixed(4)})` : ''}`
          : 'GPS desactivado'}
      </span>
    </div>
  );
}
