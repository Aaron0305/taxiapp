'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/backend/config/database';
import { useRouter } from 'next/navigation';

export default function PasajeroPanel() {
  const router = useRouter();
  const [paso, setPaso] = useState<'inicio' | 'buscando' | 'viaje'>('inicio');
  const [destino, setDestino] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('Pasajero');
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

  if (loading) {
    return <div className="h-screen bg-[#0a0f1c] flex items-center justify-center text-white">Cargando...</div>;
  }

  return (
    <div className="relative w-full h-screen bg-[#0a0f1c] overflow-hidden flex flex-col font-sans">
      
      {/* MAPA DE FONDO (Simulado con CSS y Filtros) */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/dataviz-dark/256/0/0/0.png')] bg-cover bg-center object-cover opacity-30 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-[#0a0f1c]" />
      </div>

      {/* HEADER TIPO APP */}
      <header className="relative z-10 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-400 p-[2px] shadow-lg shadow-blue-500/30">
            <div className="w-full h-full bg-[#111827] rounded-full flex items-center justify-center border border-white/5 overflow-hidden">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nombreUsuario}`} alt="Avatar" />
            </div>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Hola, {nombreUsuario}</h2>
            <p className="text-emerald-400 text-xs font-semibold tracking-wide">LISTO PARA VIAJAR</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl backdrop-blur-md transition-all text-gray-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {/* CONTENIDO FLOTANTE CENTRAL */}
      <main className="relative z-10 flex-1 flex flex-col justify-end p-4 pb-8 pointer-events-none">
        
        {paso === 'inicio' && (
          <div className="pointer-events-auto bg-black/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-2xl transform transition-all translate-y-0">
            <h3 className="text-2xl font-bold text-white mb-6">¿A dónde vamos?</h3>
            
            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <input 
                type="text" 
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Busca tu destino..." 
                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-500 font-medium"
              />
            </div>

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <button className="flex-shrink-0 flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 px-5 py-3 rounded-2xl transition-all">
                <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                </div>
                <span className="text-gray-300 font-medium">Casa</span>
              </button>
              <button className="flex-shrink-0 flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 px-5 py-3 rounded-2xl transition-all">
                <div className="p-2 bg-purple-500/20 rounded-full text-purple-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-gray-300 font-medium">Trabajo</span>
              </button>
            </div>

            <button 
              onClick={() => destino.trim() !== '' && setPaso('buscando')}
              disabled={destino.trim() === ''}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Pedir Taxi
            </button>
          </div>
        )}

        {paso === 'buscando' && (
          <div className="pointer-events-auto bg-black/60 backdrop-blur-3xl border border-blue-500/30 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-40 rounded-full animate-pulse" />
              <div className="w-20 h-20 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-full border border-blue-500/50 flex items-center justify-center relative z-10 animate-bounce">
                <svg className="w-10 h-10 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Buscando conductor...</h3>
            <p className="text-gray-400 mb-8">Conectando con taxis cerca de tu ubicación</p>
            
            <button 
              onClick={() => setPaso('inicio')}
              className="px-8 py-3 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-red-400 transition-all font-medium"
            >
              Cancelar
            </button>
          </div>
        )}
      </main>

    </div>
  );
}
