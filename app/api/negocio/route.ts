import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CanalVenta } from '@prisma/client';

const NEGOCIO_SELECT = {
  id: true,
  nombre: true,
  rubro: true,
  telefono: true,
  email: true,
  canales: true
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
    const { canales, nombre, rubro, telefono } = body;

    const data: any = {};

    if (canales !== undefined) {
      if (!Array.isArray(canales)) {
        return NextResponse.json(
          { error: 'Lista de canales inválida' },
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

      // El canal "otro" ya no se activa aqui: los canales personalizados (con
      // su propio nombre) se gestionan en /api/canales-personalizados y estan
      // disponibles para usarse apenas tengan al menos uno activo.
      const canalesFinales = canales.filter((c: string) => c !== 'otro') as CanalVenta[];

      if (canalesFinales.length === 0) {
        const canalPersonalizadoActivo = await prisma.canalPersonalizado.findFirst({
          where: { negocioId, activo: true }
        });
        if (!canalPersonalizadoActivo) {
          return NextResponse.json(
            { error: 'Debes tener al menos un canal de venta habilitado (fijo o personalizado)' },
            { status: 400 }
          );
        }
      }

      data.canales = canalesFinales;
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
