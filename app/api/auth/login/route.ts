import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validaciones básicas
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar negocio por email
    const negocio = await prisma.negocio.findUnique({
      where: { email }
    });

    if (!negocio) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, negocio.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Crear respuesta con datos del negocio (sin contraseña)
    const response = NextResponse.json(
      {
        message: 'Sesión iniciada correctamente',
        negocio: {
          id: negocio.id,
          nombre: negocio.nombre,
          email: negocio.email,
          rubro: negocio.rubro,
          canales: negocio.canales
        }
      },
      { status: 200 }
    );

    // Set cookie de sesión
    response.cookies.set('negocioId', negocio.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });

    return response;
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}
