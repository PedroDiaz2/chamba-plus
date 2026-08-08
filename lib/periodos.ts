export type Periodo = 'mes' | 'trimestre' | 'anio';

export interface Bucket {
  label: string;
  inicio: Date;
  fin: Date;
}

// Genera los buckets de tiempo (ordenados del más antiguo al más reciente) usados
// para las series temporales de comparación de canales y tendencias de producto.
export function construirBuckets(periodo: Periodo, ahora: Date = new Date()): Bucket[] {
  if (periodo === 'mes') {
    const buckets: Bucket[] = [];
    for (let i = 3; i >= 0; i--) {
      const fin = new Date(ahora.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const inicio = new Date(fin.getTime() - 7 * 24 * 60 * 60 * 1000);
      buckets.push({ label: `Semana ${4 - i}`, inicio, fin });
    }
    return buckets;
  }

  const meses = periodo === 'trimestre' ? 3 : 12;
  const buckets: Bucket[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 1);
    buckets.push({ label: inicio.toLocaleDateString('es-PE', { month: 'short' }), inicio, fin });
  }
  return buckets;
}

// Genera buckets para un rango de fechas arbitrario elegido por el usuario,
// eligiendo automáticamente la granularidad (día, semana o mes) según su duración.
export function construirBucketsRango(fechaInicio: Date, fechaFin: Date): Bucket[] {
  const inicio = new Date(fechaInicio);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(23, 59, 59, 999);

  const diasTotales = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)));
  const buckets: Bucket[] = [];

  if (diasTotales <= 31) {
    for (let cursor = new Date(inicio); cursor <= fin; cursor.setDate(cursor.getDate() + 1)) {
      const diaInicio = new Date(cursor);
      const diaFin = new Date(cursor);
      diaFin.setDate(diaFin.getDate() + 1);
      buckets.push({ label: diaInicio.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }), inicio: diaInicio, fin: diaFin });
    }
  } else if (diasTotales <= 180) {
    for (let cursor = new Date(inicio); cursor <= fin; cursor.setDate(cursor.getDate() + 7)) {
      const semanaInicio = new Date(cursor);
      const semanaFin = new Date(cursor);
      semanaFin.setDate(semanaFin.getDate() + 7);
      buckets.push({
        label: `${semanaInicio.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}`,
        inicio: semanaInicio,
        fin: semanaFin
      });
    }
  } else {
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    while (cursor <= fin) {
      const mesInicio = new Date(cursor);
      const mesFin = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      buckets.push({ label: mesInicio.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }), inicio: mesInicio, fin: mesFin });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return buckets;
}
