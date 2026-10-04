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

    // Obtener canales personalizados activos del negocio, para que el CSV pueda
    // usar directamente su nombre (ej. "Rappi") en la columna "canal"
    const canalesPersonalizados = await prisma.canalPersonalizado.findMany({
      where: { negocioId, activo: true },
      select: { id: true, nombre: true }
    });
    const canalPersonalizadoMap = new Map<string, { id: string }>(
      canalesPersonalizados.map(c => [c.nombre.toLowerCase(), { id: c.id }])
    );

    const canalesFijos: CanalVenta[] = Object.values(CanalVenta).filter((c) => c !== CanalVenta.otro);

    // Datos ya validados de una línea del CSV, lista para convertirse en un ítem de venta.
    interface DatosLinea {
      canalFinal: CanalVenta;
      canalPersonalizadoId: string | null;
      productoId: string;
      cantidad: number;
      precioUnitario: number;
      fechaVenta: Date;
      cliente: string | null;
    }

    // Cada fila del CSV, ya sea válida o no. "numeroVenta" agrupa varias filas en
    // una sola venta con varios productos (columna opcional "numero_venta"); las
    // filas sin ese valor siguen siendo una venta de un solo producto, como antes.
    interface FilaProcesada {
      linea: number;
      numeroVenta: string | null;
      ok: boolean;
      mensaje?: string;
      datos?: DatosLinea;
    }

    const filas: FilaProcesada[] = [];

    for (let i = 0; i < ventasCSV.length; i++) {
      const venta = ventasCSV[i];
      const linea = i + 1;
      const numeroVenta = venta.numero_venta && String(venta.numero_venta).trim()
        ? String(venta.numero_venta).trim()
        : null;

      const fallar = (mensaje: string) => filas.push({ linea, numeroVenta, ok: false, mensaje });

      // Validar campos requeridos
      if (!venta.canal || !venta.producto || !venta.cantidad || !venta.monto || !venta.fecha_venta) {
        fallar('Faltan campos requeridos (canal, producto, cantidad, monto, fecha_venta)');
        continue;
      }

      // Validar canal: debe ser uno de los canales fijos, o el nombre exacto
      // de uno de los canales personalizados activos del negocio (ej. "Rappi")
      const canalRaw = String(venta.canal).trim();
      let canalFinal: CanalVenta;
      let canalPersonalizadoId: string | null = null;

      if (canalesFijos.includes(canalRaw as CanalVenta)) {
        canalFinal = canalRaw as CanalVenta;
      } else {
        const canalPersonalizado = canalPersonalizadoMap.get(canalRaw.toLowerCase());
        if (!canalPersonalizado) {
          fallar(`Canal inválido "${venta.canal}". Valores válidos: ${canalesFijos.join(', ')}, o el nombre de uno de tus canales personalizados.`);
          continue;
        }
        canalFinal = CanalVenta.otro;
        canalPersonalizadoId = canalPersonalizado.id;
      }

      // Validar cantidad y monto
      const cantidad = parseInt(venta.cantidad);
      const monto = parseFloat(venta.monto);

      if (isNaN(cantidad) || cantidad <= 0) {
        fallar('La cantidad debe ser un número mayor a 0');
        continue;
      }

      if (isNaN(monto) || monto <= 0) {
        fallar('El monto debe ser un número mayor a 0');
        continue;
      }

      // Validar fecha
      const fechaVenta = parsearFechaLocal(venta.fecha_venta);
      if (isNaN(fechaVenta.getTime())) {
        fallar('Fecha inválida. Formato esperado: YYYY-MM-DD');
        continue;
      }

      // Validar que la fecha no sea futura
      if (esFechaFutura(fechaVenta)) {
        fallar('La fecha no puede ser futura');
        continue;
      }

      // Validar producto
      const productoInfo = productoMap.get(String(venta.producto).toLowerCase());
      if (!productoInfo) {
        fallar(`Producto "${venta.producto}" no encontrado en tu catálogo`);
        continue;
      }

      filas.push({
        linea,
        numeroVenta,
        ok: true,
        datos: {
          canalFinal,
          canalPersonalizadoId,
          productoId: productoInfo.id,
          cantidad,
          precioUnitario: monto / cantidad,
          fechaVenta,
          cliente: venta.cliente ? String(venta.cliente).trim() : null
        }
      });
    }

    // Agrupar todas las filas (válidas e inválidas) por número de venta. Las filas
    // sin numero_venta forman cada una su propio grupo de un solo producto.
    const grupos = new Map<string, FilaProcesada[]>();
    filas.forEach((f, idx) => {
      const clave = f.numeroVenta ?? `__sola_${idx}`;
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave)!.push(f);
    });

    const erroresConLinea: { linea: number; mensaje: string }[] = [];
    const alertasStock: string[] = [];
    let ventasCreadas = 0;

    for (const [numeroVenta, grupoFilas] of grupos) {
      // Si alguna línea del grupo falló su propia validación, se descarta la venta
      // completa: no tiene sentido registrar la venta con solo algunos productos.
      const invalidas = grupoFilas.filter((f) => !f.ok);
      if (invalidas.length > 0) {
        grupoFilas.forEach((f) => {
          erroresConLinea.push({
            linea: f.linea,
            mensaje: f.ok
              ? `No se importó: otra línea del número de venta "${numeroVenta}" tiene un error`
              : f.mensaje!
          });
        });
        continue;
      }

      // Todas las líneas de un mismo número de venta deben compartir canal, fecha y cliente.
      if (grupoFilas.length > 1) {
        const primera = grupoFilas[0].datos!;
        const inconsistente = grupoFilas.some((f) => {
          const d = f.datos!;
          return (
            d.canalFinal !== primera.canalFinal ||
            d.canalPersonalizadoId !== primera.canalPersonalizadoId ||
            d.fechaVenta.getTime() !== primera.fechaVenta.getTime() ||
            (d.cliente ?? '') !== (primera.cliente ?? '')
          );
        });
        if (inconsistente) {
          grupoFilas.forEach((f) => erroresConLinea.push({
            linea: f.linea,
            mensaje: `El canal, la fecha y el cliente deben ser iguales en todas las líneas del número de venta "${numeroVenta}"`
          }));
          continue;
        }
      }

      try {
        const primera = grupoFilas[0].datos!;
        // Crear la venta (con uno o varios productos) y aplicar sus efectos en cascada
        const { alertasStock: alertasGrupo } = await prisma.$transaction((tx) =>
          registrarVentaConStock(tx, {
            negocioId,
            canal: primera.canalFinal,
            canalPersonalizadoId: primera.canalPersonalizadoId,
            items: grupoFilas.map((f) => ({
              productoId: f.datos!.productoId,
              cantidad: f.datos!.cantidad,
              precioUnitario: f.datos!.precioUnitario
            })),
            fechaVenta: primera.fechaVenta,
            cliente: primera.cliente,
            origenCarga: OrigenCarga.importacion
          })
        );
        alertasStock.push(...alertasGrupo);
        ventasCreadas++;
      } catch (error) {
        grupoFilas.forEach((f) => erroresConLinea.push({ linea: f.linea, mensaje: 'Error al procesar venta' }));
      }
    }

    const errores = erroresConLinea
      .sort((a, b) => a.linea - b.linea)
      .map((e) => `Línea ${e.linea}: ${e.mensaje}`);

    return NextResponse.json({
      message: 'Importación completada',
      totalProcesado: ventasCSV.length,
      ventasCreadas,
      errores,
      erroresCount: errores.length,
      alertasStock
    }, { status: 200 });
  } catch (error) {
    console.error('Error en importación:', error);
    return NextResponse.json(
      { error: 'Error al procesar importación' },
      { status: 500 }
    );
  }
}
