import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';
import type { ReactNode, SVGProps } from 'react';
import { useLang } from '@/i18n';

/**
 * Sello de modelo ganador para la cabecera del Experimento 6.
 *
 * Es una medalla de roseta dibujada en SVG: canto festoneado de ondas
 * redondeadas, una banda anular donde va el texto en arco, un medallon central
 * con la estrella y el nombre del modelo, y dos cintas verdes. No es una imagen,
 * asi que escala sin perdida en cualquier pantalla y no pesa nada.
 *
 * Geometria del texto (unidades del viewBox, centro en 60,60):
 *   - banda: entre r = 30.5 y r = 41.5;
 *   - «WINNER» con la linea base en r = 31.8 y mayusculas de ~5.2 de alto, de modo
 *     que llega a r ≈ 37 y deja aire a los dos aros;
 *   - «BEST MODEL» abajo, leido de izquierda a derecha, con la base en r = 39.
 *
 * La animacion se dispara al montar, es decir, cada vez que se entra en la
 * pestaña: el sello cae como un tampon (escala y giro con muelle), una onda de
 * impacto se expande, las cintas se despliegan, salen unos destellos y un brillo
 * cruza el disco. Despues solo queda el giro muy lento del canto y un brillo cada
 * pocos segundos. Con «reducir movimiento» se dibuja quieto y completo.
 *
 * El texto va en ingles por peticion expresa, en los dos idiomas de la interfaz;
 * la etiqueta accesible si se traduce.
 */

const SOMBRA = 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))';

/** Canto festoneado: `n` ondas redondeadas entre los radios `rIn` y `rOut`. */
function feston(n: number, rIn: number, rOut: number) {
  const p = (r: number, a: number) => `${(60 + r * Math.cos(a)).toFixed(2)} ${(60 + r * Math.sin(a)).toFixed(2)}`;
  const paso = (2 * Math.PI) / n;
  const a0 = -Math.PI / 2;
  let d = `M ${p(rIn, a0)}`;
  for (let i = 0; i < n; i++) {
    const a = a0 + i * paso;
    // Dos controles por onda: la cresta queda redonda, no en punta.
    d += ` C ${p(rOut + 1.2, a + paso * 0.18)} ${p(rOut + 1.2, a + paso * 0.82)} ${p(rIn, a + paso)}`;
  }
  return d + ' Z';
}

const CANTO = feston(28, 45, 50);

// Destellos de cuatro puntas que aparecen una sola vez alrededor del sello.
const DESTELLOS = [
  { x: 8, y: 22, s: 1, d: 0.55 },
  { x: 112, y: 16, s: 0.8, d: 0.65 },
  { x: 118, y: 74, s: 0.65, d: 0.75 },
  { x: 4, y: 82, s: 0.7, d: 0.7 },
  { x: 62, y: 2, s: 0.6, d: 0.6 },
];

/** Texto grabado: una copia clara medio punto mas abajo hace de bisel. */
function Grabado({ children, ...props }: SVGProps<SVGTextElement> & { children: ReactNode }) {
  return (
    <>
      <text {...props} fill="#FFF4C8" fillOpacity={0.75} transform="translate(0 0.45)">{children}</text>
      <text {...props} fill="#4A2E02">{children}</text>
    </>
  );
}

export function SelloGanador({ tamano = 148 }: { tamano?: number }) {
  const { t } = useLang();
  const quieto = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${uid}`;

  const sello = (
    <svg
      viewBox="0 0 120 150"
      width={tamano}
      height={tamano * 1.25}
      role="img"
      aria-label={t('Sello: modelo ganador del proyecto', 'Seal: winning model of the project')}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <linearGradient id={id('oro')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF3C4" />
          <stop offset="0.35" stopColor="#F6C945" />
          <stop offset="0.7" stopColor="#D99A17" />
          <stop offset="1" stopColor="#9A6508" />
        </linearGradient>
        <linearGradient id={id('banda')} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3CF62" />
          <stop offset="0.5" stopColor="#DDA22A" />
          <stop offset="1" stopColor="#A86E09" />
        </linearGradient>
        <radialGradient id={id('centro')} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#FFF0B0" />
          <stop offset="0.55" stopColor="#F2C443" />
          <stop offset="1" stopColor="#C68A12" />
        </radialGradient>
        <linearGradient id={id('cinta')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1F8F55" />
          <stop offset="1" stopColor="#0E5A33" />
        </linearGradient>
        <linearGradient id={id('brillo')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id('disco')}>
          <circle cx="60" cy="60" r="44" />
        </clipPath>
        {/* Arco superior en sentido horario: la letra mira hacia fuera. */}
        <path id={id('arco-sup')} d="M 28.2 60 A 31.8 31.8 0 0 1 91.8 60" />
        {/* Arco inferior en sentido antihorario: se lee de izquierda a derecha. */}
        <path id={id('arco-inf')} d="M 21 60 A 39 39 0 0 0 99 60" />
      </defs>

      {/* Cintas: se despliegan hacia abajo desde detras del disco. */}
      <motion.g
        style={{ originX: 0.5, originY: 0 }}
        initial={quieto ? false : { scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.45, ease: [0.2, 0.9, 0.3, 1.2] }}
      >
        <path d="M 40 86 L 28 146 L 38 139 L 46 148 L 56 92 Z" fill={`url(#${id('cinta')})`} />
        <path d="M 80 86 L 92 146 L 82 139 L 74 148 L 64 92 Z" fill={`url(#${id('cinta')})`} />
        <path d="M 44 90 L 34 138" stroke="#4ADE80" strokeOpacity="0.5" strokeWidth="1.1" />
        <path d="M 76 90 L 86 138" stroke="#4ADE80" strokeOpacity="0.5" strokeWidth="1.1" />
      </motion.g>

      {/* Onda de impacto: un anillo que se expande cuando el sello «golpea». */}
      {!quieto && (
        <motion.circle
          cx="60"
          cy="60"
          fill="none"
          stroke="#F6C945"
          strokeWidth="2"
          initial={{ r: 46, opacity: 0 }}
          animate={{ r: [46, 72], opacity: [0.85, 0] }}
          transition={{ delay: 0.42, duration: 0.7, ease: 'easeOut' }}
        />
      )}

      {/* Canto festoneado, con giro lento y continuo. */}
      <motion.path
        d={CANTO}
        fill={`url(#${id('oro')})`}
        stroke="#8A5A06"
        strokeWidth="0.5"
        strokeLinejoin="round"
        animate={quieto ? undefined : { rotate: 360 }}
        transition={{ duration: 90, ease: 'linear', repeat: Infinity }}
      />

      {/* Cordon de perlas justo dentro del canto. */}
      <circle cx="60" cy="60" r="43.2" fill="none" stroke="#FFF1B8" strokeOpacity="0.7" strokeWidth="0.9" strokeDasharray="0.1 2.4" strokeLinecap="round" />

      {/* Banda del texto. */}
      <circle cx="60" cy="60" r="41.5" fill={`url(#${id('banda')})`} stroke="#7A4E05" strokeWidth="0.9" />
      <circle cx="60" cy="60" r="40.3" fill="none" stroke="#FFF1B8" strokeOpacity="0.55" strokeWidth="0.5" />

      {/* Medallon central. */}
      <circle cx="60" cy="60" r="30.5" fill={`url(#${id('centro')})`} stroke="#7A4E05" strokeWidth="0.9" />
      <circle cx="60" cy="60" r="28.6" fill="none" stroke="#FFF1B8" strokeOpacity="0.6" strokeWidth="0.5" />

      {/* Texto en arco, grabado. */}
      <Grabado fontFamily="var(--font-section)" fontWeight={700} fontSize={7.2} letterSpacing={3.4}>
        <textPath href={`#${id('arco-sup')}`} startOffset="50%" textAnchor="middle">WINNER</textPath>
      </Grabado>
      <Grabado fontFamily="var(--font-section)" fontWeight={700} fontSize={5.6} letterSpacing={2}>
        <textPath href={`#${id('arco-inf')}`} startOffset="50%" textAnchor="middle">BEST MODEL</textPath>
      </Grabado>

      {/* Separadores a las tres y a las nueve, entre las dos palabras. */}
      {[24.2, 95.8].map((cx) => (
        <path
          key={cx}
          d={`M ${cx} 57.6 L ${cx + 0.8} 59.2 L ${cx + 2.4} 60 L ${cx + 0.8} 60.8 L ${cx} 62.4 L ${cx - 0.8} 60.8 L ${cx - 2.4} 60 L ${cx - 0.8} 59.2 Z`}
          fill="#4A2E02"
        />
      ))}

      {/* Estrella, filete y nombre del modelo. */}
      <path
        d="M60 39.5 L62.6 45.9 L69.5 46.4 L64.2 50.8 L65.9 57.5 L60 53.8 L54.1 57.5 L55.8 50.8 L50.5 46.4 L57.4 45.9 Z"
        fill="#FFF7D6"
        stroke="#7A4E05"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path d="M 47 62.2 L 73 62.2" stroke="#7A4E05" strokeOpacity="0.6" strokeWidth="0.45" />
      <Grabado x={60} y={69.2} textAnchor="middle" fontFamily="var(--font-section)" fontWeight={700} fontSize={6.4} letterSpacing={0.8}>
        CNN-GRU
      </Grabado>
      <Grabado x={60} y={75.6} textAnchor="middle" fontFamily="var(--font-section)" fontWeight={700} fontSize={4.6} letterSpacing={2.2}>
        ATTN
      </Grabado>

      {/* Brillo que cruza el disco: una vez al llegar y luego cada pocos segundos. */}
      {!quieto && (
        <g clipPath={`url(#${id('disco')})`}>
          <g transform="rotate(20 60 60)">
            <motion.rect
              y="10"
              width="24"
              height="100"
              fill={`url(#${id('brillo')})`}
              initial={{ x: -30 }}
              animate={{ x: 150 }}
              transition={{ delay: 0.75, duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4.5 }}
            />
          </g>
        </g>
      )}

      {/* Destellos. */}
      {!quieto &&
        DESTELLOS.map((d, i) => (
          <motion.path
            key={i}
            d="M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z"
            fill="#FDE68A"
            initial={{ opacity: 0, scale: 0, x: d.x, y: d.y }}
            animate={{ opacity: [0, 1, 0], scale: [0, d.s, 0], rotate: [0, 90] }}
            transition={{ delay: d.d, duration: 0.9, ease: 'easeOut' }}
          />
        ))}
    </svg>
  );

  return (
    <motion.div
      data-sello-ganador
      className="sello-ganador"
      initial={quieto ? false : { scale: 2.1, rotate: -32, opacity: 0, filter: `blur(4px) ${SOMBRA}` }}
      animate={{ scale: 1, rotate: -6, opacity: 1, filter: `blur(0px) ${SOMBRA}` }}
      transition={{ type: 'spring', stiffness: 150, damping: 12, mass: 1.1, delay: 0.1 }}
      whileHover={quieto ? undefined : { rotate: 0, scale: 1.04 }}
      style={{
        flex: '0 0 auto',
        alignSelf: 'center',
        transformOrigin: '50% 40%',
        // Reserva el hueco desde el primer fotograma: sin salto de maquetacion.
        width: tamano,
        height: tamano * 1.25,
      }}
    >
      {sello}
    </motion.div>
  );
}
