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
    const { canal, canalPersonalizadoId, fechaVenta, cliente, clienteId } = body;

    if (canal !== undefined && !Object.values(CanalVenta).includes(canal)) {
      return NextResponse.json(
        { error: 'Canal inválido' },
        { status: 400 }
      );
    }

    // Canal final tras esta edición (el que se envía, o el que ya tenía la venta)
    const canalFinal = canal !== undefined ? canal : venta.canal;
    let canalPersonalizadoFinal: string | null | undefined = undefined;
    if (canalFinal === CanalVenta.otro) {
      const idElegido = canalPersonalizadoId !== undefined ? canalPersonalizadoId : venta.canalPersonalizadoId;
      if (!idElegido) {
        return NextResponse.json(
          { error: 'Debes elegir cual canal personalizado se uso en esta venta' },
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
    } else if (canal !== undefined) {
      // Si se cambia a un canal fijo, se limpia cualquier canal personalizado previo
      canalPersonalizadoFinal = null;
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
        ...(canalPersonalizadoFinal !== undefined && { canalPersonalizadoId: canalPersonalizadoFinal }),
        ...(fechaVentaDate !== undefined && { fechaVenta: fechaVentaDate }),
        ...(clienteIdFinal !== undefined && { clienteId: clienteIdFinal, cliente: clienteNombreFinal })
      },
      include: { items: { include: { producto: true } }, canalPersonalizado: true }
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
      include: { items: { include: { producto: true } } }
    });

    if (!venta) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const item of venta.items) {
        // Si el ítem vendido maneja stock, se restituye la cantidad vendida
        if (item.producto.tipo !== TipoProducto.producto) continue;

        const productoActualizado = await tx.producto.update({
          where: { id: item.productoId },
          data: { stock: { increment: item.cantidad } }
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            negocioId,
            tipo: TipoMovimiento.ajuste,
            cantidad: item.cantidad,
            stockResultante: productoActualizado.stock,
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
