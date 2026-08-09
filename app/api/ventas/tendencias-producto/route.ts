import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { construirBuckets, construirBucketsRango, Periodo } from '@/lib/periodos';
import { parsearFechaLocal } from '@/lib/fechas';

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
    const periodo = (searchParams.get('periodo') || 'mes') as Periodo;
    const productoId = searchParams.get('productoId');
    const fechaInicioParam = searchParams.get('fechaInicio');
    const fechaFinParam = searchParams.get('fechaFin');

    if (!productoId) {
      return NextResponse.json(
        { error: 'productoId es requerido' },
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

    const usaRangoPersonalizado = !!(fechaInicioParam && fechaFinParam);

    let buckets;
    if (usaRangoPersonalizado) {
      const fechaInicio = parsearFechaLocal(fechaInicioParam!);
      const fechaFin = parsearFechaLocal(fechaFinParam!);
      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime()) || fechaInicio > fechaFin) {
        return NextResponse.json(
          { error: 'Rango de fechas inválido' },
          { status: 400 }
        );
      }
      buckets = construirBucketsRango(fechaInicio, fechaFin);
    } else {
      buckets = construirBuckets(periodo);
    }

    const desde = buckets[0].inicio;
    const hasta = buckets[buckets.length - 1].fin;

    const ventas = await prisma.venta.findMany({
      where: { negocioId, productoId, fechaVenta: { gte: desde, lt: hasta } },
      select: { cantidad: true, monto: true, fechaVenta: true }
    });

    const data = buckets.map((bucket) => {
      const ventasBucket = ventas.filter((v) => v.fechaVenta >= bucket.inicio && v.fechaVenta < bucket.fin);
      return {
        periodo: bucket.label,
        cantidad: ventasBucket.reduce((sum, v) => sum + v.cantidad, 0),
        monto: ventasBucket.reduce((sum, v) => sum + v.monto, 0)
      };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener tendencias de producto:', error);
    return NextResponse.json(
      { error: 'Error al obtener tendencias de producto' },
      { status: 500 }
    );
  }
}
