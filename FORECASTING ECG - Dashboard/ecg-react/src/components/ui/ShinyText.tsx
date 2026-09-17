/**
 * Texto con un brillo que lo recorre.
 *
 * POR QUÉ SE REESCRIBIÓ. La versión anterior animaba con JavaScript: un
 * `useAnimationFrame` de framer-motion que calculaba la posición del degradado en cada
 * fotograma y la escribía en el atributo `style` del elemento. Medido en la portada, con
 * sus seis instancias, eso salían **636 mutaciones del árbol del documento cada cinco
 * segundos** —unas 127 por segundo— con la página en reposo y sin que el usuario hiciera
 * nada. Cada una obliga al navegador a recalcular estilo y a volver a pintar, y mantiene el
 * hilo principal ocupado indefinidamente.
 *
 * La misma animación en CSS la resuelve el motor de estilo sin tocar el árbol: **cero
 * mutaciones**. El aspecto es idéntico.
 *
 * De paso se gana accesibilidad: `prefers-reduced-motion` detiene el brillo, cosa que la
 * versión con JavaScript no respetaba. Quien tenga configurado que el sistema reduzca el
 * movimiento —por vértigo o por migraña— ve el texto quieto.
 *
 * Los `@keyframes` viven en `styles/globals.css` para que no se declaren una vez por
 * instancia.
 */
import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  /** Segundos que tarda el brillo en recorrer el texto. */
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  /** Inclinación del degradado, en grados. */
  spread?: number;
  /** Va y vuelve en lugar de reaparecer por el mismo lado. */
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  /** Segundos de espera antes de empezar. */
  delay?: number;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 4,
  className = '',
  color = '#b5b5b5',
  shineColor = '#ffffff',
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
  delay = 0,
}) => {
  const estiloBase: React.CSSProperties = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  // Sin animación no hace falta ni la clase ni los keyframes: queda el degradado fijo,
  // que es exactamente lo que se veía antes cuando `disabled` estaba activo.
  if (disabled) {
    return (
      <span className={`inline ${className}`} style={estiloBase}>
        {text}
      </span>
    );
  }

  return (
    <span
      className={`inline brillo-texto ${pauseOnHover ? 'brillo-pausa-hover' : ''} ${className}`}
      style={{
        ...estiloBase,
        animationDuration: `${speed}s`,
        animationDelay: `${delay}s`,
        animationDirection: yoyo
          ? direction === 'left' ? 'alternate' : 'alternate-reverse'
          : direction === 'left' ? 'normal' : 'reverse',
      }}
    >
      {text}
    </span>
  );
};

export default ShinyText;
