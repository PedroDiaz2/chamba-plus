import { Prisma, CanalVenta } from '@prisma/client';

// Una venta o un cliente con canal = "otro" puede estar vinculado a un
// CanalPersonalizado especifico (por ejemplo "Rappi" o "Ferias"). Para que
// los indicadores (Dashboard, Comparacion de canales, Reportes) traten cada
// canal personalizado como su propio canal en vez de agruparlos todos bajo
// "Otro", se usa una clave compuesta "otro:<id>" en los calculos agregados.
export function claveCanal(canal: string, canalPersonalizadoId?: string | null): string {
  return canal === 'otro' && canalPersonalizadoId ? `otro:${canalPersonalizadoId}` : canal;
}

export function esClaveCanalPersonalizado(clave: string): boolean {
  return clave.startsWith('otro:');
}

export function idDesdeClaveCanal(clave: string): string | null {
  return esClaveCanalPersonalizado(clave) ? clave.slice('otro:'.length) : null;
}

// Fragmento de filtro Prisma equivalente a una clave de canal (compuesta o no),
// para reutilizar en consultas de "periodo anterior" por canal.
export function whereParaClaveCanal(clave: string): Prisma.VentaWhereInput {
  if (esClaveCanalPersonalizado(clave)) {
    return { canal: CanalVenta.otro, canalPersonalizadoId: idDesdeClaveCanal(clave) };
  }
  return { canal: clave as CanalVenta };
}

interface CanalPersonalizadoInfo {
  id: string;
  nombre: string;
}

// Construye un mapa clave-de-canal -> nombre visible, combinando las etiquetas
// fijas (que ya conoce el caller) con los canales personalizados del negocio.
export function construirMapaLabels(
  labelsFijas: Record<string, string>,
  canalesPersonalizados: CanalPersonalizadoInfo[]
): Record<string, string> {
  const mapa: Record<string, string> = { ...labelsFijas };
  for (const cp of canalesPersonalizados) {
    mapa[claveCanal('otro', cp.id)] = cp.nombre;
  }
  return mapa;
}
