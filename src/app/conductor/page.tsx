'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/backend/config/database';
import { useRouter } from 'next/navigation';

export default function ConductorPanel() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [solicitud, setSolicitud] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Conductor');
  const [loading, setLoading] = useState(true);

  // Verificación de Sesión y Datos
  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.nombre) {
        setNombreUsuario(user.user_metadata.nombre);
      }
      setLoading(false);
    };
    
    verificarSesion();
  }, [router]);

  // Cerrar Sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  // Simulación de nueva solicitud tras conectarse
  const toggleStatus = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    if (newStatus) {
      setTimeout(() => setSolicitud(true), 3000);
    } else {
      setSolicitud(false);
    }
  };

  if (loading) {
    return <div className="h-screen bg-[#050B14] flex items-center justify-center text-white">Cargando...</div>;
  }

  return (
    <div className="relative w-full h-screen bg-[#050B14] overflow-hidden flex flex-col font-sans">
      
      {/* MAPA NAVEGADOR DE FONDO */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isOnline ? 'opacity-60' : 'opacity-20 grayscale'}`}>
        {/* Placeholder estético para el grid de calles / mapa GPS */}
        <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/dataviz-dark/256/0/0/0.png')] bg-cover bg-center mix-blend-lighten" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,11,20,1)_0%,rgba(5,11,20,0.2)_30%,rgba(5,11,20,0.8)_100%)]" />
      </div>

      {/* HEADER CONDUCTOR */}
      <header className="relative z-10 p-6 flex justify-between items-start">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center gap-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 p-[2px]">
             <div className="w-full h-full bg-[#111827] rounded-xl flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nombreUsuario}`} alt="Conductor Avatar" />
             </div>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">{nombreUsuario}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              <span className="text-gray-300 font-medium text-sm">4.92 • 345 viajes</span>
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl backdrop-blur-md transition-all text-red-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {/* MÉTRICAS FLOTANTES (Ganancias de Hoy) */}
      <div className="relative z-10 px-6 mt-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Hoy</span>
            <span className="text-2xl font-bold text-white">$1,450.00</span>
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Viajes</span>
            <span className="text-2xl font-bold text-white">12 Completados</span>
          </div>
        </div>
      </div>

      <main className="relative z-20 flex-1 flex flex-col justify-end p-6 pb-12 pointer-events-none">
        
        {/* BOTÓN PRINCIPAL GO ONLINE */}
        <div className="pointer-events-auto w-full flex justify-center mb-8 relative">
          <button 
            onClick={toggleStatus}
            className={`w-40 h-40 rounded-full flex flex-col items-center justify-center font-bold text-xl shadow-2xl transition-all duration-500 relative z-20 ${
              isOnline 
                ? 'bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_50px_rgba(239,68,68,0.5)] border-4 border-red-400/30 text-white' 
                : 'bg-gradient-to-b from-emerald-500 to-teal-500 shadow-[0_0_50px_rgba(16,185,129,0.3)] border-4 border-emerald-400/30 text-white'
            }`}
          >
            <span className="mb-1">{isOnline ? 'DESCONECTAR' : 'CONECTARSE'}</span>
            {!isOnline && <span className="text-xs text-emerald-100 font-medium">Buscando viajes...</span>}
          </button>
          
          {/* Ondas radar cuando está online */}
          {isOnline && !solicitud && (
            <>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-emerald-500/50 animate-[ping_2s_ease-out_infinite]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-teal-500/30 animate-[ping_2.5s_ease-out_infinite]" />
            </>
          )}
        </div>

        {/* ALERTA DE NUEVO VIAJE (POPUP EMERGENTE) */}
        {solicitud && isOnline && (
          <div className="pointer-events-auto bg-black/80 backdrop-blur-3xl border-2 border-teal-500/50 p-6 rounded-[2rem] shadow-[0_0_80px_rgba(20,184,166,0.3)] w-full animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 rounded-full bg-teal-500 animate-ping absolute"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                <h3 className="text-xl font-bold text-white">¡Nuevo Viaje!</h3>
              </div>
              <span className="text-teal-400 font-bold text-2xl border px-3 mt-1 py-1 border-teal-500/30 bg-teal-500/10 rounded-xl">$120</span>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <div>
                  <p className="text-sm text-gray-400 uppercase font-semibold">Origen (2 min)</p>
                  <p className="text-white font-medium text-lg">Central Camionera Sur</p>
                </div>
              </div>
              <div className="h-4 border-l-2 border-dashed border-gray-600 ml-1.5" />
              <div className="flex items-start gap-4">
                <div className="mt-1 w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                <div>
                  <p className="text-sm text-gray-400 uppercase font-semibold">Destino</p>
                  <p className="text-white font-medium text-lg">Plaza Galerías Central</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setSolicitud(false)} className="py-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-lg transition-all border border-white/10">
                Rechazar
              </button>
              <button 
                onClick={() => setSolicitud(false)} 
                className="py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-black font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                Aceptar Viaje
              </button>
            </div>
            
            {/* Barra de progreso de tiempo límite simulada */}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-6">
              <div className="h-full bg-teal-500 animate-[shrink_10s_linear]" style={{ animationFillMode: 'forwards' }}/>
            </div>
            <style jsx>{`
              @keyframes shrink { from { width: 100%; } to { width: 0%; } }
            `}</style>
          </div>
        )}
      </main>

    </div>
  );
}
