import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CanalVenta, TipoMovimiento, TipoProducto } from '@prisma/client';
import { parsearFechaLocal, esFechaFutura } from '@/lib/fechas';

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

    const venta = await prisma.venta.findFirst({ where: { id, negocioId } });

    if (!venta) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { canal, monto, fechaVenta, cliente, clienteId } = body;

    if (canal !== undefined && !Object.values(CanalVenta).includes(canal)) {
      return NextResponse.json(
        { error: 'Canal inválido' },
        { status: 400 }
      );
    }

    if (monto !== undefined && (!Number.isFinite(monto) || monto <= 0)) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    let fechaVentaDate: Date | undefined;
    if (fechaVenta !== undefined) {
      fechaVentaDate = parsearFechaLocal(fechaVenta);
      if (isNaN(fechaVentaDate.getTime())) {
        return NextResponse.json(
          { error: 'Fecha inválida' },
          { status: 400 }
        );
      }
      if (esFechaFutura(fechaVentaDate)) {
        return NextResponse.json(
          { error: 'La fecha de venta no puede ser futura' },
          { status: 400 }
        );
      }
    }

    let clienteIdFinal: string | null | undefined = undefined;
    let clienteNombreFinal: string | null | undefined = undefined;
    if (clienteId !== undefined) {
      if (clienteId) {
        const clienteExistente = await prisma.cliente.findFirst({ where: { id: clienteId, negocioId } });
        if (!clienteExistente) {
          return NextResponse.json(
            { error: 'Cliente no encontrado' },
            { status: 404 }
          );
        }
        clienteIdFinal = clienteExistente.id;
        clienteNombreFinal = clienteExistente.nombre;
      } else {
        clienteIdFinal = null;
        clienteNombreFinal = cliente || null;
      }
    }

    const ventaActualizada = await prisma.venta.update({
      where: { id },
      data: {
        ...(canal !== undefined && { canal: canal as CanalVenta }),
        ...(monto !== undefined && { monto }),
        ...(fechaVentaDate !== undefined && { fechaVenta: fechaVentaDate }),
        ...(clienteIdFinal !== undefined && { clienteId: clienteIdFinal, cliente: clienteNombreFinal })
      },
      include: { producto: true }
    });

    return NextResponse.json({ venta: ventaActualizada }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar venta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la venta' },
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

    const venta = await prisma.venta.findFirst({
      where: { id, negocioId },
      include: { producto: true }
    });

    if (!venta) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Si el ítem vendido maneja stock, se restituye la cantidad vendida
      if (venta.producto.tipo === TipoProducto.producto) {
        const stockResultante = venta.producto.stock + venta.cantidad;

        await tx.producto.update({
          where: { id: venta.productoId },
          data: { stock: stockResultante }
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: venta.productoId,
            negocioId,
            tipo: TipoMovimiento.ajuste,
            cantidad: venta.cantidad,
            stockResultante,
            motivo: 'Reversión por eliminación de venta'
          }
        });
      }

      await tx.venta.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Venta eliminada correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar venta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la venta' },
      { status: 500 }
    );
  }
}
