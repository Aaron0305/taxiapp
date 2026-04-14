'use client';

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  onBack?: () => void;
}

export default function Header({ titulo, subtitulo, onBack }: HeaderProps) {
  return (
    <header className="relative z-10 p-6 flex items-center gap-4">
      {onBack && (
        <button
          onClick={onBack}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div>
        <h1 className="text-xl font-bold text-white">{titulo}</h1>
        {subtitulo && <p className="text-sm text-gray-400">{subtitulo}</p>}
      </div>
    </header>
  );
}
