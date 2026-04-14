/**
 * Validaciones de formulario del lado del cliente.
 */

export function validarEmail(email: string): string | null {
  if (!email.trim()) return 'El correo es requerido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Correo electrónico inválido.';
  return null;
}

export function validarPassword(password: string): string | null {
  if (!password) return 'La contraseña es requerida.';
  if (password.length < 6) return 'Mínimo 6 caracteres.';
  return null;
}

export function validarNombre(nombre: string): string | null {
  if (!nombre.trim()) return 'El nombre es requerido.';
  if (nombre.trim().length < 2) return 'Mínimo 2 caracteres.';
  return null;
}

export function validarTelefono(telefono: string): string | null {
  if (!telefono.trim()) return 'El teléfono es requerido.';
  const limpio = telefono.replace(/[\s\-()]/g, '');
  if (!/^(\+52)?[0-9]{10}$/.test(limpio)) return 'Número de teléfono inválido.';
  return null;
}
