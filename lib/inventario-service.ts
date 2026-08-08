import { Prisma, TipoAlerta } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

interface AlertaStockParams {
  negocioId: string;
  productoId: string;
  nombreProducto: string;
  stockPrevio: number;
  stockResultante: number;
  stockMinimo: number;
}

// Alerta solo al cruzar el umbral hacia abajo, no en cada movimiento subsiguiente por debajo del mínimo.
export async function generarAlertaStockSiCorresponde(tx: TxClient, params: AlertaStockParams) {
  const { negocioId, productoId, nombreProducto, stockPrevio, stockResultante, stockMinimo } = params;

  if (stockPrevio > stockMinimo && stockResultante <= stockMinimo) {
    await tx.alerta.create({
      data: {
        negocioId,
        tipo: TipoAlerta.alerta_stock,
        mensaje: `Stock bajo: "${nombreProducto}" quedó en ${stockResultante} unidades (mínimo ${stockMinimo}).`,
        metadata: { productoId, stock: stockResultante, stockMinimo }
      }
    });
  }
}
