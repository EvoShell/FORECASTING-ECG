/**
 * Exportacion de tablas a CSV.
 *
 * La version anterior unia los campos con comas sin entrecomillar nada y escribia el
 * archivo sin marca de orden de bytes. Dos consecuencias, ambas visibles al abrir el
 * resultado en Excel: cualquier valor con una coma dentro rompia la fila en dos
 * columnas, y los rotulos con acentos o simbolos griegos (\u0394R\u00b2, \u03c3, \u00ab\u2713\u00bb) salian ilegibles.
 */

/** Entrecomilla segun RFC 4180: solo cuando hace falta, duplicando las comillas. */
function campo(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function aCSV(filas: Record<string, unknown>[], cabeceras?: string[]): string {
  if (filas.length === 0) return '';
  const cols = cabeceras ?? Object.keys(filas[0]);
  const lineas = [
    cols.map(campo).join(','),
    ...filas.map((f) => cols.map((c) => campo(f[c])).join(',')),
  ];
  // Fin de linea CRLF, que es lo que espera la norma y lo que Excel lee sin dudar.
  return lineas.join('\r\n');
}

/**
 * Descarga las filas como CSV.
 *
 * @param nota Linea de procedencia que se antepone como comentario. En un trabajo de
 *             tesis, un CSV suelto sin decir de donde sale no es citable.
 */
export function descargarCSV(
  filas: Record<string, unknown>[],
  nombre: string,
  nota?: string,
): boolean {
  if (filas.length === 0) return false;
  const cuerpo = aCSV(filas);
  const cabecera = nota ? `# ${nota.replace(/[\r\n]+/g, ' ')}\r\n` : '';
  // El BOM es lo que hace que Excel interprete el archivo como UTF-8.
  const blob = new Blob([`\uFEFF${cabecera}${cuerpo}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
