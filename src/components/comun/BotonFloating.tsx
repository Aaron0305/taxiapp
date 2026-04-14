'use client';

import { ReactNode } from 'react';

interface BotonFloatingProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

export default function BotonFloating({ children, onClick, className = '' }: BotonFloatingProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform ${className}`}
    >
      {children}
    </button>
  );
}
