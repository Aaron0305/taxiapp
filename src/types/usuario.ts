export type Rol = 'pasajero' | 'conductor' | 'admin';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
  avatar_url?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioPublico {
  id: string;
  nombre: string;
  telefono: string;
  rol: Rol;
  avatar_url?: string;
}
