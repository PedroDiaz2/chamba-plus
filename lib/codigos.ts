// Genera códigos identificadores secuenciales, independientes por negocio
// (ej. PR0001, PR0002... para productos; CL0001, CL0002... para clientes).
// Cada negocio tiene su propia numeración: el código de un producto del
// negocio A no tiene relación con el del negocio B, aunque coincidan en texto.
export function siguienteCodigo(codigosExistentes: string[], prefijo: string, ancho = 4): string {
  const patron = new RegExp(`^${prefijo}(\\d+)$`, 'i');
  let maxNumero = 0;

  for (const codigo of codigosExistentes) {
    const match = patron.exec(codigo);
    if (match) {
      const numero = parseInt(match[1], 10);
      if (numero > maxNumero) maxNumero = numero;
    }
  }

  const siguiente = maxNumero + 1;
  return `${prefijo}${String(siguiente).padStart(ancho, '0')}`;
}

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}
