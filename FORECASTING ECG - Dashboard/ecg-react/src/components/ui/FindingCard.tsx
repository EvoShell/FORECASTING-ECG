import type { ReactNode } from 'react';
import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';

interface FindingCardProps {
  number: number;
  title: string;
  description: string | ReactNode;
  image?: string;
  significance?: 'high' | 'medium' | 'low';
  /** Archivo del que salen las cifras del hallazgo. Sin esto, el lector no puede comprobarlas. */
  fuente?: string;
  /** Tamano de muestra al que se refieren las cifras. */
  n?: number;
  /** Cuaderno que produjo el resultado. */
  notebook?: string;
}

const SIGNIFICANCE_CONFIG = {
  high: {
    icon: CheckCircle,
    color: 'var(--accent)',
    bg: 'var(--accent-bg)',
    border: 'var(--accent-border)',
  },
  medium: {
    icon: AlertCircle,
    color: 'var(--warn)',
    bg: 'var(--warn-tint)',
    border: 'var(--warn)',
  },
  low: {
    icon: HelpCircle,
    color: 'var(--text-muted)',
    bg: 'var(--surface-2)',
    border: 'var(--border)',
  },
};

export function FindingCard({
  number,
  title,
  description,
  image,
  significance = 'medium',
  fuente,
  n,
  notebook,
}: FindingCardProps) {
  const config = SIGNIFICANCE_CONFIG[significance];
  const Icon = config.icon;

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${config.color}`,
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: config.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={16} color={config.color} />
      </div>
      {/* `minWidth: 0` es lo que permite que este hijo se encoja: sin el, un
          hijo flexible no baja de su contenido y una ruta larga desborda. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontSize: 'var(--fs-2xs)',
              fontWeight: 600,
              color: config.color,
              background: config.bg,
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            #{number}
          </span>
          <h4
            style={{
              margin: 0,
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              color: 'var(--text)',
              minWidth: 0,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </h4>
        </div>
        <div
          style={{
            fontSize: 'var(--fs-xs)',
            lineHeight: 1.55,
            color: 'var(--text-sub)',
            overflowWrap: 'anywhere',
          }}
        >
          {typeof description === 'string' ? (
            <p style={{ margin: 0 }}>{description}</p>
          ) : (
            description
          )}
        </div>
        {(fuente || n !== undefined || notebook) && (
          <p style={{
            margin: '10px 0 0', paddingTop: '8px',
            borderTop: '1px solid var(--border)',
            fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)',
            color: 'var(--text-muted)', letterSpacing: '0.02em',
            display: 'flex', flexWrap: 'wrap', gap: '4px 10px',
            // Las rutas de archivo no tienen espacios donde partir.
            overflowWrap: 'anywhere', minWidth: 0,
          }}>
            {n !== undefined && <span>n = {n}</span>}
            {notebook && <span>{notebook}</span>}
            {fuente && <span>Fuente: {fuente}</span>}
          </p>
        )}
        {image && (
          <div style={{ marginTop: '12px' }}>
            <img loading="lazy" decoding="async"
              src={image}
              alt={title}
              style={{
                maxWidth: '100%',
                borderRadius: '6px',
                border: '1px solid var(--border)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function FindingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {

  return (
    <div style={{ marginBottom: '28px' }}>
      <h3
        style={{
          fontSize: 'var(--fs-md)',
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: '16px',
          paddingBottom: '8px',
          borderBottom: `1px solid ${'var(--border)'}`,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default FindingCard;
