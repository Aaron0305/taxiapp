'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/backend/config/database';
import { useRouter } from 'next/navigation';
import { obtenerSesionSegura, obtenerUsuarioSeguro } from '@/services/auth/sessionSafe';

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'pasajero' | 'conductor'>('pasajero');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Registrar en Supabase Auth pasándole los metadatos para que nuestro Trigger los capture
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          telefono,
          rol,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('¡Registro exitoso! Revisa tu correo, o inicia sesión directamente.');
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    }
    
    setLoading(false);
  };

  // RETENCIÓN Y BLOQUEO DE SESIÓN
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] text-white relative overflow-hidden py-12">
      {/* Elementos decorativos (Glassmorphism + Neon) */}
      <div className="absolute top-[0%] right-[-10%] w-[500px] h-[500px] bg-purple-600/30 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-emerald-400 mb-4 shadow-lg shadow-purple-500/30">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Crear Cuenta
          </h1>
          <p className="text-sm text-gray-400 mt-2">Únete a Ixtlappp. Empieza a rodar con nosotros.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-200 text-sm p-4 rounded-xl mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleRegistro} className="space-y-4">
          
          {/* SELECCIÓN DE ROL */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            <button
              type="button"
              onClick={() => setRol('pasajero')}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                rol === 'pasajero' 
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                  : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              Soy Pasajero
            </button>
            <button
              type="button"
              onClick={() => setRol('conductor')}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                rol === 'conductor' 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              Soy Conductor
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="nombre">
              Nombre Completo
            </label>
            <input
              id="nombre"
              type="text"
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500"
              placeholder="Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="telefono">
              Teléfono
            </label>
            <input
              id="telefono"
              type="tel"
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500"
              placeholder="55 1234 5678"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 disabled:opacity-50 mt-4 overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando cuenta...
                </>
              ) : (
                'Completar Registro'
              )}
            </span>
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          ¿Ya tienes una cuenta?{' '}
          <a href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Inicia Sesión
          </a>
        </div>
      </div>
    </div>
  );
}
