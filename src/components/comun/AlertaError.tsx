'use client';

interface AlertaErrorProps {
  mensaje: string;
  onCerrar?: () => void;
}

export default function AlertaError({ mensaje, onCerrar }: AlertaErrorProps) {
  if (!mensaje) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-4 rounded-xl mb-4 flex justify-between items-center">
      <span>{mensaje}</span>
      {onCerrar && (
        <button onClick={onCerrar} className="text-red-400 hover:text-red-300 ml-4 font-bold">
          ✕
        </button>
      )}
    </div>
  );
}
