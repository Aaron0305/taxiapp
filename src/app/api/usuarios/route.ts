import { NextRequest, NextResponse } from 'next/server';
import {
  listarUsuarios,
  obtenerUsuario,
  editarUsuario,
} from '@/backend/controllers/usuarioController';
import { manejarError } from '@/backend/middleware/errorHandler';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const usuario = await obtenerUsuario(id);
      if (!usuario) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }
      return NextResponse.json(usuario);
    }

    const usuarios = await listarUsuarios();
    return NextResponse.json(usuarios);
  } catch (error) {
    return manejarError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...datos } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const usuario = await editarUsuario(id, datos);
    if (!usuario) {
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    return NextResponse.json(usuario);
  } catch (error) {
    return manejarError(error);
  }
}
