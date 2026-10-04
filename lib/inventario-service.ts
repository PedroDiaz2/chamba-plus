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
// Devuelve el mensaje de la alerta creada (o null si no correspondía), para que
// quien llama pueda mostrarlo de inmediato en pantalla además de guardarlo.
export async function generarAlertaStockSiCorresponde(tx: TxClient, params: AlertaStockParams): Promise<string | null> {
  const { negocioId, productoId, nombreProducto, stockPrevio, stockResultante, stockMinimo } = params;

  if (stockPrevio > stockMinimo && stockResultante <= stockMinimo) {
    const mensaje = `Stock bajo: "${nombreProducto}" quedó en ${stockResultante} unidades (mínimo ${stockMinimo}).`;
    await tx.alerta.create({
      data: {
        negocioId,
        tipo: TipoAlerta.alerta_stock,
        mensaje,
        metadata: { productoId, stock: stockResultante, stockMinimo }
      }
    });
    return mensaje;
  }

  return null;
}
