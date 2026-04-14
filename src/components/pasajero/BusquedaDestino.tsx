'use client';

interface BusquedaDestinoProps {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}

export default function BusquedaDestino({
  valor,
  onChange,
  placeholder = 'Busca tu destino...',
}: BusquedaDestinoProps) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-500 font-medium"
      />
    </div>
  );
}
