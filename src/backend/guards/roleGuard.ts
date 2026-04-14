import type { Rol } from '@/types/usuario';

/**
 * Verifica si un usuario tiene uno de los roles permitidos.
 */
export function verificarRol(rolUsuario: Rol, rolesPermitidos: Rol[]): boolean {
  return rolesPermitidos.includes(rolUsuario);
}

/**
 * Lanza un error si el usuario no tiene el rol requerido.
 */
export function requiereRol(rolUsuario: Rol, rolesPermitidos: Rol[]): void {
  if (!verificarRol(rolUsuario, rolesPermitidos)) {
    throw new Error(`Rol '${rolUsuario}' no tiene permisos. Se requiere: ${rolesPermitidos.join(', ')}`);
  }
}
