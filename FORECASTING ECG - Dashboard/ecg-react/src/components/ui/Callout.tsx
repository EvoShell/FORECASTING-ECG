/**
 * Nota al margen: una advertencia, una salvedad o un apunte de método.
 *
 * POR QUÉ SE REESCRIBIÓ. La versión anterior pintaba cada tipo con su propio fondo y su
 * propio color de título —azul, ámbar, rojo— con valores literales que además no eran
 * tokens del tema: `rgba(59, 130, 246, 0.1)`, `#d97706`, `#2563eb`. En una página de
 * resultados eso compite con las cifras: el ojo va al recuadro de color antes que al
 * número, que es justo al revés de lo que interesa.
 *
 * Ahora todas comparten la superficie neutra del resto del tablero y se distinguen por
 * **una franja de un píxel a la izquierda** y por su icono. El color queda reducido a esa
 * franja y al icono, que es donde sí informa —distingue una advertencia de un apunte— sin
 * teñir el texto.
 *
 * El título va en el color de lectura, no en el del tipo. Un título en ámbar sobre fondo
 * ámbar es más difícil de leer y no dice nada que el icono no diga ya.
 */
import type { ReactNode } from 'react';
import { Info, AlertTriangle, CheckCircle, XCircle, Lightbulb } from 'lucide-react';

type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'note';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

/**
 * Cada tipo aporta su icono y el color de su franja, y nada más. Los colores son
 * tokens del tema, así que siguen al modo claro y al oscuro sin duplicar valores.
 */
const CONFIG: Record<CalloutType, { icon: typeof Info; acento: string }> = {
  info: { icon: Info, acento: 'var(--accent-border)' },
  warning: { icon: AlertTriangle, acento: 'var(--warn)' },
  success: { icon: CheckCircle, acento: 'var(--ok)' },
  error: { icon: XCircle, acento: 'var(--alert)' },
  note: { icon: Lightbulb, acento: 'var(--border)' },
};

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const { icon: Icon, acento } = CONFIG[type];

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        gap: '10px',
        padding: '12px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${acento}`,
        borderRadius: 'var(--radius-sm)',
        marginBottom: '12px',
      }}
    >
      <Icon
        size={16}
        aria-hidden
        style={{ color: acento, flexShrink: 0, marginTop: '2px' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              fontSize: 'var(--fs-sm)',
              color: 'var(--text)',
              marginBottom: '3px',
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            fontSize: 'var(--fs-sm)',
            lineHeight: 1.65,
            color: 'var(--text-sub)',
            maxWidth: '92ch',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
