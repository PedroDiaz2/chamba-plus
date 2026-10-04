import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const canalesPersonalizados = await prisma.canalPersonalizado.findMany({
      where: { negocioId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ canalesPersonalizados }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener canales personalizados:', error);
    return NextResponse.json(
      { error: 'Error al obtener canales personalizados' },
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
    const { nombre, descripcion } = body;

    if (!nombre || !String(nombre).trim()) {
      return NextResponse.json(
        { error: 'El nombre del canal es requerido' },
        { status: 400 }
      );
    }

    if (!descripcion || !String(descripcion).trim()) {
      return NextResponse.json(
        { error: 'La descripcion del canal es requerida' },
        { status: 400 }
      );
    }

    const nombreFinal = String(nombre).trim();

    const existente = await prisma.canalPersonalizado.findUnique({
      where: { negocioId_nombre: { negocioId, nombre: nombreFinal } }
    });

    if (existente) {
      return NextResponse.json(
        { error: `Ya tienes un canal personalizado con el nombre "${nombreFinal}"` },
        { status: 409 }
      );
    }

    const canalPersonalizado = await prisma.canalPersonalizado.create({
      data: {
        negocioId,
        nombre: nombreFinal,
        descripcion: String(descripcion).trim(),
        activo: true
      }
    });

    return NextResponse.json({ canalPersonalizado }, { status: 201 });
  } catch (error) {
    console.error('Error al crear canal personalizado:', error);
    return NextResponse.json(
      { error: 'Error al crear canal personalizado' },
      { status: 500 }
    );
  }
}
