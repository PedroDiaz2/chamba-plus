import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TipoProducto, UnidadMedida } from '@prisma/client';
import { siguienteCodigo, normalizarCodigo } from '@/lib/codigos';

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
      where: { negocioId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ productos }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
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
    const { codigo, nombre, categoria, tipo, unidad, stock, stockMinimo, precioVenta, precioCosto } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre del producto es requerido' },
        { status: 400 }
      );
    }

    const codigosExistentes = await prisma.producto.findMany({ where: { negocioId }, select: { codigo: true } });
    let codigoFinal: string;
    if (codigo && String(codigo).trim()) {
      codigoFinal = normalizarCodigo(String(codigo));
      if (codigosExistentes.some((p) => p.codigo === codigoFinal)) {
        return NextResponse.json(
          { error: `Ya existe un producto o servicio con el código "${codigoFinal}"` },
          { status: 409 }
        );
      }
    } else {
      codigoFinal = siguienteCodigo(codigosExistentes.map((p) => p.codigo), 'PR');
    }

    const esServicio = tipo === TipoProducto.servicio;

    if (!esServicio && stock !== undefined && (!Number.isFinite(stock) || stock < 0)) {
      return NextResponse.json(
        { error: 'El stock inicial no puede ser negativo' },
        { status: 400 }
      );
    }

    if (!esServicio && stockMinimo !== undefined && (!Number.isFinite(stockMinimo) || stockMinimo < 0)) {
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

    if (unidad !== undefined && unidad !== null && !Object.values(UnidadMedida).includes(unidad)) {
      return NextResponse.json(
        { error: 'Unidad de medida inválida' },
        { status: 400 }
      );
    }

    const stockInicial = !esServicio && Number.isFinite(stock) ? Math.trunc(stock) : 0;
    const stockMinimoInicial = !esServicio && Number.isFinite(stockMinimo) ? Math.trunc(stockMinimo) : 0;

    const producto = await prisma.$transaction(async (tx) => {
      const nuevoProducto = await tx.producto.create({
        data: {
          negocioId,
          codigo: codigoFinal,
          nombre,
          categoria: categoria || null,
          tipo: esServicio ? TipoProducto.servicio : TipoProducto.producto,
          unidad: (unidad as UnidadMedida) || (esServicio ? UnidadMedida.hora : UnidadMedida.unidad),
          stock: stockInicial,
          stockMinimo: stockMinimoInicial,
          precioVenta: Number.isFinite(precioVenta) ? precioVenta : null,
          precioCosto: Number.isFinite(precioCosto) ? precioCosto : null
        }
      });

      // Los servicios no generan movimiento de inventario (no manejan stock)
      if (!esServicio && stockInicial > 0) {
        await tx.movimientoInventario.create({
          data: {
            productoId: nuevoProducto.id,
            negocioId,
            tipo: 'ingreso',
            cantidad: stockInicial,
            stockResultante: stockInicial,
            motivo: 'Stock inicial'
          }
        });
      }

      return nuevoProducto;
    });

    return NextResponse.json({ producto }, { status: 201 });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}
