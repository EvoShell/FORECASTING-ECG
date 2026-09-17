/**
 * Páginas de error, con el mismo lenguaje visual que el resto del tablero.
 *
 * **La idea.** En un trabajo sobre predicción de señal, el estado de error tiene
 * una representación natural: la señal. Cada variante dibuja lo que de verdad le
 * pasa al sistema, y el dibujo explica el error sin necesidad de leerlo.
 *
 *   `no-encontrada`  el trazo se interrumpe y no continúa. No hay nada que
 *                    mostrar en esa ruta: la derivación no existe.
 *   `fallo`          el trazo se llena de artefacto. La señal está ahí pero
 *                    llega corrompida, que es exactamente lo que ocurre cuando
 *                    se interrumpe el dibujado de una vista.
 *   `sin-conexion`   el trazo queda plano y sin variación: no entra señal.
 *
 * **Una decisión deliberada sobre el dibujo.** Ninguna variante representa una
 * línea isoeléctrica presentada como tal. Es tentador —es el icono universal de
 * «esto se murió»— y además es el gesto más fácil, pero este tablero se defiende
 * ante un tribunal que puede incluir criterio clínico, y una asistolia usada
 * como chiste de página no encontrada es una broma que allí no tiene gracia. La
 * variante `sin-conexion` sí muestra una recta, pero acompañada de un rótulo que
 * dice lo que es: ausencia de entrada, no un evento clínico.
 *
 * **Lo que estas páginas no hacen.** No muestran trazas de pila ni códigos
 * internos. Delante de un tribunal, una pila de llamadas no informa a nadie y
 * transmite descontrol. El detalle técnico queda en la consola y, en desarrollo,
 * en el archivo de registro.
 */
import type { ReactNode } from 'react';
import { useLang } from '@/i18n';

export type VarianteError = 'no-encontrada' | 'fallo' | 'sin-conexion';

/** Línea de base de los trazados, sobre una caja de 260 × 86. */
const BASE = 56;

/** Un ciclo P-QRS-T que empieza en `x`, sobre 104 unidades de ancho. */
const ciclo = (x: number) => [
  `M ${x} ${BASE}`,
  `L ${x + 16} ${BASE}`,
  `q 8 -10 16 0`,
  `L ${x + 44} ${BASE}`,
  `L ${x + 50} ${BASE + 7}`,
  `L ${x + 57} 18`,
  `L ${x + 64} ${BASE + 12}`,
  `L ${x + 71} ${BASE}`,
  `L ${x + 84} ${BASE}`,
  `q 14 -18 28 0`,
  `L ${x + 104} ${BASE}`,
].join(' ');

/** Ruido de amplitud creciente, para la variante de fallo. */
const artefacto = (x0: number, ancho: number) => {
  const puntos: string[] = [`M ${x0} ${BASE}`];
  // Valores fijos, no aleatorios: una animación que cambia en cada dibujado
  // obliga a React a reconciliar sin motivo, y en esta misma portada un texto
  // animado llegó a provocar centenares de mutaciones por segundo en reposo.
  const desvios = [-6, 11, -14, 7, -19, 16, -9, 21, -13, 8, -17, 12, -5, 15, -10];
  const paso = ancho / desvios.length;
  desvios.forEach((d, i) => puntos.push(`L ${Math.round(x0 + paso * (i + 1))} ${BASE + d}`));
  return puntos.join(' ');
};

const TRAZOS: Record<VarianteError, { fondo: string; vivo: string; corte?: number }> = {
  // Un ciclo completo, y después nada: la señal se interrumpe a la mitad.
  'no-encontrada': {
    fondo: `${ciclo(0)} ${ciclo(104)} M 208 ${BASE} L 260 ${BASE}`,
    vivo: ciclo(0),
    corte: 104,
  },
  // Un ciclo limpio y luego artefacto: llega señal, pero corrompida.
  fallo: {
    fondo: `${ciclo(0)} ${artefacto(104, 156)}`,
    vivo: artefacto(104, 156),
  },
  // Sin entrada: recta, y el rótulo aclara que eso es lo que significa.
  'sin-conexion': {
    fondo: `M 0 ${BASE} L 260 ${BASE}`,
    vivo: `M 0 ${BASE} L 260 ${BASE}`,
  },
};

function Trazo({ variante }: { variante: VarianteError }) {
  const { fondo, vivo, corte } = TRAZOS[variante];
  const acento = variante === 'fallo' ? 'var(--warn)' : 'var(--text-muted)';

  return (
    <div
      aria-hidden
      style={{ position: 'relative', width: 'min(260px, 70vw)', height: '86px' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            `repeating-linear-gradient(0deg,  color-mix(in srgb, var(--text-muted) 11%, transparent) 0 1px, transparent 1px 8px)`,
            `repeating-linear-gradient(90deg, color-mix(in srgb, var(--text-muted) 11%, transparent) 0 1px, transparent 1px 8px)`,
            `repeating-linear-gradient(0deg,  color-mix(in srgb, var(--text-muted) 22%, transparent) 0 1px, transparent 1px 40px)`,
            `repeating-linear-gradient(90deg, color-mix(in srgb, var(--text-muted) 22%, transparent) 0 1px, transparent 1px 40px)`,
          ].join(', '),
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 42%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 42%, transparent 80%)',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      <svg
        viewBox="0 0 260 86"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <path
          d={fondo}
          fill="none"
          stroke="var(--text-muted)"
          strokeOpacity={0.2}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={vivo}
          fill="none"
          stroke={acento}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* El punto donde la señal se corta, en la variante de ruta inexistente. */}
        {corte !== undefined && (
          <circle
            cx={corte}
            cy={BASE}
            r={2.6}
            fill="var(--bg)"
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

export function PaginaDeError({
  variante,
  /** Código o rótulo corto, en versalitas sobre el título. */
  codigo,
  titulo,
  /** Explicación en una o dos frases. Admite marcado para resaltar una ruta. */
  descripcion,
  /** Botones de salida. Siempre debe haber al menos uno. */
  acciones,
  /** Nota al pie, para lo que solo interesa a quien desarrolla. */
  pie,
}: {
  variante: VarianteError;
  codigo: string;
  titulo: string;
  descripcion: ReactNode;
  acciones?: ReactNode;
  pie?: ReactNode;
}) {
  const { t } = useLang();

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '64vh',
        gap: '16px',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <Trazo variante={variante} />

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-data)',
          fontSize: 'var(--fs-xs)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: variante === 'fallo' ? 'var(--warn)' : 'var(--text-muted)',
        }}
      >
        {codigo}
      </p>

      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-lg)',
          color: 'var(--text)',
        }}
      >
        {titulo}
      </h1>

      <div style={{ color: 'var(--text-sub)', maxWidth: '54ch', lineHeight: 1.65 }}>
        {descripcion}
      </div>

      {acciones && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
          {acciones}
        </div>
      )}

      <p
        style={{
          margin: '8px 0 0',
          fontFamily: 'var(--font-data)',
          fontSize: 'var(--fs-3xs)',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}
      >
        {t('ECG FORECASTING · UNIVERSIDAD CESMAG', 'ECG FORECASTING · UNIVERSIDAD CESMAG')}
      </p>

      {pie}
    </div>
  );
}

export default PaginaDeError;
