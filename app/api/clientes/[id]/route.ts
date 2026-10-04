import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CanalVenta } from '@prisma/client';
import { normalizarCodigo } from '@/lib/codigos';

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

    const cliente = await prisma.cliente.findFirst({
      where: { id, negocioId }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { codigo, nombre, telefono, dni, direccion, canalPreferido, canalPreferidoPersonalizadoId, notas } = body;

    let canalPersonalizadoFinal: string | null | undefined = undefined;
    if (canalPreferido !== undefined) {
      if (canalPreferido === CanalVenta.otro) {
        const idElegido = canalPreferidoPersonalizadoId !== undefined ? canalPreferidoPersonalizadoId : cliente.canalPreferidoPersonalizadoId;
        if (!idElegido) {
          return NextResponse.json(
            { error: 'Debes elegir cual canal personalizado prefiere este cliente' },
            { status: 400 }
          );
        }
        const canalPersonalizado = await prisma.canalPersonalizado.findFirst({
          where: { id: idElegido, negocioId, activo: true }
        });
        if (!canalPersonalizado) {
          return NextResponse.json(
            { error: 'Canal personalizado no encontrado o inactivo' },
            { status: 404 }
          );
        }
        canalPersonalizadoFinal = canalPersonalizado.id;
      } else {
        canalPersonalizadoFinal = null;
      }
    }

    if (nombre !== undefined && !nombre) {
      return NextResponse.json(
        { error: 'El nombre del cliente es requerido' },
        { status: 400 }
      );
    }

    if (nombre && nombre !== cliente.nombre) {
      const existente = await prisma.cliente.findUnique({
        where: { negocioId_nombre: { negocioId, nombre } }
      });
      if (existente) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con ese nombre' },
          { status: 409 }
        );
      }
    }

    let codigoFinal: string | undefined;
    if (codigo !== undefined) {
      if (!String(codigo).trim()) {
        return NextResponse.json(
          { error: 'El código no puede quedar vacío' },
          { status: 400 }
        );
      }
      codigoFinal = normalizarCodigo(String(codigo));
      if (codigoFinal !== cliente.codigo) {
        const existenteCodigo = await prisma.cliente.findFirst({
          where: { negocioId, codigo: codigoFinal, NOT: { id } }
        });
        if (existenteCodigo) {
          return NextResponse.json(
            { error: `Ya existe un cliente con el código "${codigoFinal}"` },
            { status: 409 }
          );
        }
      }
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: {
        ...(codigoFinal !== undefined && { codigo: codigoFinal }),
        ...(nombre !== undefined && { nombre }),
        ...(telefono !== undefined && { telefono: telefono || null }),
        ...(dni !== undefined && { dni: dni || null }),
        ...(direccion !== undefined && { direccion: direccion || null }),
        ...(canalPreferido !== undefined && { canalPreferido: canalPreferido ? (canalPreferido as CanalVenta) : null }),
        ...(canalPersonalizadoFinal !== undefined && { canalPreferidoPersonalizadoId: canalPersonalizadoFinal }),
        ...(notas !== undefined && { notas: notas || null })
      }
    });

    return NextResponse.json({ cliente: clienteActualizado }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    return NextResponse.json(
      { error: 'Error al actualizar cliente' },
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

    const cliente = await prisma.cliente.findFirst({
      where: { id, negocioId },
      include: { _count: { select: { ventas: true } } }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    if (cliente._count.ventas > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar a "${cliente.nombre}" porque tiene ${cliente._count.ventas} venta(s) asociada(s).` },
        { status: 409 }
      );
    }

    await prisma.cliente.delete({ where: { id } });

    return NextResponse.json({ message: 'Eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el cliente' },
      { status: 500 }
    );
  }
}
