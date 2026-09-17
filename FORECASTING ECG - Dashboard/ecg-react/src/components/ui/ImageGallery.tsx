import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';

export interface GalleryImage {
  src: string;
  title: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  columns?: 2 | 3 | 4;
}

export function ImageGallery({ images, columns = 3 }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  };

  const goPrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? images.length - 1 : lightboxIndex - 1);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '12px',
          marginTop: '12px',
        }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            onClick={() => openLightbox(index)}
            style={{
              position: 'relative',
              cursor: 'pointer',
              borderRadius: '8px',
              overflow: 'hidden',
              border: `1px solid ${'var(--border)'}`,
              background: 'var(--surface)',
            }}
          >
            <img loading="lazy" decoding="async"
              src={image.src}
              alt={image.title}
              style={{
                width: '100%',
                height: '160px',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                opacity: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0';
              }}
            >
              <ZoomIn size={32} color="#fff" />
            </div>
            {image.title && (
              <div
                style={{
                  padding: '8px 10px',
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  borderTop: `1px solid ${'var(--border)'}`,
                }}
              >
                {image.title}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={closeLightbox}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <X size={24} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              style={{
                position: 'absolute',
                left: '20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <ChevronLeft size={28} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              style={{
                position: 'absolute',
                right: '20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <ChevronRight size={28} />
            </button>

            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <img loading="lazy" decoding="async"
                src={images[lightboxIndex].src}
                alt={images[lightboxIndex].title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
              <div
                style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '4px' }}>
                  {images[lightboxIndex].title}
                </div>
                {images[lightboxIndex].caption && (
                  <div style={{ fontSize: 'var(--fs-sm)', opacity: 0.8 }}>
                    {images[lightboxIndex].caption}
                  </div>
                )}
                <div style={{ fontSize: 'var(--fs-xs)', opacity: 0.6, marginTop: '8px' }}>
                  {lightboxIndex + 1} / {images.length}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ImageGallery;
