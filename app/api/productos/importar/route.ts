import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TipoProducto, UnidadMedida } from '@prisma/client';
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
    const { productos: filas } = body;

    if (!filas || !Array.isArray(filas)) {
      return NextResponse.json(
        { error: 'Formato inválido. Se espera un array de productos' },
        { status: 400 }
      );
    }

    const existentes = await prisma.producto.findMany({ where: { negocioId }, select: { codigo: true } });
    const codigosUsados = new Set(existentes.map((p) => p.codigo));

    const errores: string[] = [];
    let creados = 0;

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const linea = i + 1;

      try {
        if (!fila.nombre || !String(fila.nombre).trim()) {
          errores.push(`Línea ${linea}: El nombre es requerido`);
          continue;
        }

        const tipoRaw = (fila.tipo || 'producto').trim().toLowerCase();
        if (!['producto', 'servicio'].includes(tipoRaw)) {
          errores.push(`Línea ${linea}: Tipo inválido "${fila.tipo}". Usa "producto" o "servicio"`);
          continue;
        }
        const esServicio = tipoRaw === 'servicio';

        let unidad: UnidadMedida = esServicio ? UnidadMedida.hora : UnidadMedida.unidad;
        if (fila.unidad && String(fila.unidad).trim()) {
          const unidadRaw = String(fila.unidad).trim().toLowerCase();
          if (!Object.values(UnidadMedida).includes(unidadRaw as UnidadMedida)) {
            errores.push(`Línea ${linea}: Unidad inválida "${fila.unidad}". Valores válidos: ${Object.values(UnidadMedida).join(', ')}`);
            continue;
          }
          unidad = unidadRaw as UnidadMedida;
        }

        let stock = 0;
        let stockMinimo = 0;
        if (!esServicio) {
          if (fila.stock !== undefined && fila.stock !== '') {
            stock = parseInt(fila.stock, 10);
            if (isNaN(stock) || stock < 0) {
              errores.push(`Línea ${linea}: El stock no puede ser negativo`);
              continue;
            }
          }
          if (fila.stockMinimo !== undefined && fila.stockMinimo !== '') {
            stockMinimo = parseInt(fila.stockMinimo, 10);
            if (isNaN(stockMinimo) || stockMinimo < 0) {
              errores.push(`Línea ${linea}: El stock mínimo no puede ser negativo`);
              continue;
            }
          }
        }

        let precioVenta: number | null = null;
        if (fila.precioVenta !== undefined && fila.precioVenta !== '') {
          precioVenta = parseFloat(fila.precioVenta);
          if (isNaN(precioVenta) || precioVenta < 0) {
            errores.push(`Línea ${linea}: El precio de venta no puede ser negativo`);
            continue;
          }
        }

        let precioCosto: number | null = null;
        if (fila.precioCosto !== undefined && fila.precioCosto !== '') {
          precioCosto = parseFloat(fila.precioCosto);
          if (isNaN(precioCosto) || precioCosto < 0) {
            errores.push(`Línea ${linea}: El precio de costo no puede ser negativo`);
            continue;
          }
        }

        let codigo: string;
        if (fila.codigo && String(fila.codigo).trim()) {
          codigo = normalizarCodigo(String(fila.codigo));
          if (codigosUsados.has(codigo)) {
            errores.push(`Línea ${linea}: El código "${codigo}" ya está en uso`);
            continue;
          }
        } else {
          codigo = siguienteCodigo(Array.from(codigosUsados), 'PR');
        }
        codigosUsados.add(codigo);

        await prisma.$transaction(async (tx) => {
          const nuevoProducto = await tx.producto.create({
            data: {
              negocioId,
              codigo,
              nombre: String(fila.nombre).trim(),
              categoria: fila.categoria ? String(fila.categoria).trim() : null,
              tipo: esServicio ? TipoProducto.servicio : TipoProducto.producto,
              unidad,
              stock,
              stockMinimo,
              precioVenta,
              precioCosto
            }
          });

          if (!esServicio && stock > 0) {
            await tx.movimientoInventario.create({
              data: {
                productoId: nuevoProducto.id,
                negocioId,
                tipo: 'ingreso',
                cantidad: stock,
                stockResultante: stock,
                motivo: 'Carga masiva'
              }
            });
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
    console.error('Error en importación de productos:', error);
    return NextResponse.json(
      { error: 'Error al procesar la importación' },
      { status: 500 }
    );
  }
}
