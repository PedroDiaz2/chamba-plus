import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CanalVenta, OrigenCarga } from '@prisma/client';
import { registrarVentaConStock } from '@/lib/ventas-service';
import { parsearFechaLocal, esFechaFutura } from '@/lib/fechas';

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
    const { ventas: ventasCSV } = body;

    if (!ventasCSV || !Array.isArray(ventasCSV)) {
      return NextResponse.json(
        { error: 'Formato inválido. Se espera un array de ventas' },
        { status: 400 }
      );
    }

    // Obtener productos del negocio para validar
    const productos = await prisma.producto.findMany({
      where: { negocioId },
      select: { id: true, nombre: true }
    });

    const productoMap = new Map<string, { id: string }>(
      productos.map(p => [p.nombre.toLowerCase(), { id: p.id }])
    );

    const errores: string[] = [];
    const ventasCreadas: any[] = [];

    for (let i = 0; i < ventasCSV.length; i++) {
      const venta = ventasCSV[i];
      const linea = i + 1;

      try {
        // Validar campos requeridos
        if (!venta.canal || !venta.producto || !venta.cantidad || !venta.monto || !venta.fecha_venta) {
          errores.push(`Línea ${linea}: Faltan campos requeridos (canal, producto, cantidad, monto, fecha_venta)`);
          continue;
        }

        // Validar canal
        if (!Object.values(CanalVenta).includes(venta.canal)) {
          errores.push(`Línea ${linea}: Canal inválido. Valores válidos: ${Object.values(CanalVenta).join(', ')}`);
          continue;
        }

        // Validar cantidad y monto
        const cantidad = parseInt(venta.cantidad);
        const monto = parseFloat(venta.monto);

        if (isNaN(cantidad) || cantidad <= 0) {
          errores.push(`Línea ${linea}: La cantidad debe ser un número mayor a 0`);
          continue;
        }

        if (isNaN(monto) || monto <= 0) {
          errores.push(`Línea ${linea}: El monto debe ser un número mayor a 0`);
          continue;
        }

        // Validar fecha
        const fechaVenta = parsearFechaLocal(venta.fecha_venta);
        if (isNaN(fechaVenta.getTime())) {
          errores.push(`Línea ${linea}: Fecha inválida. Formato esperado: YYYY-MM-DD`);
          continue;
        }

        // Validar que la fecha no sea futura
        if (esFechaFutura(fechaVenta)) {
          errores.push(`Línea ${linea}: La fecha no puede ser futura`);
          continue;
        }

        // Validar producto
        const productoInfo = productoMap.get(venta.producto.toLowerCase());
        if (!productoInfo) {
          errores.push(`Línea ${linea}: Producto "${venta.producto}" no encontrado en tu catálogo`);
          continue;
        }

        // Crear venta y aplicar sus efectos en cascada (stock, cliente, alertas)
        const { venta: ventaCreada } = await prisma.$transaction((tx) =>
          registrarVentaConStock(tx, {
            negocioId,
            canal: venta.canal as CanalVenta,
            items: [{ productoId: productoInfo.id, cantidad, precioUnitario: monto / cantidad }],
            fechaVenta,
            cliente: venta.cliente || null,
            origenCarga: OrigenCarga.importacion
          })
        );

        ventasCreadas.push(ventaCreada);
      } catch (error) {
        errores.push(`Línea ${linea}: Error al procesar venta`);
      }
    }

    return NextResponse.json({
      message: 'Importación completada',
      totalProcesado: ventasCSV.length,
      ventasCreadas: ventasCreadas.length,
      errores,
      erroresCount: errores.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error en importación:', error);
    return NextResponse.json(
      { error: 'Error al procesar importación' },
      { status: 500 }
    );
  }
}
