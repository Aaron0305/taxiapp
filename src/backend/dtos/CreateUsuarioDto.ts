export interface CreateUsuarioDto {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
  rol: 'pasajero' | 'conductor';
}

export function validarCreateUsuario(data: unknown): { valido: boolean; errores: Record<string, string> } {
  const errores: Record<string, string> = {};
  const d = data as Record<string, unknown>;

  if (!d.nombre || typeof d.nombre !== 'string' || d.nombre.trim().length < 2) {
    errores.nombre = 'El nombre es requerido (mínimo 2 caracteres).';
  }
  if (!d.email || typeof d.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errores.email = 'Correo electrónico inválido.';
  }
  if (!d.telefono || typeof d.telefono !== 'string') {
    errores.telefono = 'El teléfono es requerido.';
  }
  if (!d.password || typeof d.password !== 'string' || d.password.length < 6) {
    errores.password = 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (!d.rol || !['pasajero', 'conductor'].includes(d.rol as string)) {
    errores.rol = 'Rol inválido. Debe ser pasajero o conductor.';
  }

  return { valido: Object.keys(errores).length === 0, errores };
}
