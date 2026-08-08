import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CanalVenta } from '@prisma/client';
import { siguienteCodigo, normalizarCodigo } from '@/lib/codigos';

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
    const { clientes: filas } = body;

    if (!filas || !Array.isArray(filas)) {
      return NextResponse.json(
        { error: 'Formato inválido. Se espera un array de clientes' },
        { status: 400 }
      );
    }

    const existentes = await prisma.cliente.findMany({ where: { negocioId }, select: { codigo: true, nombre: true } });
    const codigosUsados = new Set(existentes.map((c) => c.codigo));
    const nombresUsados = new Set(existentes.map((c) => c.nombre.toLowerCase()));

    const errores: string[] = [];
    let creados = 0;

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const linea = i + 1;

      try {
        const nombre = fila.nombre ? String(fila.nombre).trim() : '';
        if (!nombre) {
          errores.push(`Línea ${linea}: El nombre es requerido`);
          continue;
        }

        if (nombresUsados.has(nombre.toLowerCase())) {
          errores.push(`Línea ${linea}: Ya existe un cliente con el nombre "${nombre}"`);
          continue;
        }

        let canalPreferido: CanalVenta | null = null;
        if (fila.canalPreferido && String(fila.canalPreferido).trim()) {
          const canalRaw = String(fila.canalPreferido).trim().toLowerCase();
          if (!Object.values(CanalVenta).includes(canalRaw as CanalVenta)) {
            errores.push(`Línea ${linea}: Canal preferido inválido "${fila.canalPreferido}"`);
            continue;
          }
          canalPreferido = canalRaw as CanalVenta;
        }

        let codigo: string;
        if (fila.codigo && String(fila.codigo).trim()) {
          codigo = normalizarCodigo(String(fila.codigo));
          if (codigosUsados.has(codigo)) {
            errores.push(`Línea ${linea}: El código "${codigo}" ya está en uso`);
            continue;
          }
        } else {
          codigo = siguienteCodigo(Array.from(codigosUsados), 'CL');
        }
        codigosUsados.add(codigo);
        nombresUsados.add(nombre.toLowerCase());

        await prisma.cliente.create({
          data: {
            negocioId,
            codigo,
            nombre,
            telefono: fila.telefono ? String(fila.telefono).trim() : null,
            dni: fila.dni ? String(fila.dni).trim() : null,
            direccion: fila.direccion ? String(fila.direccion).trim() : null,
            canalPreferido,
            notas: fila.notas ? String(fila.notas).trim() : null
          }
        });

        creados++;
      } catch (error) {
        errores.push(`Línea ${linea}: Error al procesar el registro`);
      }
    }

    return NextResponse.json({
      message: 'Importación completada',
      totalProcesado: filas.length,
      creados,
      errores,
      erroresCount: errores.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error en importación de clientes:', error);
    return NextResponse.json(
      { error: 'Error al procesar la importación' },
      { status: 500 }
    );
  }
}
