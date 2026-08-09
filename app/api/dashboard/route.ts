import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcularKPIs } from '@/lib/kpi-engine';
import { CanalVenta, TipoProducto } from '@prisma/client';
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
    const canal = searchParams.get('canal');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const tipoItem = searchParams.get('tipoItem');

    const filters: any = {};
    if (canal) filters.canal = canal as CanalVenta;
    if (fechaInicio && fechaFin) {
      filters.fechaInicio = parsearFechaLocal(fechaInicio);
      filters.fechaFin = parsearFechaLocal(fechaFin);
    }
    if (tipoItem === 'producto' || tipoItem === 'servicio') {
      filters.tipoItem = tipoItem as TipoProducto;
    }

    const kpis = await calcularKPIs(negocioId, filters);

    // Obtener datos adicionales para el dashboard
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { nombre: true }
    });

    // Ventas de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ventasHoy = await prisma.venta.findMany({
      where: {
        negocioId,
        fechaVenta: { gte: hoy }
      }
    });

    const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.monto, 0);
    const cantidadVentasHoy = ventasHoy.length;

    // Ventas de ayer para comparación
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const ventasAyer = await prisma.venta.findMany({
      where: {
        negocioId,
        fechaVenta: {
          gte: ayer,
          lt: hoy
        }
      }
    });

    const totalVentasAyer = ventasAyer.reduce((sum, v) => sum + v.monto, 0);
    const variacionHoy = totalVentasAyer > 0 ? ((totalVentasHoy - totalVentasAyer) / totalVentasAyer) * 100 : 0;

    return NextResponse.json({
      negocio,
      kpis,
      resumenHoy: {
        totalVentasHoy,
        cantidadVentasHoy,
        variacionHoy
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    return NextResponse.json(
      { error: 'Error al obtener dashboard' },
      { status: 500 }
    );
  }
}
