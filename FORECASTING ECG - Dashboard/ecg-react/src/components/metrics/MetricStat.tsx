/**
 * Tarjeta de métrica con anatomía científica.
 *
 * Sustituye a las KPI anteriores, que eran grandes, centradas, con fondo de color y
 * **sin la información que una cifra necesita para significar algo en una tesis**:
 * el tamaño de muestra, la dispersión, el intervalo de confianza y el archivo del que sale.
 *
 * Anatomía, de arriba abajo:
 *
 *   R²                                    NB6     ← etiqueta + fase
 *   0.6734                                        ← valor, cifras tabulares
 *   ± 0.2825                                      ← dispersión
 *   IC95  0.6235 – 0.7233                         ← intervalo
 *   ────────────────────────────────────
 *   n = 123 · resultados_lopo.csv                 ← muestra y procedencia
 *
 * Reglas que sigue:
 * - Alineación a la izquierda: se escanea una columna de cifras, no se contempla una a una.
 * - Cifras tabulares y decimales fijos por métrica, para que las columnas cuadren.
 * - El color NO decora: solo aparece si `estado` dice algo (bueno, atención, crítico).
 * - Sin fondo de color. El fondo es la superficie neutra; el borde es una línea de un píxel.
 */
import type { ReactNode } from 'react';

export type EstadoMetrica = 'neutro' | 'bueno' | 'atencion' | 'critico';

export interface MetricStatProps {
  /** Nombre corto de la métrica. Ej.: «R²», «RMSE», «Latencia». */
  etiqueta: ReactNode;
  /** Valor ya formateado. Ej.: «0.6734». Si es null se muestra un guion largo. */
  valor: ReactNode;
  /** Unidad, si la tiene. Ej.: «ms», «%». Se pinta más pequeña, junto al valor. */
  unidad?: string;
  /** Dispersión, sin el signo: se antepone «±». Ej.: «0.2825». */
  dispersion?: ReactNode;
  /** Intervalo de confianza al 95 %, como par de extremos ya formateados. */
  ic95?: [ReactNode, ReactNode];
  /** Tamaño de muestra. Se muestra como «n = 123». */
  n?: number;
  /** Archivo del que procede el dato. Es lo que hace verificable la cifra. */
  fuente?: string;
  /** Fase experimental a la que pertenece. Ej.: «NB6». */
  fase?: string;
  /** Valor de referencia, para contexto. Ej.: «línea base 0.14». */
  referencia?: ReactNode;
  /** Solo si el estado significa algo. Por defecto no se colorea nada. */
  estado?: EstadoMetrica;
  /** Nota breve al pie, cuando hace falta una salvedad. */
  nota?: ReactNode;
  /** Compacta aún más: para rejillas de seis o más métricas. */
  densa?: boolean;
}

const COLOR_ESTADO: Record<EstadoMetrica, string> = {
  neutro: 'var(--text)',
  bueno: 'var(--ok)',
  atencion: 'var(--warn)',
  critico: 'var(--alert)',
};

export function MetricStat({
  etiqueta,
  valor,
  unidad,
  dispersion,
  ic95,
  n,
  fuente,
  fase,
  referencia,
  estado = 'neutro',
  nota,
  densa = false,
}: MetricStatProps) {
  const hayPie = n !== undefined || fuente !== undefined;

  return (
    <div
      // Marca para poder medir las tarjetas desde fuera: sin ella no hay forma
      // fiable de comprobar que ninguna se estira a lo ancho de la pagina.
      data-metrica
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: densa ? '10px 12px' : '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: 0, // permite que la rejilla lo encoja en vez de desbordar
      }}
    >
      {/* etiqueta + fase */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-3xs)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {etiqueta}
        </span>
        {fase && (
          <span
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 'var(--fs-3xs)',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '3px',
              padding: '1px 4px',
              flex: 'none',
            }}
          >
            {fase}
          </span>
        )}
      </div>

      {/* valor */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '1px' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: densa ? 'var(--fs-md)' : 'var(--fs-lg)',
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            fontVariantNumeric: 'tabular-nums',
            color: valor === null ? 'var(--text-muted)' : COLOR_ESTADO[estado],
          }}
        >
          {valor === null ? '—' : valor}
        </span>
        {unidad && valor !== null && (
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
            {unidad}
          </span>
        )}
        {dispersion !== undefined && valor !== null && (
          <span
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-sub)',
              fontVariantNumeric: 'tabular-nums',
              marginLeft: '2px',
            }}
          >
            ± {dispersion}
          </span>
        )}
      </div>

      {/* intervalo de confianza */}
      {ic95 && (
        <div
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-2xs)',
            color: 'var(--text-sub)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          IC95 {ic95[0]} – {ic95[1]}
        </div>
      )}

      {/* referencia */}
      {referencia && (
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)' }}>
          {referencia}
        </div>
      )}

      {/* nota */}
      {nota && (
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-sub)', lineHeight: 1.4, marginTop: '3px' }}>
          {nota}
        </div>
      )}

      {/* pie: muestra y procedencia */}
      {hayPie && (
        <div
          style={{
            marginTop: '6px',
            paddingTop: '5px',
            borderTop: '1px solid var(--border)',
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-3xs)',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '6px',
            alignItems: 'baseline',
            minWidth: 0,
          }}
        >
          {n !== undefined && <span style={{ flex: 'none' }}>n = {n.toLocaleString('es')}</span>}
          {n !== undefined && fuente && <span style={{ flex: 'none', opacity: 0.5 }}>·</span>}
          {fuente && (
            <span
              title={fuente}
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {fuente.split('/').pop()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Rejilla de métricas. Encaja tantas como quepan sin que ninguna quede huérfana,
 * y no deja que la fila desborde la página.
 *
 * Usa `auto-fill` y no `auto-fit`, y la diferencia importa. Con `auto-fit` las
 * columnas vacías se colapsan y las tarjetas presentes se reparten TODO el ancho:
 * dos métricas ocupaban media pantalla cada una. Con `auto-fill` las columnas
 * vacías se conservan, así que cada tarjeta mantiene su ancho natural y la fila
 * queda alineada con las rejillas de arriba y de abajo.
 */
export function MetricGrid({
  children,
  minimo = 168,
}: {
  children: ReactNode;
  /** Ancho mínimo de cada tarjeta en píxeles. Bájalo para rejillas más densas. */
  minimo?: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minimo}px, 1fr))`,
        justifyContent: 'start',
        gap: '10px',
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}
