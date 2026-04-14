'use client';

import { useState } from 'react';

interface WidgetCalificacionProps {
  onCalificar: (estrellas: number) => void;
}

export default function WidgetCalificacion({ onCalificar }: WidgetCalificacionProps) {
  const [seleccionada, setSeleccionada] = useState(0);
  const [hover, setHover] = useState(0);

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl text-center">
      <h3 className="text-lg font-bold text-white mb-4">¿Cómo fue tu viaje?</h3>
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((estrella) => (
          <button
            key={estrella}
            onMouseEnter={() => setHover(estrella)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setSeleccionada(estrella)}
            className="transition-transform hover:scale-125"
          >
            <svg
              className={`w-10 h-10 ${
                estrella <= (hover || seleccionada) ? 'text-yellow-400' : 'text-gray-600'
              } transition-colors`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {seleccionada > 0 && (
        <button
          onClick={() => onCalificar(seleccionada)}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white font-medium transition-all hover:from-blue-500 hover:to-blue-400"
        >
          Enviar calificación
        </button>
      )}
    </div>
  );
}
