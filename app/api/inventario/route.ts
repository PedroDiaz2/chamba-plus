import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TipoMovimiento, TipoProducto } from '@prisma/client';
import { generarAlertaStockSiCorresponde } from '@/lib/inventario-service';

export async function GET(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const productos = await prisma.producto.findMany({
      where: { negocioId, tipo: TipoProducto.producto },
      orderBy: { nombre: 'asc' }
    });

    const productosConValor = productos.map((p) => ({
      ...p,
      valorInventario: p.precioCosto != null ? p.stock * p.precioCosto : null,
      stockCritico: p.stock <= p.stockMinimo
    }));

    const valorTotalInventario = productosConValor.reduce((sum, p) => sum + (p.valorInventario || 0), 0);
    const productosStockCritico = productosConValor.filter((p) => p.stockCritico).length;

    const movimientos = await prisma.movimientoInventario.findMany({
      where: { negocioId },
      include: { producto: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    return NextResponse.json({
      productos: productosConValor,
      resumen: {
        valorTotalInventario,
        productosStockCritico,
        totalProductos: productos.length
      },
      movimientos
    }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return NextResponse.json(
      { error: 'Error al obtener inventario' },
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
    const { productoId, tipo, cantidad, motivo } = body;

    if (!productoId || !tipo || !cantidad) {
      return NextResponse.json(
        { error: 'Producto, tipo y cantidad son requeridos' },
        { status: 400 }
      );
    }

    if (!['ingreso', 'ajuste'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de movimiento inválido' },
        { status: 400 }
      );
    }

    const cantidadNum = Math.trunc(Number(cantidad));
    if (!Number.isFinite(cantidadNum) || cantidadNum === 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser un número distinto de 0' },
        { status: 400 }
      );
    }

    if (tipo === 'ingreso' && cantidadNum <= 0) {
      return NextResponse.json(
        { error: 'Un ingreso de stock debe ser una cantidad positiva' },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.findFirst({
      where: { id: productoId, negocioId }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (producto.tipo === TipoProducto.servicio) {
      return NextResponse.json(
        { error: 'Los servicios no manejan inventario' },
        { status: 400 }
      );
    }

    const stockPrevio = producto.stock;
    const stockResultante = stockPrevio + cantidadNum;

    const movimiento = await prisma.$transaction(async (tx) => {
      await tx.producto.update({
        where: { id: producto.id },
        data: { stock: stockResultante }
      });

      const mov = await tx.movimientoInventario.create({
        data: {
          productoId: producto.id,
          negocioId,
          tipo: tipo as TipoMovimiento,
          cantidad: cantidadNum,
          stockResultante,
          motivo: motivo || null
        }
      });

      const alertaStock = await generarAlertaStockSiCorresponde(tx, {
        negocioId,
        productoId: producto.id,
        nombreProducto: producto.nombre,
        stockPrevio,
        stockResultante,
        stockMinimo: producto.stockMinimo
      });

      return { mov, alertaStock };
    });

    return NextResponse.json({ movimiento: movimiento.mov, stockResultante, alertaStock: movimiento.alertaStock }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar movimiento de inventario:', error);
    return NextResponse.json(
      { error: 'Error al registrar movimiento de inventario' },
      { status: 500 }
    );
  }
}
