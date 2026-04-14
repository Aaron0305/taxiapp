import { obtenerUsuarios, obtenerUsuarioPorId, actualizarUsuario } from '@/backend/repositories/UsuarioRepository';
import type { Usuario } from '@/types/usuario';

export async function listarUsuarios(): Promise<Usuario[]> {
  return obtenerUsuarios();
}

export async function obtenerUsuario(id: string): Promise<Usuario | null> {
  return obtenerUsuarioPorId(id);
}

export async function editarUsuario(id: string, datos: Partial<Usuario>): Promise<Usuario | null> {
  return actualizarUsuario(id, datos);
}
