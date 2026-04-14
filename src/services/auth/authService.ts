import { supabase } from '@/backend/config/database';
import { obtenerSesionSegura, obtenerUsuarioSeguro } from '@/services/auth/sessionSafe';

export async function iniciarSesion(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function registrarUsuario(
  email: string,
  password: string,
  metadata: { nombre: string; telefono: string; rol: string }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  return { data, error };
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function obtenerSesionActual() {
  const { session } = await obtenerSesionSegura();
  return session;
}

export async function obtenerUsuarioActual() {
  const { user } = await obtenerUsuarioSeguro();
  return user;
}
