import { apiClient } from './client';
import type { Usuario } from '@/types/usuario';

export async function obtenerPerfil(id: string) {
  return apiClient.get<Usuario>(`/usuarios?id=${id}`);
}

export async function actualizarPerfil(id: string, datos: Partial<Usuario>) {
  return apiClient.patch<Usuario>('/usuarios', { id, ...datos });
}

export async function listarTodosUsuarios() {
  return apiClient.get<Usuario[]>('/usuarios');
}
