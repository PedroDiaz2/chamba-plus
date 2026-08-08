import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { CanalVenta } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, businessName, businessType, phone, canales } = body;

    // Validaciones básicas
    if (!firstName || !lastName || !email || !password || !businessName || !businessType || !phone || !canales) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingNegocio = await prisma.negocio.findUnique({
      where: { email }
    });

    if (existingNegocio) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este correo electrónico' },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);

    // Crear negocio
    const negocio = await prisma.negocio.create({
      data: {
        nombre: businessName,
        rubro: businessType,
        email,
        password: hashedPassword,
        telefono: phone,
        canales: canales as CanalVenta[],
      }
    });

    const response = NextResponse.json(
      {
        message: 'Cuenta creada exitosamente',
        negocio: {
          id: negocio.id,
          nombre: negocio.nombre,
          email: negocio.email
        }
      },
      { status: 201 }
    );

    response.cookies.set('negocioId', negocio.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });

    return response;
  } catch (error) {
    console.error('Error en registro:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Error al crear la cuenta', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
