// Script de un solo uso: asigna códigos secuenciales (PR0001.., CL0001..) a los
// productos y clientes que ya existían antes de introducir el campo "codigo".
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const negocios = await prisma.negocio.findMany({ select: { id: true } });

  for (const negocio of negocios) {
    const productos = await prisma.producto.findMany({
      where: { negocioId: negocio.id, codigo: null },
      orderBy: { createdAt: 'asc' }
    });
    for (let i = 0; i < productos.length; i++) {
      const codigo = `PR${String(i + 1).padStart(4, '0')}`;
      await prisma.producto.update({ where: { id: productos[i].id }, data: { codigo } });
    }

    const clientes = await prisma.cliente.findMany({
      where: { negocioId: negocio.id, codigo: null },
      orderBy: { createdAt: 'asc' }
    });
    for (let i = 0; i < clientes.length; i++) {
      const codigo = `CL${String(i + 1).padStart(4, '0')}`;
      await prisma.cliente.update({ where: { id: clientes[i].id }, data: { codigo } });
    }

    console.log(`Negocio ${negocio.id}: ${productos.length} productos, ${clientes.length} clientes actualizados`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
