import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const canalPersonalizado = await prisma.canalPersonalizado.findFirst({
      where: { id, negocioId }
    });

    if (!canalPersonalizado) {
      return NextResponse.json(
        { error: 'Canal personalizado no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { nombre, descripcion, activo } = body;

    const data: any = {};

    if (nombre !== undefined) {
      if (!String(nombre).trim()) {
        return NextResponse.json(
          { error: 'El nombre del canal es requerido' },
          { status: 400 }
        );
      }
      const nombreFinal = String(nombre).trim();
      if (nombreFinal !== canalPersonalizado.nombre) {
        const existente = await prisma.canalPersonalizado.findUnique({
          where: { negocioId_nombre: { negocioId, nombre: nombreFinal } }
        });
        if (existente) {
          return NextResponse.json(
            { error: `Ya tienes un canal personalizado con el nombre "${nombreFinal}"` },
            { status: 409 }
          );
        }
      }
      data.nombre = nombreFinal;
    }

    if (descripcion !== undefined) {
      if (!String(descripcion).trim()) {
        return NextResponse.json(
          { error: 'La descripcion del canal es requerida' },
          { status: 400 }
        );
      }
      data.descripcion = String(descripcion).trim();
    }

    if (activo !== undefined) {
      if (canalPersonalizado.activo && !activo) {
        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { canales: true } });
        const otrosActivos = await prisma.canalPersonalizado.count({
          where: { negocioId, activo: true, NOT: { id } }
        });
        if ((negocio?.canales.length ?? 0) === 0 && otrosActivos === 0) {
          return NextResponse.json(
            { error: 'Debes tener al menos un canal de venta habilitado (fijo o personalizado)' },
            { status: 400 }
          );
        }
      }
      data.activo = !!activo;
    }

    const actualizado = await prisma.canalPersonalizado.update({
      where: { id },
      data
    });

    return NextResponse.json({ canalPersonalizado: actualizado }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar canal personalizado:', error);
    return NextResponse.json(
      { error: 'Error al actualizar canal personalizado' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const canalPersonalizado = await prisma.canalPersonalizado.findFirst({
      where: { id, negocioId },
      include: { _count: { select: { ventas: true, clientesPreferido: true } } }
    });

    if (!canalPersonalizado) {
      return NextResponse.json(
        { error: 'Canal personalizado no encontrado' },
        { status: 404 }
      );
    }

    if (canalPersonalizado._count.ventas > 0 || canalPersonalizado._count.clientesPreferido > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar "${canalPersonalizado.nombre}" porque tiene ventas o clientes asociados. Puedes desactivarlo en vez de eliminarlo.` },
        { status: 409 }
      );
    }

    await prisma.canalPersonalizado.delete({ where: { id } });

    return NextResponse.json({ message: 'Eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar canal personalizado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar canal personalizado' },
      { status: 500 }
    );
  }
}
