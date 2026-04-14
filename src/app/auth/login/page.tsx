'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/backend/config/database';
import { useRouter } from 'next/navigation';
import { obtenerSesionSegura, obtenerUsuarioSeguro } from '@/services/auth/sessionSafe';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      const userRol = authData.user?.user_metadata?.rol || 'pasajero';
      router.push(`/${userRol}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    const verificarSesion = async () => {
      const { session } = await obtenerSesionSegura();
      if (session) {
        const { user } = await obtenerUsuarioSeguro();
        const userRol = user?.user_metadata?.rol || 'pasajero';
        router.push(`/${userRol}`);
      }
    };
    verificarSesion();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] text-white relative overflow-hidden">
      {/* Elementos decorativos (Glassmorphism + Neon) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 mb-4 shadow-lg shadow-blue-500/30">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            TaxiApp Web
          </h1>
          <p className="text-sm text-gray-400 mt-2">Bienvenido de vuelta, ingresa para rodar.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-500"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
              <input type="checkbox" className="rounded border-gray-600 bg-black/50 text-blue-500 focus:ring-blue-500/50 cursor-pointer" />
              Recordarme
            </label>
            <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
              ¿Olvidaste tu clave?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:opacity-50 mt-4 overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </span>
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          ¿No tienes una cuenta?{' '}
          <a href="/auth/registro" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Regístrate aquí
          </a>
        </div>
      </div>
    </div>
  );
}
