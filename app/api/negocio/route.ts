import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CanalVenta } from '@prisma/client';

const NEGOCIO_SELECT = {
  id: true,
  nombre: true,
  rubro: true,
  telefono: true,
  email: true,
  canales: true,
  otroCanalNombre: true,
  otroCanalDescripcion: true
};

export async function GET(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: NEGOCIO_SELECT
    });

    if (!negocio) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ negocio }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener negocio:', error);
    return NextResponse.json(
      { error: 'Error al obtener negocio' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const negocioActual = await prisma.negocio.findUnique({ where: { id: negocioId } });
    if (!negocioActual) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { canales, nombre, rubro, telefono, otroCanalNombre, otroCanalDescripcion } = body;

    const data: any = {};

    if (canales !== undefined) {
      if (!Array.isArray(canales) || canales.length === 0) {
        return NextResponse.json(
          { error: 'Debes tener al menos un canal de venta habilitado' },
          { status: 400 }
        );
      }

      const canalesValidos = Object.values(CanalVenta);
      if (!canales.every((c: string) => canalesValidos.includes(c as CanalVenta))) {
        return NextResponse.json(
          { error: 'Canal de venta inválido' },
          { status: 400 }
        );
      }

      if (canales.includes('otro')) {
        const nombreFinal = otroCanalNombre !== undefined ? otroCanalNombre : negocioActual.otroCanalNombre;
        const descripcionFinal = otroCanalDescripcion !== undefined ? otroCanalDescripcion : negocioActual.otroCanalDescripcion;
        if (!nombreFinal || !nombreFinal.trim() || !descripcionFinal || !descripcionFinal.trim()) {
          return NextResponse.json(
            { error: 'Para habilitar el canal "Otro" debes indicar un nombre y una descripción' },
            { status: 400 }
          );
        }
      }

      data.canales = canales as CanalVenta[];
    }

    if (nombre !== undefined) {
      if (!nombre.trim()) {
        return NextResponse.json(
          { error: 'El nombre del negocio es requerido' },
          { status: 400 }
        );
      }
      data.nombre = nombre.trim();
    }

    if (rubro !== undefined) {
      if (!rubro.trim()) {
        return NextResponse.json(
          { error: 'El rubro del negocio es requerido' },
          { status: 400 }
        );
      }
      data.rubro = rubro.trim();
    }

    if (telefono !== undefined) {
      if (!telefono.trim()) {
        return NextResponse.json(
          { error: 'El teléfono del negocio es requerido' },
          { status: 400 }
        );
      }
      data.telefono = telefono.trim();
    }

    if (otroCanalNombre !== undefined) data.otroCanalNombre = otroCanalNombre || null;
    if (otroCanalDescripcion !== undefined) data.otroCanalDescripcion = otroCanalDescripcion || null;

    const negocio = await prisma.negocio.update({
      where: { id: negocioId },
      data,
      select: NEGOCIO_SELECT
    });

    return NextResponse.json({ negocio }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el negocio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el negocio' },
      { status: 500 }
    );
  }
}
