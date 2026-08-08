import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UnidadMedida } from '@prisma/client';
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

    const producto = await prisma.producto.findFirst({
      where: { id, negocioId }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { codigo, nombre, categoria, unidad, stockMinimo, precioVenta, precioCosto } = body;

    if (nombre !== undefined && !nombre) {
      return NextResponse.json(
        { error: 'El nombre del producto es requerido' },
        { status: 400 }
      );
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
      if (codigoFinal !== producto.codigo) {
        const existente = await prisma.producto.findFirst({
          where: { negocioId, codigo: codigoFinal, NOT: { id } }
        });
        if (existente) {
          return NextResponse.json(
            { error: `Ya existe un producto o servicio con el código "${codigoFinal}"` },
            { status: 409 }
          );
        }
      }
    }

    if (stockMinimo !== undefined && stockMinimo !== null && (!Number.isFinite(stockMinimo) || stockMinimo < 0)) {
      return NextResponse.json(
        { error: 'El stock mínimo no puede ser negativo' },
        { status: 400 }
      );
    }

    if (precioVenta !== undefined && precioVenta !== null && precioVenta !== '' && (!Number.isFinite(precioVenta) || precioVenta < 0)) {
      return NextResponse.json(
        { error: 'El precio de venta no puede ser negativo' },
        { status: 400 }
      );
    }

    if (precioCosto !== undefined && precioCosto !== null && precioCosto !== '' && (!Number.isFinite(precioCosto) || precioCosto < 0)) {
      return NextResponse.json(
        { error: 'El precio de costo no puede ser negativo' },
        { status: 400 }
      );
    }

    if (unidad !== undefined && !Object.values(UnidadMedida).includes(unidad)) {
      return NextResponse.json(
        { error: 'Unidad de medida inválida' },
        { status: 400 }
      );
    }

    const productoActualizado = await prisma.producto.update({
      where: { id },
      data: {
        ...(codigoFinal !== undefined && { codigo: codigoFinal }),
        ...(nombre !== undefined && { nombre }),
        ...(categoria !== undefined && { categoria: categoria || null }),
        ...(unidad !== undefined && { unidad: unidad as UnidadMedida }),
        ...(stockMinimo !== undefined && { stockMinimo: Math.trunc(stockMinimo) }),
        ...(precioVenta !== undefined && { precioVenta: precioVenta === null || precioVenta === '' ? null : precioVenta }),
        ...(precioCosto !== undefined && { precioCosto: precioCosto === null || precioCosto === '' ? null : precioCosto })
      }
    });

    return NextResponse.json({ producto: productoActualizado }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
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

    const producto = await prisma.producto.findFirst({
      where: { id, negocioId },
      include: { _count: { select: { ventas: true } } }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (producto._count.ventas > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar "${producto.nombre}" porque tiene ${producto._count.ventas} venta(s) registrada(s).` },
        { status: 409 }
      );
    }

    await prisma.producto.delete({ where: { id } });

    return NextResponse.json({ message: 'Eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el producto' },
      { status: 500 }
    );
  }
}
