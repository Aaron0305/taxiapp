'use client';

interface TarjetaConductorProps {
  nombre: string;
  vehiculo: string;
  placa: string;
  calificacion: number;
  avatarSeed?: string;
}

export default function TarjetaConductor({
  nombre,
  vehiculo,
  placa,
  calificacion,
  avatarSeed,
}: TarjetaConductorProps) {
  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 p-[2px] flex-shrink-0">
        <div className="w-full h-full bg-[#111827] rounded-full overflow-hidden flex items-center justify-center">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed || nombre}`}
            alt={nombre}
            className="w-full h-full"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-bold truncate">{nombre}</h4>
        <p className="text-gray-400 text-sm">{vehiculo} · {placa}</p>
      </div>
      <div className="flex items-center gap-1 text-sm">
        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-white font-semibold">{calificacion.toFixed(1)}</span>
      </div>
    </div>
  );
}
