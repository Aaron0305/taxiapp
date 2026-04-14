import { NextRequest, NextResponse } from 'next/server';
import {
  listarConductoresDisponibles,
  obtenerConductor,
  cambiarEstadoConductor,
} from '@/backend/controllers/conductorController';
import { manejarError } from '@/backend/middleware/errorHandler';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const conductor = await obtenerConductor(id);
      if (!conductor) {
        return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 });
      }
      return NextResponse.json(conductor);
    }

    const conductores = await listarConductoresDisponibles();
    return NextResponse.json(conductores);
  } catch (error) {
    return manejarError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return NextResponse.json(
        { error: 'ID y estado son requeridos' },
        { status: 400 }
      );
    }

    const resultado = await cambiarEstadoConductor(id, estado);
    if (!resultado) {
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    return NextResponse.json({ mensaje: 'Estado actualizado' });
  } catch (error) {
    return manejarError(error);
  }
}
