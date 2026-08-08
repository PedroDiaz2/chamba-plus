-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('producto', 'servicio');

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "tipo" "TipoProducto" NOT NULL DEFAULT 'producto';
