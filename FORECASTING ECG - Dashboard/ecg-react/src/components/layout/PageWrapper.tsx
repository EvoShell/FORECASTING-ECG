import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface PageWrapperProps {
  children: ReactNode;
  accentColor?: string; // rgba gradient blob color
}

const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8,  transition: { duration: 0.18 } },
};

export const containerVariants: Variants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function PageWrapper({ children, accentColor }: PageWrapperProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <motion.div
      data-page
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        minHeight: '100vh',
        padding: isMobile ? '24px 16px' : '40px 48px',
        position: 'relative',
        /* Solo se recorta en horizontal, y con `clip`, que no crea contenedor de
           desplazamiento. Con `overflowY: hidden` el navegador pasaba el eje X a
           `auto` y la pagina entera se podia arrastrar de lado: 63 px en la portada
           por el lienzo decorativo. Las tablas anchas llevan su propio desplazamiento
           (`.tabla-scroll`), asi que aqui no se pierde nada. */
        overflowX: 'clip',
      }}
    >
      {/* Ambient glow blob */}
      {accentColor && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          // Como mucho el ancho de la pagina: con 600 px fijos asomaba por la
          // izquierda en un telefono.
          width: 'min(600px, 100%)', height: '400px',
          background: `radial-gradient(circle at 70% 20%, ${accentColor} 0%, transparent 60%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  );
}
