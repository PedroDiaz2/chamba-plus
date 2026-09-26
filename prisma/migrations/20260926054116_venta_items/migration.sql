-- CreateTable: VentaItem (una venta ahora puede tener varias líneas de producto)
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: cada Venta existente se convierte en una VentaItem de una sola línea,
-- preservando su producto/cantidad/monto actuales, antes de quitar esas columnas de Venta.
INSERT INTO "VentaItem" ("id", "ventaId", "productoId", "cantidad", "precioUnitario", "monto", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "productoId",
    "cantidad",
    CASE WHEN "cantidad" > 0 THEN "monto" / "cantidad" ELSE "monto" END,
    "monto",
    "createdAt"
FROM "Venta";

-- AlterTable: Venta ya no referencia un solo producto/cantidad directamente;
-- esa información ahora vive en VentaItem. Se agrega "descuento" (antes se
-- aplicaba solo en el cálculo del cliente y nunca se guardaba por separado).
ALTER TABLE "Venta" ADD COLUMN "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Venta" DROP CONSTRAINT "Venta_productoId_fkey";

ALTER TABLE "Venta" DROP COLUMN "productoId";

ALTER TABLE "Venta" DROP COLUMN "cantidad";
