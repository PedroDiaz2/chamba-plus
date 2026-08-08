-- CreateEnum
CREATE TYPE "UnidadMedida" AS ENUM ('unidad', 'kilogramo', 'gramo', 'litro', 'mililitro', 'metro', 'hora', 'sesion', 'paquete', 'docena', 'otro');

-- DropForeignKey
ALTER TABLE "Venta" DROP CONSTRAINT "Venta_productoId_fkey";

-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "otroCanalDescripcion" TEXT,
ADD COLUMN     "otroCanalNombre" TEXT;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "unidad" "UnidadMedida" NOT NULL DEFAULT 'unidad';

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
