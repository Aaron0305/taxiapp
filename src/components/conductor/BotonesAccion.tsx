'use client';

interface BotonesAccionProps {
  onAceptar: () => void;
  onRechazar: () => void;
  disabled?: boolean;
}

export default function BotonesAccion({ onAceptar, onRechazar, disabled = false }: BotonesAccionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={onRechazar}
        disabled={disabled}
        className="py-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-lg transition-all border border-white/10 disabled:opacity-50"
      >
        Rechazar
      </button>
      <button
        onClick={onAceptar}
        disabled={disabled}
        className="py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-black font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50"
      >
        Aceptar
      </button>
    </div>
  );
}
