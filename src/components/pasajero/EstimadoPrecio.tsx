'use client';

interface EstimadoPrecioProps {
  precio: string;
  distancia: string;
  tiempo: string;
}

export default function EstimadoPrecio({ precio, distancia, tiempo }: EstimadoPrecioProps) {
  return (
    <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl p-4">
      <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Estimado</p>
      <div className="flex justify-between items-center">
        <span className="text-2xl font-bold text-white">{precio}</span>
        <div className="text-right text-sm text-gray-400">
          <p>{distancia}</p>
          <p>{tiempo}</p>
        </div>
      </div>
    </div>
  );
}
