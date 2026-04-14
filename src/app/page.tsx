'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesionSegura, obtenerUsuarioSeguro } from '@/services/auth/sessionSafe';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { session } = await obtenerSesionSegura();
      if (session) {
        const { user } = await obtenerUsuarioSeguro();
        const rol = user?.user_metadata?.rol || 'pasajero';
        router.push(`/${rol}`);
      } else {
        router.push('/auth/login');
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className="h-screen bg-[#0a0f1c] flex flex-col items-center justify-center text-white gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400">Redirigiendo...</p>
    </div>
  );
}
