/**
 * Lectura de los tokens de color en tiempo de ejecución.
 *
 * Plotly escribe los colores como atributos de presentación del SVG, y ahí `var(--x)`
 * NO se resuelve: el eje saldría sin color. Por eso todo lo que va a una configuración
 * de Plotly tiene que pasar por aquí, que devuelve el valor calculado de verdad.
 *
 * En estilos de React sí se puede usar `var(--x)` directamente: el navegador lo resuelve.
 */

let cache: Record<string, string> = {};
let temaEnCache: string | null = null;

/** Devuelve el valor calculado de un token. Ej.: tok('--border') → '#2A303A'. */
export function tok(nombre: string, respaldo = '#888888'): string {
  if (typeof document === 'undefined') return respaldo;

  // El tema cambia los valores: se invalida la caché cuando cambia.
  const tema = document.documentElement.getAttribute('data-theme') ?? 'dark';
  if (tema !== temaEnCache) {
    cache = {};
    temaEnCache = tema;
  }
  if (cache[nombre]) return cache[nombre];

  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  const valor = v || respaldo;
  cache[nombre] = valor;
  return valor;
}

/** Varios tokens de una vez, en el mismo orden. */
export function toks(...nombres: string[]): string[] {
  return nombres.map((n) => tok(n));
}

/** La paleta categórica completa, para series de datos. */
export function paletaSeries(): string[] {
  return [
    tok('--cat-1'), tok('--cat-2'), tok('--cat-3'), tok('--cat-4'),
    tok('--cat-5'), tok('--cat-6'), tok('--cat-7'), tok('--cat-8'),
  ];
}
