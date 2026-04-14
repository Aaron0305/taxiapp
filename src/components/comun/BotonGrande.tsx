'use client';

import { ReactNode } from 'react';

interface BotonGrandeProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  variante?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

const estilosVariante = {
  primary: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-500/25',
  secondary: 'bg-white/5 hover:bg-white/10 border border-white/10',
  danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/25',
};

export default function BotonGrande({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variante = 'primary',
  className = '',
}: BotonGrandeProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3.5 px-4 text-white font-medium rounded-xl shadow-lg transition-all outline-none disabled:opacity-50 ${estilosVariante[variante]} ${className}`}
    >
      {children}
    </button>
  );
}
