/**
 * Fondo de papel de electrocardiograma.
 *
 * **Por qué esto y no una retícula cualquiera.** El papel de ECG no es papel
 * milimetrado genérico: tiene una convención internacional que cualquier
 * cardiólogo reconoce de un vistazo — cuadro fino de 1 mm y cuadro grueso cada
 * 5 mm, a 25 mm/s y 10 mm/mV, de modo que el cuadro pequeño vale 0.04 s y 0.1 mV
 * y el grande 0.20 s y 0.5 mV. Reproducir esa proporción 1:5 es lo que separa
 * «una cuadrícula decorativa» de «el soporte sobre el que se lee una señal».
 * Es geometría, es del dominio del trabajo, y no necesita color para leerse.
 *
 * Sobre la retícula va un latido —P, QRS, T— trazado con las proporciones de la
 * derivación MLII: la onda P pequeña y redondeada, el complejo QRS estrecho y
 * alto, la onda T ancha y de menor amplitud. No es una línea quebrada al azar.
 *
 * Decisiones de ejecución:
 *
 * - **La retícula se pinta con degradados de CSS, no con nodos SVG.** Cuatro
 *   `repeating-linear-gradient` cuestan un elemento; dibujarla con líneas serían
 *   cientos de nodos en el árbol, por tarjeta.
 * - **Nada se mueve.** Ni animación ni valores aleatorios: en esta misma portada
 *   un texto animado llegó a provocar 636 mutaciones por segundo en reposo.
 * - **El color sale de un token** y la intensidad se apoya en `color-mix`, de
 *   modo que la pieza se adapta al tema claro y al oscuro sin declarar ni un
 *   color literal.
 * - **Se apaga antes del texto.** Una máscara diagonal la deja viva en la esquina
 *   superior y la apaga donde empiezan el nombre y el cargo.
 */

/** Cuadro fino, en píxeles. El grueso es cinco veces mayor, como en el papel real. */
const FINO = 9;
const GRUESO = FINO * 5;

const linea = (pct: number) => `color-mix(in srgb, var(--text-muted) ${pct}%, transparent)`;

/**
 * Un latido en las proporciones de la derivación MLII, sobre una caja de 200 × 90.
 * La línea de base está en y = 58; hacia arriba es amplitud positiva.
 */
const BASE = 58;

/** Un ciclo P-QRS-T dibujado a partir de `x`, sobre un ancho de 100 unidades. */
const ciclo = (x: number) => [
  `M ${x} ${BASE}`,
  `L ${x + 14} ${BASE}`,
  `q 7 -9 14 0`,                 // onda P: pequeña y redondeada
  `L ${x + 40} ${BASE}`,
  `L ${x + 44} ${BASE + 6}`,     // Q
  `L ${x + 50} 16`,              // R
  `L ${x + 56} ${BASE + 12}`,    // S
  `L ${x + 62} ${BASE}`,
  `L ${x + 72} ${BASE}`,
  `q 13 -17 26 0`,               // onda T: ancha y de menor amplitud
  `L ${x + 100} ${BASE}`,
].join(' ');

/** Dos ciclos: se lee como una tira de ritmo, no como un latido de adorno. */
const LATIDO = [ciclo(0), ciclo(100)].join(' ');

export function PapelECG({
  /** Intensidad global. Por debajo de 1 la pieza se vuelve más discreta. */
  intensidad = 1,
}: { intensidad?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        // Capa de fondo explicita. Un elemento posicionado se pinta DESPUES del
        // contenido que no lo esta, asi que sin esto la reticula y el trazo
        // cruzaban por encima de la fotografia. El contenido de la tarjeta se
        // eleva con su propio envoltorio.
        zIndex: 0,
        opacity: intensidad,
        // La retícula del papel: fino cada 9 px, grueso cada 45, igual que el
        // 1 mm / 5 mm del papel real.
        backgroundImage: [
          `repeating-linear-gradient(0deg,  ${linea(14)} 0 1px, transparent 1px ${FINO}px)`,
          `repeating-linear-gradient(90deg, ${linea(14)} 0 1px, transparent 1px ${FINO}px)`,
          `repeating-linear-gradient(0deg,  ${linea(30)} 0 1px, transparent 1px ${GRUESO}px)`,
          `repeating-linear-gradient(90deg, ${linea(30)} 0 1px, transparent 1px ${GRUESO}px)`,
        ].join(', '),
        // Viva arriba, apagada donde empieza el texto.
        maskImage:
          'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 34%, rgba(0,0,0,0.22) 55%, transparent 74%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 34%, rgba(0,0,0,0.22) 55%, transparent 74%)',
      }}
    >
      <svg
        viewBox="0 0 200 90"
        preserveAspectRatio="none"
        focusable="false"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          // En la banda libre de arriba: centrado, la foto tapa el QRS y el trazo
          // parece un accidente en vez de una tira de ritmo.
          top: '5%',
          height: '17%',
          width: '100%',
          color: 'var(--text-muted)',
          opacity: 0.5,
        }}
      >
        <path
          d={LATIDO}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export default PapelECG;
