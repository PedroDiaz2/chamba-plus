import { prisma } from './prisma';
import { CanalVenta, TipoProducto } from '@prisma/client';
import { claveCanal, whereParaClaveCanal } from './canales';

interface KPIFilters {
  fechaInicio?: Date;
  fechaFin?: Date;
  canal?: CanalVenta;
  tipoItem?: TipoProducto;
}

interface KPIResult {
  participacionPorCanal: { canal: string; porcentaje: number; monto: number }[];
  variacionPorCanal: { canal: string; variacion: number; montoActual: number; montoAnterior: number }[];
  productoTopPorCanal: { canal: string; producto: string; cantidad: number; monto: number }[];
  ticketPromedioPorCanal: { canal: string; ticketPromedio: number }[];
  frecuenciaCompraPorCanal: { canal: string; frecuencia: number }[];
  variacionPeriodos: { periodoActual: string; periodoAnterior: string; variacion: number }[];
  inventario: {
    valorTotalInventario: number;
    rotacionInventario: number;
    productosStockCritico: { id: string; nombre: string; stock: number; stockMinimo: number }[];
    productosSinMovimiento: { id: string; nombre: string }[];
  };
  clientes: {
    totalClientes: number;
    clientesNuevos: number;
    clientesRecurrentes: number;
    tasaRecompra: number;
    ticketPromedioCliente: number;
    topClientes: { nombre: string; totalGastado: number; compras: number }[];
    clientesPorCanalPreferido: { canal: string; cantidad: number }[];
  };
  margenPorCanal: { canal: string; margen: number; monto: number; costo: number }[];
}

export async function calcularKPIs(negocioId: string, filters: KPIFilters = {}): Promise<KPIResult> {
  const { fechaInicio, fechaFin, canal, tipoItem } = filters;

  // Construir where clause
  const where: any = { negocioId };
  if (canal) where.canal = canal;
  if (fechaInicio && fechaFin) {
    where.fechaVenta = {
      gte: fechaInicio,
      lte: fechaFin
    };
  }

  // Obtener todas las ventas del negocio en el rango, con sus líneas de producto/servicio
  const ventas = await prisma.venta.findMany({
    where,
    include: { items: { include: { producto: true } } }
  });

  // Vista aplanada a nivel de línea de venta (producto), usada para los KPIs que son
  // por producto/servicio (top por canal, inventario, margen), mientras que `ventas`
  // (a nivel de transacción) se usa para los KPIs que son por venta (participación,
  // ticket promedio, frecuencia de compra, variación de periodos).
  // El campo "canal" aquí ya es la clave compuesta (ver lib/canales.ts): cada canal
  // personalizado (ej. "Rappi") se trata como su propio canal, no se agrupa bajo "otro".
  const itemsConVenta = ventas.flatMap((v) =>
    v.items.map((item) => ({ ...item, canal: claveCanal(v.canal, v.canalPersonalizadoId), fechaVenta: v.fechaVenta }))
  );

  // 1. Participación de ventas por canal (%)
  const ventasPorCanal = ventas.reduce((acc, v) => {
    const clave = claveCanal(v.canal, v.canalPersonalizadoId);
    acc[clave] = (acc[clave] || 0) + v.monto;
    return acc;
  }, {} as Record<string, number>);

  const totalVentas = Object.values(ventasPorCanal).reduce((sum, val) => sum + val, 0);
  const participacionPorCanal = Object.entries(ventasPorCanal).map(([canal, monto]) => ({
    canal,
    porcentaje: totalVentas > 0 ? (monto / totalVentas) * 100 : 0,
    monto
  }));

  // 2. Variación de ventas por canal en el tiempo
  // Comparar periodo actual con periodo anterior (misma duración)
  const variacionPorCanal = await Promise.all(
    Object.keys(ventasPorCanal).map(async (canalKey) => {
      const ventasCanalActual = ventas
        .filter(v => claveCanal(v.canal, v.canalPersonalizadoId) === canalKey)
        .reduce((sum, v) => sum + v.monto, 0);

      // Calcular periodo anterior (misma duración)
      let fechaInicioAnterior: Date;
      let fechaFinAnterior: Date;

      if (fechaInicio && fechaFin) {
        const duracion = fechaFin.getTime() - fechaInicio.getTime();
        fechaFinAnterior = new Date(fechaInicio.getTime() - 1);
        fechaInicioAnterior = new Date(fechaFinAnterior.getTime() - duracion);
      } else {
        // Por defecto: último mes vs mes anterior
        const hoy = new Date();
        fechaFinAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0); // Último día del mes anterior
        fechaInicioAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1); // Primer día del mes anterior
      }

      const ventasCanalAnterior = await prisma.venta.findMany({
        where: {
          negocioId,
          ...whereParaClaveCanal(canalKey),
          fechaVenta: {
            gte: fechaInicioAnterior,
            lte: fechaFinAnterior
          }
        }
      });

      const montoAnterior = ventasCanalAnterior.reduce((sum, v) => sum + v.monto, 0);
      const variacion = montoAnterior > 0 ? ((ventasCanalActual - montoAnterior) / montoAnterior) * 100 : 0;

      return {
        canal: canalKey,
        variacion,
        montoActual: ventasCanalActual,
        montoAnterior
      };
    })
  );

  // 3. Producto top por canal (filtrable por tipo: producto o servicio)
  const itemsParaTop = tipoItem ? itemsConVenta.filter((it) => it.producto.tipo === tipoItem) : itemsConVenta;
  const productosPorCanal = itemsParaTop.reduce((acc, it) => {
    if (!acc[it.canal]) {
      acc[it.canal] = {};
    }
    if (!acc[it.canal][it.producto.nombre]) {
      acc[it.canal][it.producto.nombre] = { cantidad: 0, monto: 0 };
    }
    acc[it.canal][it.producto.nombre].cantidad += it.cantidad;
    acc[it.canal][it.producto.nombre].monto += it.monto;
    return acc;
  }, {} as Record<string, Record<string, { cantidad: number; monto: number }>>);

  const productoTopPorCanal = Object.entries(productosPorCanal).map(([canal, productos]) => {
    const topProducto = Object.entries(productos).sort((a, b) => b[1].cantidad - a[1].cantidad)[0];
    return {
      canal,
      producto: topProducto[0],
      cantidad: topProducto[1].cantidad,
      monto: topProducto[1].monto
    };
  });

  // 4. Ticket promedio por canal
  const ventasPorCanalCount = ventas.reduce((acc, v) => {
    const clave = claveCanal(v.canal, v.canalPersonalizadoId);
    acc[clave] = (acc[clave] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ticketPromedioPorCanal = Object.entries(ventasPorCanal).map(([canal, monto]) => ({
    canal,
    ticketPromedio: ventasPorCanalCount[canal] > 0 ? monto / ventasPorCanalCount[canal] : 0
  }));

  // 5. Frecuencia de compra por canal/cliente
  const clientesPorCanal = ventas.reduce((acc, v) => {
    const clave = claveCanal(v.canal, v.canalPersonalizadoId);
    if (!acc[clave]) {
      acc[clave] = new Set();
    }
    if (v.cliente) {
      acc[clave].add(v.cliente);
    }
    return acc;
  }, {} as Record<string, Set<string>>);

  const frecuenciaCompraPorCanal = Object.entries(clientesPorCanal).map(([canal, clientes]) => ({
    canal,
    frecuencia: clientes.size > 0 ? ventasPorCanalCount[canal] / clientes.size : 0
  }));

  // 6. Variación porcentual entre periodos (semana/mes actual vs anterior)
  let variacionPeriodos: { periodoActual: string; periodoAnterior: string; variacion: number }[] = [];

  if (fechaInicio && fechaFin) {
    const duracion = fechaFin.getTime() - fechaInicio.getTime();
    const fechaFinAnterior = new Date(fechaInicio.getTime() - 1);
    const fechaInicioAnterior = new Date(fechaFinAnterior.getTime() - duracion);

    const ventasPeriodoAnterior = await prisma.venta.findMany({
      where: {
        negocioId,
        fechaVenta: {
          gte: fechaInicioAnterior,
          lte: fechaFinAnterior
        }
      }
    });

    const montoPeriodoActual = ventas.reduce((sum, v) => sum + v.monto, 0);
    const montoPeriodoAnterior = ventasPeriodoAnterior.reduce((sum, v) => sum + v.monto, 0);
    const variacion = montoPeriodoAnterior > 0 ? ((montoPeriodoActual - montoPeriodoAnterior) / montoPeriodoAnterior) * 100 : 0;

    variacionPeriodos = [{
      periodoActual: `${fechaInicio.toLocaleDateString('es-PE')} - ${fechaFin.toLocaleDateString('es-PE')}`,
      periodoAnterior: `${fechaInicioAnterior.toLocaleDateString('es-PE')} - ${fechaFinAnterior.toLocaleDateString('es-PE')}`,
      variacion
    }];
  } else {
    // Por defecto: este mes vs mes anterior
    const hoy = new Date();
    const primerDiaEsteMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const primerDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

    const ventasEsteMes = await prisma.venta.findMany({
      where: {
        negocioId,
        fechaVenta: {
          gte: primerDiaEsteMes,
          lte: hoy
        }
      }
    });

    const ventasMesAnterior = await prisma.venta.findMany({
      where: {
        negocioId,
        fechaVenta: {
          gte: primerDiaMesAnterior,
          lte: ultimoDiaMesAnterior
        }
      }
    });

    const montoEsteMes = ventasEsteMes.reduce((sum, v) => sum + v.monto, 0);
    const montoMesAnterior = ventasMesAnterior.reduce((sum, v) => sum + v.monto, 0);
    const variacion = montoMesAnterior > 0 ? ((montoEsteMes - montoMesAnterior) / montoMesAnterior) * 100 : 0;

    variacionPeriodos = [{
      periodoActual: `Este mes (${primerDiaEsteMes.toLocaleDateString('es-PE')} - ${hoy.toLocaleDateString('es-PE')})`,
      periodoAnterior: `Mes anterior (${primerDiaMesAnterior.toLocaleDateString('es-PE')} - ${ultimoDiaMesAnterior.toLocaleDateString('es-PE')})`,
      variacion
    }];
  }

  // 7. KPIs de inventario (estado actual + rotación en el periodo consultado)
  // Se incluyen productos y servicios (para el margen), pero el inventario en sí
  // solo aplica a los ítems de tipo "producto" (los servicios no manejan stock).
  const productos = await prisma.producto.findMany({ where: { negocioId } });
  const productosInventariables = productos.filter((p) => p.tipo === TipoProducto.producto);

  const valorTotalInventario = productosInventariables.reduce(
    (sum, p) => sum + (p.precioCosto != null ? p.stock * p.precioCosto : 0),
    0
  );

  const productosStockCritico = productosInventariables
    .filter((p) => p.stock <= p.stockMinimo)
    .map((p) => ({ id: p.id, nombre: p.nombre, stock: p.stock, stockMinimo: p.stockMinimo }));

  const unidadesVendidasPeriodo = itemsConVenta
    .filter((it) => it.producto.tipo === TipoProducto.producto)
    .reduce((sum, it) => sum + it.cantidad, 0);
  const stockPromedio = productosInventariables.length > 0
    ? productosInventariables.reduce((sum, p) => sum + p.stock, 0) / productosInventariables.length
    : 0;
  const rotacionInventario = stockPromedio > 0 ? unidadesVendidasPeriodo / stockPromedio : 0;

  const productoIdsConVenta = new Set(itemsConVenta.map((it) => it.productoId));
  const productosSinMovimiento = productosInventariables
    .filter((p) => !productoIdsConVenta.has(p.id))
    .map((p) => ({ id: p.id, nombre: p.nombre }));

  // 8. KPIs de clientes
  const clientes = await prisma.cliente.findMany({
    where: { negocioId },
    include: { ventas: { select: { monto: true } } }
  });

  const totalClientes = clientes.length;
  const inicioMesActual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const inicioNuevos = fechaInicio || inicioMesActual;
  // Si se eligió un rango con fecha de fin (un periodo pasado), se respeta
  // tambien ese limite superior; si no, se cuenta hasta hoy (como antes).
  const clientesNuevos = clientes.filter((c) => c.createdAt >= inicioNuevos && (!fechaFin || c.createdAt <= fechaFin)).length;
  const clientesConVentas = clientes.map((c) => ({
    nombre: c.nombre,
    compras: c.ventas.length,
    totalGastado: c.ventas.reduce((sum, v) => sum + v.monto, 0)
  }));
  const clientesRecurrentes = clientesConVentas.filter((c) => c.compras > 1).length;
  const tasaRecompra = totalClientes > 0 ? (clientesRecurrentes / totalClientes) * 100 : 0;
  const totalGastadoClientes = clientesConVentas.reduce((sum, c) => sum + c.totalGastado, 0);
  const ticketPromedioCliente = totalClientes > 0 ? totalGastadoClientes / totalClientes : 0;
  const topClientes = [...clientesConVentas].sort((a, b) => b.totalGastado - a.totalGastado).slice(0, 5);

  const canalPreferidoCount = clientes.reduce((acc, c) => {
    if (c.canalPreferido) {
      const clave = claveCanal(c.canalPreferido, c.canalPreferidoPersonalizadoId);
      acc[clave] = (acc[clave] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const clientesPorCanalPreferido = Object.entries(canalPreferidoCount).map(([canal, cantidad]) => ({ canal, cantidad }));

  // 9. Margen bruto por canal (solo entre líneas cuyo producto tiene precioCosto cargado)
  const productoCostoMap = new Map(productos.map((p) => [p.id, p.precioCosto]));
  const margenAcc = itemsConVenta.reduce((acc, it) => {
    const costoUnitario = productoCostoMap.get(it.productoId);
    if (costoUnitario == null) return acc;
    if (!acc[it.canal]) acc[it.canal] = { monto: 0, costo: 0 };
    acc[it.canal].monto += it.monto;
    acc[it.canal].costo += costoUnitario * it.cantidad;
    return acc;
  }, {} as Record<string, { monto: number; costo: number }>);
  const margenPorCanal = Object.entries(margenAcc).map(([canal, { monto, costo }]) => ({
    canal,
    monto,
    costo,
    margen: monto - costo
  }));

  return {
    participacionPorCanal,
    variacionPorCanal,
    productoTopPorCanal,
    ticketPromedioPorCanal,
    frecuenciaCompraPorCanal,
    variacionPeriodos,
    inventario: {
      valorTotalInventario,
      rotacionInventario,
      productosStockCritico,
      productosSinMovimiento
    },
    clientes: {
      totalClientes,
      clientesNuevos,
      clientesRecurrentes,
      tasaRecompra,
      ticketPromedioCliente,
      topClientes,
      clientesPorCanalPreferido
    },
    margenPorCanal
  };
}
