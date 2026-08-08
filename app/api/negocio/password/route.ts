import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';

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
    const { passwordActual, passwordNueva } = body;

    if (!passwordActual || !passwordNueva) {
      return NextResponse.json(
        { error: 'Debes indicar la contraseña actual y la nueva' },
        { status: 400 }
      );
    }

    if (passwordNueva.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
    if (!negocio) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const esValida = await verifyPassword(passwordActual, negocio.password);
    if (!esValida) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      );
    }

    const nuevaHash = await hashPassword(passwordNueva);
    await prisma.negocio.update({ where: { id: negocioId }, data: { password: nuevaHash } });

    return NextResponse.json({ message: 'Contraseña actualizada correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    return NextResponse.json(
      { error: 'Error al cambiar la contraseña' },
      { status: 500 }
    );
  }
}
