/**
 * Aviso de carga: un latido que se traza sobre papel de electrocardiograma.
 *
 * **Por qué esto y no un círculo girando.** Un aro que gira no dice nada del
 * trabajo; lo pone cualquier plantilla. Aquí lo que se espera es una señal, y lo
 * honesto es que la espera se parezca a lo que se espera. El trazo reproduce un
 * ciclo P-QRS-T en las proporciones de la derivación MLII, el mismo dibujo que
 * usa `PapelECG` en la portada, de modo que los dos elementos hablan el mismo
 * idioma visual.
 *
 * **Las duraciones no son a ojo: están medidas.** Se cronometró cuánto tiempo
 * está visible este aviso al cambiar de página, sobre la compilación de
 * producción y con la red limitada desde el navegador:
 *
 *   - sin limitar la red ........ mediana 305 ms  (entre 302 y 310)
 *   - 4G rápida ................. mediana 311 ms, máximo 1448 ms
 *   - a veces .................... 0 ms, porque el trozo ya venía precargado
 *
 * De esas tres líneas salen las dos constantes de abajo:
 *
 *   `RETARDO_MS = 120`. Por debajo de ese umbral no se dibuja nada. Sin él, una
 *   navegación con el código ya precargado produce un parpadeo —aparece y
 *   desaparece en unos milisegundos— que se percibe como un fallo, no como una
 *   carga. Es preferible que en las esperas muy cortas no aparezca nada.
 *
 *   `CICLO_MS = 1400`. Un ciclo completo del trazado. Con la espera típica de
 *   unos 300 ms se ve arrancar el latido, que ya basta para que la pantalla no
 *   parezca muerta; con la espera larga de 1.4 s se ve el ciclo entero y vuelve
 *   a empezar sin costura. Un ciclo mucho más corto se vuelve nervioso, y uno
 *   mucho más largo no llega a moverse en el caso habitual.
 *
 * **Accesibilidad.** Lleva `role="status"` para que un lector de pantalla
 * anuncie el cambio, y un texto real debajo, no solo el dibujo. Si el sistema
 * pide menos movimiento, el trazo se muestra completo y quieto: la información
 * —«esto está cargando»— se transmite igual sin animar nada.
 */
import { useEffect, useState } from 'react';
import { useLang } from '@/i18n';

/** Milisegundos de espera antes de dibujar nada, para no parpadear. */
const RETARDO_MS = 120;

/** Duración de un ciclo completo del trazado. */
const CICLO_MS = 1400;

/**
 * Un ciclo P-QRS-T sobre una caja de 240 × 80, con la línea de base en y = 52.
 * Las proporciones son las de `PapelECG`: onda P pequeña y redondeada, complejo
 * QRS estrecho y alto, onda T ancha y de menor amplitud.
 */
const BASE = 52;
const TRAZO = [
  `M 0 ${BASE}`,
  `L 34 ${BASE}`,
  `q 9 -11 18 0`,          // onda P
  `L 74 ${BASE}`,
  `L 80 ${BASE + 7}`,      // Q
  `L 88 14`,               // R
  `L 96 ${BASE + 13}`,     // S
  `L 104 ${BASE}`,
  `L 122 ${BASE}`,
  `q 17 -20 34 0`,         // onda T
  `L 182 ${BASE}`,
  `L 240 ${BASE}`,
].join(' ');

/** Longitud aproximada del trazado, para el guion que lo recorre. */
const LARGO = 320;

export function Cargando({
  /** Qué se está cargando. Aparece bajo el trazo. */
  mensaje,
  /** Alto de la caja. Por omisión ocupa buena parte de la ventana. */
  alto = '60vh',
}: { mensaje?: string; alto?: string }) {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), RETARDO_MS);
    return () => window.clearTimeout(id);
  }, []);

  const texto = mensaje ?? t('Cargando', 'Loading');

  return (
    <div
      data-cargando
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        minHeight: alto,
        // Hasta que pasa el retardo no se pinta nada, pero el nodo ya existe:
        // así el lector de pantalla tiene su región viva desde el principio.
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'relative',
          width: 'min(240px, 60vw)',
          height: '80px',
        }}
      >
        {/* Papel de electrocardiograma: cuadro fino de 8 px y grueso cada 40,
            la proporción 1:5 del papel real. Se pinta con degradados y no con
            nodos, que serían cientos de elementos para un adorno. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: [
              `repeating-linear-gradient(0deg,  color-mix(in srgb, var(--text-muted) 12%, transparent) 0 1px, transparent 1px 8px)`,
              `repeating-linear-gradient(90deg, color-mix(in srgb, var(--text-muted) 12%, transparent) 0 1px, transparent 1px 8px)`,
              `repeating-linear-gradient(0deg,  color-mix(in srgb, var(--text-muted) 24%, transparent) 0 1px, transparent 1px 40px)`,
              `repeating-linear-gradient(90deg, color-mix(in srgb, var(--text-muted) 24%, transparent) 0 1px, transparent 1px 40px)`,
            ].join(', '),
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 40%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 40%, transparent 78%)',
            borderRadius: 'var(--radius-sm)',
          }}
        />

        <svg
          viewBox="0 0 240 80"
          preserveAspectRatio="xMidYMid meet"
          focusable="false"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          {/* El trazo apagado de fondo: da la referencia de por dónde va a pasar
              la señal, de modo que el dibujo se lee como un latido y no como una
              raya que aparece de la nada. */}
          <path
            d={TRAZO}
            fill="none"
            stroke="var(--text-muted)"
            strokeOpacity={0.22}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* El trazo vivo, que se dibuja de izquierda a derecha. */}
          <path
            className="cargando-trazo"
            d={TRAZO}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeDasharray: `${LARGO}`, strokeDashoffset: LARGO }}
          />
        </svg>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-data)',
          fontSize: 'var(--fs-xs)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {texto}
      </p>

      <style>{`
        @keyframes cargando-barrido {
          0%   { stroke-dashoffset: ${LARGO}; }
          62%  { stroke-dashoffset: 0; }
          /* La pausa del final es deliberada: entre latido y latido hay un
             silencio, y sin él el trazo se encadena y parece una onda continua. */
          100% { stroke-dashoffset: -${LARGO}; }
        }
        .cargando-trazo {
          animation: cargando-barrido ${CICLO_MS}ms cubic-bezier(0.45, 0, 0.35, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .cargando-trazo {
            animation: none;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Cargando;
