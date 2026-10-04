// Convierte un string "YYYY-MM-DD" (de un <input type="date">) en un Date que
// representa ese mismo día calendario sin importar la zona horaria del servidor.
// `new Date('YYYY-MM-DD')` se interpreta como medianoche UTC, lo que en zonas
// horarias negativas (ej. Perú, UTC-5) muestra el día anterior al formatear en
// hora local. Fijar la hora al mediodía evita ese corrimiento de un día.
export function parsearFechaLocal(valor: string | Date): Date {
  if (valor instanceof Date) return valor;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  if (match) {
    const [, anio, mes, dia] = match;
    return new Date(Number(anio), Number(mes) - 1, Number(dia), 12, 0, 0, 0);
  }

  return new Date(valor);
}

// Compara solo el día calendario (ignora la hora) para no marcar como "futura"
// una fecha de hoy cuando la hora actual es anterior al mediodía.
export function esFechaFutura(fecha: Date): boolean {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  return fecha >= manana;
}

// ¿El rango [inicio, fin] es exactamente un mes calendario completo? (del día 1
// al último día del mismo mes, sin importar la hora de cada fecha).
function esMesCalendarioCompleto(inicio: Date, fin: Date): boolean {
  const ultimoDiaDelMes = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
  return (
    inicio.getDate() === 1 &&
    fin.getDate() === ultimoDiaDelMes &&
    inicio.getFullYear() === fin.getFullYear() &&
    inicio.getMonth() === fin.getMonth()
  );
}

// Calcula el periodo "anterior" para comparar contra [fechaInicio, fechaFin]:
// - Si ese rango es un mes calendario completo (ej. todo setiembre), el anterior
//   es el mes calendario completo previo (todo agosto), no "los mismos 29 días
//   antes" (que con meses de distinta duración no cae en el mes correcto).
// - Si no, se usa la misma cantidad de días de por medio, inmediatamente antes,
//   sin que se traslapen (el día anterior al inicio, hacia atrás).
// Ambas fechas resultantes quedan ancladas al mediodía, igual que el resto del
// sistema (ver parsearFechaLocal), para que coincidan exactamente con como se
// guarda Venta.fechaVenta.
export function calcularPeriodoAnterior(fechaInicio: Date, fechaFin: Date): { inicio: Date; fin: Date } {
  if (esMesCalendarioCompleto(fechaInicio, fechaFin)) {
    const fin = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 0, 12, 0, 0, 0);
    const inicio = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() - 1, 1, 12, 0, 0, 0);
    return { inicio, fin };
  }

  const dias = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / 86400000) + 1;
  const fin = new Date(fechaInicio);
  fin.setDate(fin.getDate() - 1);
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - (dias - 1));
  return { inicio, fin };
}
