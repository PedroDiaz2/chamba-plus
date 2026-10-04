import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CanalVenta } from '@prisma/client';
import { siguienteCodigo, normalizarCodigo } from '@/lib/codigos';
import { claveCanal, esClaveCanalPersonalizado, idDesdeClaveCanal } from '@/lib/canales';

export async function GET(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const clientes = await prisma.cliente.findMany({
      where: { negocioId },
      include: {
        canalPreferidoPersonalizado: true,
        ventas: {
          select: { monto: true, fechaVenta: true, canal: true, canalPersonalizadoId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const clientesConMetricas = clientes.map((c) => {
      const compras = c.ventas.length;
      const totalGastado = c.ventas.reduce((sum, v) => sum + v.monto, 0);
      const ultimaCompra = c.ventas.reduce<Date | null>((max, v) => {
        return !max || v.fechaVenta > max ? v.fechaVenta : max;
      }, null);

      let canalPreferidoFinal = c.canalPreferido;
      let canalPreferidoPersonalizadoIdFinal = c.canalPreferidoPersonalizadoId;

      if (!canalPreferidoFinal) {
        const canalCount: Record<string, number> = {};
        for (const v of c.ventas) {
          const clave = claveCanal(v.canal, v.canalPersonalizadoId);
          canalCount[clave] = (canalCount[clave] || 0) + 1;
        }
        const claveTop = Object.entries(canalCount).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (claveTop) {
          if (esClaveCanalPersonalizado(claveTop)) {
            canalPreferidoFinal = CanalVenta.otro;
            canalPreferidoPersonalizadoIdFinal = idDesdeClaveCanal(claveTop);
          } else {
            canalPreferidoFinal = claveTop as CanalVenta;
          }
        }
      }

      const { ventas, ...clienteBase } = c;
      return {
        ...clienteBase,
        compras,
        totalGastado,
        ultimaCompra,
        canalPreferido: canalPreferidoFinal,
        canalPreferidoPersonalizadoId: canalPreferidoPersonalizadoIdFinal,
        esRecurrente: compras > 1
      };
    });

    return NextResponse.json({ clientes: clientesConMetricas }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
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
    const { codigo, nombre, telefono, dni, direccion, canalPreferido, canalPreferidoPersonalizadoId, notas } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre del cliente es requerido' },
        { status: 400 }
      );
    }

    const existente = await prisma.cliente.findUnique({
      where: { negocioId_nombre: { negocioId, nombre } }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con ese nombre' },
        { status: 409 }
      );
    }

    let canalPersonalizadoFinal: string | null = null;
    if (canalPreferido === CanalVenta.otro) {
      if (!canalPreferidoPersonalizadoId) {
        return NextResponse.json(
          { error: 'Debes elegir cual canal personalizado prefiere este cliente' },
          { status: 400 }
        );
      }
      const canalPersonalizado = await prisma.canalPersonalizado.findFirst({
        where: { id: canalPreferidoPersonalizadoId, negocioId, activo: true }
      });
      if (!canalPersonalizado) {
        return NextResponse.json(
          { error: 'Canal personalizado no encontrado o inactivo' },
          { status: 404 }
        );
      }
      canalPersonalizadoFinal = canalPersonalizado.id;
    }

    const codigosExistentes = await prisma.cliente.findMany({ where: { negocioId }, select: { codigo: true } });
    let codigoFinal: string;
    if (codigo && String(codigo).trim()) {
      codigoFinal = normalizarCodigo(String(codigo));
      if (codigosExistentes.some((c) => c.codigo === codigoFinal)) {
        return NextResponse.json(
          { error: `Ya existe un cliente con el código "${codigoFinal}"` },
          { status: 409 }
        );
      }
    } else {
      codigoFinal = siguienteCodigo(codigosExistentes.map((c) => c.codigo), 'CL');
    }

    const cliente = await prisma.cliente.create({
      data: {
        negocioId,
        codigo: codigoFinal,
        nombre,
        telefono: telefono || null,
        dni: dni || null,
        direccion: direccion || null,
        canalPreferido: canalPreferido ? (canalPreferido as CanalVenta) : null,
        canalPreferidoPersonalizadoId: canalPersonalizadoFinal,
        notas: notas || null
      },
      include: { canalPreferidoPersonalizado: true }
    });

    return NextResponse.json({ cliente }, { status: 201 });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    return NextResponse.json(
      { error: 'Error al crear cliente' },
      { status: 500 }
    );
  }
}
