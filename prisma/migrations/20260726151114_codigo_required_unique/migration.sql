-- Make codigo required and unique per negocio
ALTER TABLE "Producto" ALTER COLUMN "codigo" SET NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "codigo" SET NOT NULL;

CREATE UNIQUE INDEX "Producto_negocioId_codigo_key" ON "Producto"("negocioId", "codigo");
CREATE UNIQUE INDEX "Cliente_negocioId_codigo_key" ON "Cliente"("negocioId", "codigo");
