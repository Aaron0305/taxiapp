'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/backend/config/database';
import { useRouter } from 'next/navigation';
import { obtenerSesionSegura, obtenerUsuarioSeguro } from '@/services/auth/sessionSafe';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registroSchema, type RegistroFormData } from '@/schemas/auth';
import { User, Phone, Mail, Lock, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegistroFormData>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      rol: 'pasajero',
    },
  });

  const rol = watch('rol');

  const onSubmit = async (dataForm: RegistroFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Registrar en Supabase Auth pasándole los metadatos para que nuestro Trigger los capture
    const { data, error: authError } = await supabase.auth.signUp({
      email: dataForm.email,
      password: dataForm.password,
      options: {
        data: {
          nombre: dataForm.nombre,
          telefono: dataForm.telefono,
          rol: dataForm.rol,
        },
      },
    });

    if (authError) {
      setError(authError.message);
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
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Crear Cuenta
          </h1>
          <p className="text-sm text-gray-400 mt-2">Únete a Ixtlappp. Empieza a rodar con nosotros.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-200 text-sm p-4 rounded-xl mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* SELECCIÓN DE ROL */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            <button
              type="button"
              onClick={() => setValue('rol', 'pasajero')}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                rol === 'pasajero' 
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                  : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              Soy Pasajero
            </button>
            <button
              type="button"
              onClick={() => setValue('rol', 'conductor')}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                rol === 'conductor' 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              Soy Conductor
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300" htmlFor="nombre">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                {...register('nombre')}
                id="nombre"
                type="text"
                className={`w-full pl-11 pr-4 py-3 bg-black/30 border ${errors.nombre ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10'} rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500`}
                placeholder="Juan Pérez"
              />
            </div>
            {errors.nombre && <p className="text-xs text-red-400 mt-1 ml-1">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300" htmlFor="telefono">
              Teléfono (10 dígitos)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                {...register('telefono')}
                id="telefono"
                type="tel"
                className={`w-full pl-11 pr-4 py-3 bg-black/30 border ${errors.telefono ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10'} rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500`}
                placeholder="5512345678"
              />
            </div>
            {errors.telefono && <p className="text-xs text-red-400 mt-1 ml-1">{errors.telefono.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300" htmlFor="email">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                {...register('email')}
                id="email"
                type="email"
                className={`w-full pl-11 pr-4 py-3 bg-black/30 border ${errors.email ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10'} rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500`}
                placeholder="tu@correo.com"
              />
            </div>
            {errors.email && <p className="text-xs text-red-400 mt-1 ml-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                {...register('password')}
                id="password"
                type="password"
                className={`w-full pl-11 pr-4 py-3 bg-black/30 border ${errors.password ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10'} rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500`}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1 ml-1">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300" htmlFor="confirmPassword">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                className={`w-full pl-11 pr-4 py-3 bg-black/30 border ${errors.confirmPassword ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10'} rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500`}
                placeholder="Repite tu contraseña"
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-400 mt-1 ml-1">{errors.confirmPassword.message}</p>}
          </div>

          <div className="flex items-start gap-3 py-2">
            <div className="flex items-center h-5">
              <input
                {...register('aceptaTerminos')}
                id="aceptaTerminos"
                type="checkbox"
                className="w-5 h-5 rounded border-white/10 bg-black/30 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
              />
            </div>
            <div className="text-sm">
              <label htmlFor="aceptaTerminos" className="text-gray-400">
                Acepto los <a href="#" className="text-purple-400 hover:underline">Términos y Condiciones</a> y la <a href="#" className="text-purple-400 hover:underline">Política de Privacidad</a>.
              </label>
              {errors.aceptaTerminos && <p className="text-xs text-red-400 mt-1">{errors.aceptaTerminos.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 disabled:opacity-50 mt-4 overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
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
