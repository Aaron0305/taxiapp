import { NextRequest, NextResponse } from 'next/server';
import {
  solicitarViaje,
  obtenerViaje,
  historialPasajero,
  cancelarViaje,
} from '@/backend/controllers/viajController';
import { validarCreateViaje } from '@/backend/dtos/CreateViajeDto';
import { manejarError } from '@/backend/middleware/errorHandler';
import { ENV } from '@/backend/config/env';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const pasajeroId = searchParams.get('pasajero_id');

    if (id) {
      const viaje = await obtenerViaje(id);
      if (!viaje) {
        return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 });
      }
      return NextResponse.json(viaje);
    }

    if (pasajeroId) {
      const viajes = await historialPasajero(pasajeroId);
      return NextResponse.json(viajes);
    }

    return NextResponse.json({ error: 'Se requiere id o pasajero_id' }, { status: 400 });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pasajero_id, ...solicitud } = body;

    if (!pasajero_id) {
      return NextResponse.json({ error: 'pasajero_id requerido' }, { status: 400 });
    }

    const validacion = validarCreateViaje(solicitud);
    if (!validacion.valido) {
      return NextResponse.json({ error: 'Datos inválidos', detalles: validacion.errores }, { status: 422 });
    }

    const viaje = await solicitarViaje(pasajero_id, solicitud);
    if (!viaje) {
      if (!ENV.SUPABASE_SERVICE_KEY) {
        return NextResponse.json({ error: 'Error al crear viaje: falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' }, { status: 500 });
      }
      return NextResponse.json({ error: 'Error al crear viaje' }, { status: 500 });
    }

    return NextResponse.json(viaje, { status: 201 });
  } catch (error) {
    return manejarError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const resultado = await cancelarViaje(id);
    if (!resultado) {
      return NextResponse.json({ error: 'Error al cancelar' }, { status: 500 });
    }

    return NextResponse.json({ mensaje: 'Viaje cancelado' });
  } catch (error) {
    return manejarError(error);
  }
}
