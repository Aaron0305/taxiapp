'use client';

interface WidgetGananciasProps {
  gananciaHoy: string;
  viajesHoy: number;
}

export default function WidgetGanancias({ gananciaHoy, viajesHoy }: WidgetGananciasProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Hoy</span>
        <span className="text-2xl font-bold text-white">{gananciaHoy}</span>
      </div>
      <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Viajes</span>
        <span className="text-2xl font-bold text-white">{viajesHoy} Completados</span>
      </div>
    </div>
  );
}
