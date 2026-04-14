'use client';

interface TarjetaViajeProps {
  origen: string;
  destino: string;
  precio: string;
  distancia?: string;
  tiempo?: string;
}

export default function TarjetaViaje({ origen, destino, precio, distancia, tiempo }: TarjetaViajeProps) {
  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-white">Viaje en curso</h3>
        <span className="text-teal-400 font-bold text-xl">{precio}</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Origen</p>
            <p className="text-white font-medium">{origen}</p>
          </div>
        </div>
        <div className="h-3 border-l border-dashed border-gray-600 ml-1" />
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Destino</p>
            <p className="text-white font-medium">{destino}</p>
          </div>
        </div>
      </div>

      {(distancia || tiempo) && (
        <div className="flex gap-4 mt-4 pt-4 border-t border-white/5">
          {distancia && <span className="text-gray-400 text-sm">📍 {distancia}</span>}
          {tiempo && <span className="text-gray-400 text-sm">⏱ {tiempo}</span>}
        </div>
      )}
    </div>
  );
}
