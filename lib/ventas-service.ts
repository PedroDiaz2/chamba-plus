import { Prisma, CanalVenta, OrigenCarga, TipoMovimiento, TipoProducto } from '@prisma/client';
import { generarAlertaStockSiCorresponde } from './inventario-service';
import { siguienteCodigo } from './codigos';

type TxClient = Prisma.TransactionClient;

export interface ItemVentaInput {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface RegistrarVentaParams {
  negocioId: string;
  canal: CanalVenta;
  items: ItemVentaInput[];
  descuento?: number;
  fechaVenta: Date;
  cliente?: string | null;
  clienteId?: string | null;
  origenCarga: OrigenCarga;
}

export interface RegistrarVentaResult {
  venta: Prisma.VentaGetPayload<{ include: { items: { include: { producto: true } } } }>;
  avisoStock: boolean;
}

// Crea la venta (con una o más líneas de producto/servicio) y aplica sus efectos
// en cascada: resuelve/crea el cliente, descuenta stock de cada producto vendido
// y deja un movimiento de inventario trazable por cada línea.
export async function registrarVentaConStock(
  tx: TxClient,
  params: RegistrarVentaParams
): Promise<RegistrarVentaResult> {
  let clienteId: string | null = null;
  let nombreCliente: string | null = params.cliente?.trim() || null;

  if (params.clienteId) {
    // Cliente seleccionado explícitamente desde el formulario (ya validado por el caller)
    const clienteExistente = await tx.cliente.findUnique({ where: { id: params.clienteId } });
    clienteId = clienteExistente?.id ?? null;
    nombreCliente = clienteExistente?.nombre ?? nombreCliente;
  } else if (nombreCliente) {
    // Compatibilidad con texto libre (formulario "nuevo cliente" e importación CSV)
    const clienteExistente = await tx.cliente.findUnique({
      where: { negocioId_nombre: { negocioId: params.negocioId, nombre: nombreCliente } }
    });

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const codigosExistentes = await tx.cliente.findMany({ where: { negocioId: params.negocioId }, select: { codigo: true } });
      const nuevoCliente = await tx.cliente.create({
        data: {
          negocioId: params.negocioId,
          codigo: siguienteCodigo(codigosExistentes.map((c) => c.codigo), 'CL'),
          nombre: nombreCliente,
          canalPreferido: params.canal
        }
      });
      clienteId = nuevoCliente.id;
    }
  }

  const descuento = params.descuento ?? 0;
  const montoBruto = params.items.reduce((sum, it) => sum + it.cantidad * it.precioUnitario, 0);
  const montoTotal = Math.max(0, montoBruto - descuento);

  const venta = await tx.venta.create({
    data: {
      negocioId: params.negocioId,
      canal: params.canal,
      monto: montoTotal,
      descuento,
      fechaVenta: params.fechaVenta,
      cliente: nombreCliente,
      clienteId,
      origenCarga: params.origenCarga,
      items: {
        create: params.items.map((it) => ({
          productoId: it.productoId,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
          monto: it.cantidad * it.precioUnitario
        }))
      }
    },
    include: { items: { include: { producto: true } } }
  });

  let avisoStock = false;

  for (const item of venta.items) {
    // Los servicios no manejan inventario: no hay stock que descontar ni movimiento que registrar.
    if (item.producto.tipo === TipoProducto.servicio) continue;

    // Se usa un decremento atómico (en vez de leer-y-escribir stockPrevio/stockResultante
    // a mano) para que quede correctamente resuelto incluso si el mismo producto aparece
    // en más de una línea de esta misma venta.
    const productoActualizado = await tx.producto.update({
      where: { id: item.productoId },
      data: { stock: { decrement: item.cantidad } }
    });
    const stockResultante = productoActualizado.stock;
    const stockPrevio = stockResultante + item.cantidad;

    await tx.movimientoInventario.create({
      data: {
        productoId: item.productoId,
        negocioId: params.negocioId,
        tipo: TipoMovimiento.venta,
        cantidad: -item.cantidad,
        stockResultante,
        ventaId: venta.id
      }
    });

    await generarAlertaStockSiCorresponde(tx, {
      negocioId: params.negocioId,
      productoId: item.productoId,
      nombreProducto: item.producto.nombre,
      stockPrevio,
      stockResultante,
      stockMinimo: item.producto.stockMinimo
    });

    if (stockResultante < 0) avisoStock = true;
  }

  return { venta, avisoStock };
}
