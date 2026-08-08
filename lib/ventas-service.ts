import { Prisma, CanalVenta, OrigenCarga, TipoMovimiento, TipoProducto } from '@prisma/client';
import { generarAlertaStockSiCorresponde } from './inventario-service';
import { siguienteCodigo } from './codigos';

type TxClient = Prisma.TransactionClient;

export interface ProductoStockInfo {
  id: string;
  tipo: TipoProducto;
  stock: number;
  stockMinimo: number;
}

export interface RegistrarVentaParams {
  negocioId: string;
  canal: CanalVenta;
  productoId: string;
  cantidad: number;
  monto: number;
  fechaVenta: Date;
  cliente?: string | null;
  clienteId?: string | null;
  origenCarga: OrigenCarga;
}

export interface RegistrarVentaResult {
  venta: Prisma.VentaGetPayload<{ include: { producto: true } }>;
  stockResultante: number;
  avisoStock: boolean;
}

// Crea la venta y aplica sus efectos en cascada: resuelve/crea el cliente,
// descuenta stock del producto y deja un movimiento de inventario trazable.
export async function registrarVentaConStock(
  tx: TxClient,
  producto: ProductoStockInfo,
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

  const venta = await tx.venta.create({
    data: {
      negocioId: params.negocioId,
      canal: params.canal,
      productoId: params.productoId,
      cantidad: params.cantidad,
      monto: params.monto,
      fechaVenta: params.fechaVenta,
      cliente: nombreCliente,
      clienteId,
      origenCarga: params.origenCarga
    },
    include: { producto: true }
  });

  // Los servicios no manejan inventario: no hay stock que descontar ni movimiento que registrar.
  if (producto.tipo === TipoProducto.servicio) {
    return { venta, stockResultante: producto.stock, avisoStock: false };
  }

  const stockPrevio = producto.stock;
  const stockResultante = stockPrevio - params.cantidad;

  await tx.producto.update({
    where: { id: producto.id },
    data: { stock: stockResultante }
  });

  await tx.movimientoInventario.create({
    data: {
      productoId: producto.id,
      negocioId: params.negocioId,
      tipo: TipoMovimiento.venta,
      cantidad: -params.cantidad,
      stockResultante,
      ventaId: venta.id
    }
  });

  await generarAlertaStockSiCorresponde(tx, {
    negocioId: params.negocioId,
    productoId: producto.id,
    nombreProducto: venta.producto.nombre,
    stockPrevio,
    stockResultante,
    stockMinimo: producto.stockMinimo
  });

  return { venta, stockResultante, avisoStock: stockResultante < 0 };
}
