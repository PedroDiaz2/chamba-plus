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
    const metrica = searchParams.get('metrica') || 'monto';
    const fechaInicioParam = searchParams.get('fechaInicio');
    const fechaFinParam = searchParams.get('fechaFin');

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
      where: { negocioId, fechaVenta: { gte: desde, lt: hasta } },
      select: { canal: true, monto: true, fechaVenta: true }
    });

    const canalesPresentes = Array.from(new Set(ventas.map((v) => v.canal)));

    const data = buckets.map((bucket) => {
      const ventasBucket = ventas.filter((v) => v.fechaVenta >= bucket.inicio && v.fechaVenta < bucket.fin);
      const porCanal = ventasBucket.reduce((acc, v) => {
        if (!acc[v.canal]) acc[v.canal] = { monto: 0, cantidad: 0 };
        acc[v.canal].monto += v.monto;
        acc[v.canal].cantidad += 1;
        return acc;
      }, {} as Record<string, { monto: number; cantidad: number }>);

      const fila: Record<string, string | number> = { periodo: bucket.label };
      for (const canal of canalesPresentes) {
        const valores = porCanal[canal];
        if (!valores) {
          fila[canal] = 0;
        } else if (metrica === 'cantidad') {
          fila[canal] = valores.cantidad;
        } else if (metrica === 'ticket') {
          fila[canal] = valores.cantidad > 0 ? valores.monto / valores.cantidad : 0;
        } else {
          fila[canal] = valores.monto;
        }
      }
      return fila;
    });

    return NextResponse.json({ data, canales: canalesPresentes }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener comparación de canales:', error);
    return NextResponse.json(
      { error: 'Error al obtener comparación de canales' },
      { status: 500 }
    );
  }
}
