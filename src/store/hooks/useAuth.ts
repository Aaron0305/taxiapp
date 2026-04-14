'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/backend/config/database';
import type { User } from '@supabase/supabase-js';
import { obtenerUsuarioSeguro } from '@/services/auth/sessionSafe';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión actual
    const getSession = async () => {
      const { user } = await obtenerUsuarioSeguro();
      setUser(user);
      setLoading(false);
    };

    getSession();

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    rol: user?.user_metadata?.rol || 'pasajero',
    nombre: user?.user_metadata?.nombre || 'Usuario',
  };
}
