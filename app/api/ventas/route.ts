import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CanalVenta, OrigenCarga } from '@prisma/client';
import { registrarVentaConStock } from '@/lib/ventas-service';
import { parsearFechaLocal, esFechaFutura } from '@/lib/fechas';

export async function GET(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const canal = searchParams.get('canal');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const where: any = { negocioId };

    if (canal) {
      where.canal = canal as CanalVenta;
    }

    if (fechaInicio && fechaFin) {
      where.fechaVenta = {
        gte: parsearFechaLocal(fechaInicio),
        lte: parsearFechaLocal(fechaFin)
      };
    }

    const ventas = await prisma.venta.findMany({
      where,
      include: {
        producto: true
      },
      orderBy: { fechaVenta: 'desc' }
    });

    return NextResponse.json({ ventas }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json(
      { error: 'Error al obtener ventas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { canal, productoId, cantidad, monto, fechaVenta, cliente, clienteId } = body;

    // Validaciones básicas
    if (!canal || !productoId || !cantidad || !monto || !fechaVenta) {
      return NextResponse.json(
        { error: 'Todos los campos requeridos deben estar completos' },
        { status: 400 }
      );
    }

    if (cantidad <= 0 || monto <= 0) {
      return NextResponse.json(
        { error: 'La cantidad y el monto deben ser mayores a 0' },
        { status: 400 }
      );
    }

    // Validar que la fecha no sea futura
    const fechaVentaDate = parsearFechaLocal(fechaVenta);
    if (esFechaFutura(fechaVentaDate)) {
      return NextResponse.json(
        { error: 'La fecha de venta no puede ser futura' },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenezca al negocio
    const producto = await prisma.producto.findFirst({
      where: {
        id: productoId,
        negocioId
      }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Si se seleccionó un cliente existente, verificar que pertenezca al negocio
    if (clienteId) {
      const clienteExistente = await prisma.cliente.findFirst({
        where: { id: clienteId, negocioId }
      });
      if (!clienteExistente) {
        return NextResponse.json(
          { error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }
    }

    // Crear venta y aplicar sus efectos en cascada (stock, cliente, alertas)
    const { venta, avisoStock } = await prisma.$transaction((tx) =>
      registrarVentaConStock(tx, producto, {
        negocioId,
        canal: canal as CanalVenta,
        productoId,
        cantidad,
        monto,
        fechaVenta: fechaVentaDate,
        cliente,
        clienteId,
        origenCarga: OrigenCarga.manual
      })
    );

    return NextResponse.json({ venta, avisoStock }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar venta:', error);
    return NextResponse.json(
      { error: 'Error al registrar venta' },
      { status: 500 }
    );
  }
}
