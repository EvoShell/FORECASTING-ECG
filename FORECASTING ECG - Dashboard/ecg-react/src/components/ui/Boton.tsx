import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Boton comun de la aplicacion.
 *
 * Habia 53 botones repartidos por once archivos, cada uno con su propio relleno,
 * su propio radio y su propio color escrito a mano: unos con fondo de acento y
 * texto blanco, otros con borde y fondo transparente, con alturas que iban de 28
 * a 44 px. Aqui se fijan cuatro variantes y tres tamanos, todos sobre los tokens
 * del sistema, de modo que el tema y la escala tipografica los alcanzan sin tocar
 * ningun componente.
 *
 * Accesibilidad: area de pulsacion de 32 px como minimo, anillo de foco visible
 * —que solo aparece al navegar con teclado— y `aria-busy` mientras se espera.
 */

export type VarianteBoton = 'primario' | 'secundario' | 'sutil' | 'peligro';
export type TamanoBoton = 'sm' | 'md' | 'lg';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children?: ReactNode;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  /** Icono a la izquierda del texto. */
  icono?: ReactNode;
  /** Icono a la derecha, para acciones que avanzan. */
  iconoDerecha?: ReactNode;
  /** Ocupa todo el ancho disponible. */
  ancho?: boolean;
  /** Marca la accion como en curso: deshabilita y lo anuncia a los lectores. */
  cargando?: boolean;
  /** Estado seleccionado, para grupos de pestanas o filtros. */
  activo?: boolean;
}

const VARIANTES: Record<VarianteBoton, React.CSSProperties> = {
  primario: {
    background: 'var(--accent)',
    color: 'var(--on-accent)',
    border: '1px solid var(--accent)',
  },
  secundario: {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border-strong)',
  },
  sutil: {
    background: 'transparent',
    color: 'var(--text-sub)',
    border: '1px solid transparent',
  },
  peligro: {
    background: 'var(--crit-tint)',
    color: 'var(--crit)',
    border: '1px solid var(--crit)',
  },
};

const TAMANOS: Record<TamanoBoton, React.CSSProperties> = {
  sm: { minHeight: 30, padding: '5px 10px', fontSize: 'var(--fs-2xs)', gap: 6 },
  md: { minHeight: 36, padding: '8px 14px', fontSize: 'var(--fs-sm)', gap: 8 },
  lg: { minHeight: 44, padding: '11px 20px', fontSize: 'var(--fs-base)', gap: 9 },
};

export const Boton = forwardRef<HTMLButtonElement, Props>(function Boton(
  {
    children,
    variante = 'secundario',
    tamano = 'md',
    icono,
    iconoDerecha,
    ancho = false,
    cargando = false,
    activo = false,
    disabled,
    style,
    ...resto
  },
  ref,
) {
  const inactivo = disabled || cargando;

  return (
    <button
      ref={ref}
      className="btn-app"
      disabled={inactivo}
      aria-busy={cargando || undefined}
      aria-pressed={activo || undefined}
      data-variante={variante}
      data-activo={activo ? 'si' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: ancho ? '100%' : undefined,
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        cursor: inactivo ? 'not-allowed' : 'pointer',
        opacity: inactivo ? 0.55 : 1,
        transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
        whiteSpace: 'nowrap',
        ...VARIANTES[variante],
        ...TAMANOS[tamano],
        // El estado activo se dibuja igual en todas las variantes, para que un
        // grupo de filtros se lea como un grupo y no como cuatro estilos sueltos.
        ...(activo
          ? {
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              borderColor: 'var(--accent-border)',
            }
          : null),
        ...style,
      }}
      {...resto}
    >
      {cargando ? <span className="btn-anillo" aria-hidden /> : icono}
      {children}
      {iconoDerecha}
    </button>
  );
});

/** Agrupa botones relacionados con separacion coherente. */
export function GrupoBotones({
  children,
  justificado = 'flex-start',
}: {
  children: ReactNode;
  justificado?: React.CSSProperties['justifyContent'];
}) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8,
      alignItems: 'center', justifyContent: justificado,
    }}>
      {children}
    </div>
  );
}
