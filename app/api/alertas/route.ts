import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TipoAlerta } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const alertas = await prisma.alerta.findMany({
      where: { negocioId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ alertas }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return NextResponse.json(
      { error: 'Error al obtener alertas' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { alertaId, leida } = body;

    if (!alertaId) {
      return NextResponse.json(
        { error: 'ID de alerta requerido' },
        { status: 400 }
      );
    }

    const alerta = await prisma.alerta.findFirst({
      where: { id: alertaId, negocioId }
    });

    if (!alerta) {
      return NextResponse.json(
        { error: 'Alerta no encontrada' },
        { status: 404 }
      );
    }

    const alertaActualizada = await prisma.alerta.update({
      where: { id: alertaId },
      data: { leida }
    });

    return NextResponse.json({ alerta: alertaActualizada }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar alerta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar alerta' },
      { status: 500 }
    );
  }
}
