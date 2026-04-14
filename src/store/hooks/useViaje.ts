'use client';

import { useState } from 'react';
import type { Viaje } from '@/types/viaje';

export function useViaje() {
  const [viajeActivo, setViajeActivo] = useState<Viaje | null>(null);
  const [historial, setHistorial] = useState<Viaje[]>([]);
  const [cargando, setCargando] = useState(false);

  const iniciarViaje = (viaje: Viaje) => {
    setViajeActivo(viaje);
  };

  const finalizarViaje = () => {
    if (viajeActivo) {
      setHistorial((prev) => [viajeActivo, ...prev]);
    }
    setViajeActivo(null);
  };

  const cancelarViaje = () => {
    setViajeActivo(null);
  };

  return {
    viajeActivo,
    historial,
    cargando,
    setCargando,
    iniciarViaje,
    finalizarViaje,
    cancelarViaje,
    setHistorial,
  };
}
