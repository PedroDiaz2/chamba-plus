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
