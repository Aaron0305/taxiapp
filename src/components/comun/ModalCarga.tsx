'use client';

interface ModalCargaProps {
  mensaje?: string;
  visible: boolean;
}

export default function ModalCarga({ mensaje = 'Cargando...', visible }: ModalCargaProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-[#111827] border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-white font-medium">{mensaje}</p>
      </div>
    </div>
  );
}
