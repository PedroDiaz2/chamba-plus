-- CreateTable: CanalPersonalizado (canales "Otro" con nombre propio, uno o varios por negocio)
CREATE TABLE "CanalPersonalizado" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanalPersonalizado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CanalPersonalizado_negocioId_nombre_key" ON "CanalPersonalizado"("negocioId", "nombre");

-- AddForeignKey
ALTER TABLE "CanalPersonalizado" ADD CONSTRAINT "CanalPersonalizado_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: el antiguo canal "Otro" unico por negocio (otroCanalNombre/otroCanalDescripcion)
-- se convierte en su primer CanalPersonalizado, antes de quitar esas columnas de Negocio.
-- Queda activo solo si 'otro' ya estaba en el arreglo "canales" del negocio.
INSERT INTO "CanalPersonalizado" ("id", "negocioId", "nombre", "descripcion", "activo", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "otroCanalNombre",
    COALESCE("otroCanalDescripcion", ''),
    ('otro' = ANY("canales")),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Negocio"
WHERE "otroCanalNombre" IS NOT NULL AND "otroCanalNombre" <> '';

-- AlterTable: Venta y Cliente ahora pueden referenciar un CanalPersonalizado especifico
-- cuando su canal (o canal preferido) es "otro", en vez de agruparse todos bajo "Otro".
ALTER TABLE "Venta" ADD COLUMN "canalPersonalizadoId" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "canalPreferidoPersonalizadoId" TEXT;

-- Backfill: las ventas y clientes que ya usaban canal = 'otro' se vinculan al
-- (unico) CanalPersonalizado recien creado para su negocio.
UPDATE "Venta" v
SET "canalPersonalizadoId" = cp."id"
FROM "CanalPersonalizado" cp
WHERE v."canal" = 'otro' AND cp."negocioId" = v."negocioId";

UPDATE "Cliente" c
SET "canalPreferidoPersonalizadoId" = cp."id"
FROM "CanalPersonalizado" cp
WHERE c."canalPreferido" = 'otro' AND cp."negocioId" = c."negocioId";

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_canalPersonalizadoId_fkey" FOREIGN KEY ("canalPersonalizadoId") REFERENCES "CanalPersonalizado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_canalPreferidoPersonalizadoId_fkey" FOREIGN KEY ("canalPreferidoPersonalizadoId") REFERENCES "CanalPersonalizado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ya migrado el dato a CanalPersonalizado, se quitan las columnas viejas de Negocio.
ALTER TABLE "Negocio" DROP COLUMN "otroCanalNombre";
ALTER TABLE "Negocio" DROP COLUMN "otroCanalDescripcion";
