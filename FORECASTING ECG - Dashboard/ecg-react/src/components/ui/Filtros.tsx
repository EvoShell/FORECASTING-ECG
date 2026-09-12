/**
 * Barra de filtros del Explorador.
 *
 * Lo que habia antes: cada control iba en una celda de una rejilla `1fr 1fr 1fr`,
 * asi que un desplegable con dos opciones ocupaba media pagina; la caja de
 * busqueda no llevaba rotulo y los desplegables si, de modo que la caja quedaba a
 * la altura del rotulo y no a la del control; y el rotulo usaba una tipografia
 * distinta de la del resto de la pagina. Se veian grandes y desalineados porque
 * lo estaban.
 *
 * Lo que hace este modulo:
 *
 * - **Una sola linea base.** Todos los controles miden 32 px de alto y la barra
 *   los alinea por abajo (`align-items: flex-end`), asi que sus bordes inferiores
 *   coinciden lleve rotulo o no.
 * - **Ancho por contenido, no por rejilla.** Un desplegable de dos opciones mide
 *   lo que miden sus dos opciones. Es el mismo defecto que tenian las KPI y se
 *   corrige igual: nada de `flex-grow` repartiendo el ancho sobrante.
 * - **El rotulo, en la anatomia de `MetricStat`**: versalitas de 11 px con
 *   `letter-spacing` de 0.08em. La pagina entera rotula igual.
 * - **Una sola flecha, la nuestra.** `appearance: none` quita la del navegador,
 *   que cada sistema dibuja a su manera y siempre pegada al borde.
 *
 * Sobre usar una libreria de componentes: aqui no compensa. `react-select` y
 * companiia pesan decenas de kilobytes, traen su propio lenguaje visual —bordes
 * redondeados, sombras, animaciones— que choca con el gris cientifico de las
 * tarjetas, y sustituyen el `<select>` nativo por una lista de `<div>` que hay que
 * volver a hacer accesible a mano. Un `<select>` nativo ya se abre bien con
 * teclado, en movil despliega el selector del sistema y no pesa nada. Lo que
 * fallaba no era el elemento, era el estilo.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';

/** Alto comun de todos los controles. Lo que hace que la fila cuadre. */
const ALTO = 32;

const BASE_CONTROL: React.CSSProperties = {
  height: ALTO,
  boxSizing: 'border-box',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--fs-xs)',
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

const ROTULO: React.CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontFamily: 'var(--font-data)',
  fontSize: 'var(--fs-3xs)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

/**
 * La fila. Envuelve cuando no cabe, pero nunca estira: los controles conservan
 * su ancho natural y el hueco sobrante queda a la derecha.
 */
export function BarraFiltros({ children }: { children: ReactNode }) {
  return (
    <div
      role="group"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: '10px 12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  );
}

/** Desplegable de un solo valor, con la flecha dibujada por nosotros. */
export function Selector({
  rotulo,
  valor,
  onChange,
  opciones,
  anchoMinimo = 120,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opciones: string[];
  /** Suelo de ancho, para que un desplegable de valores cortos no quede raquitico. */
  anchoMinimo?: number;
}) {
  const id = useId();
  return (
    <div style={{ flex: 'none' }}>
      <label htmlFor={id} style={ROTULO}>
        {rotulo}
      </label>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <select
          id={id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...BASE_CONTROL,
            // `auto` deja que el navegador lo ajuste a la opcion mas larga.
            width: 'auto',
            minWidth: anchoMinimo,
            maxWidth: 280,
            padding: '0 30px 0 10px',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            cursor: 'pointer',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {opciones.map((o) => (
            <option key={o} value={o} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden
          style={{
            position: 'absolute',
            right: '9px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

/** Caja de busqueda. Lleva rotulo como los demas, para compartir linea base. */
export function Busqueda({
  rotulo,
  valor,
  onChange,
  marcador,
  ancho = 220,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  marcador: string;
  ancho?: number;
}) {
  const id = useId();
  return (
    <div style={{ flex: 'none' }}>
      <label htmlFor={id} style={ROTULO}>
        {rotulo}
      </label>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <Search
          size={14}
          aria-hidden
          style={{
            position: 'absolute',
            left: '9px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          id={id}
          type="search"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={marcador}
          style={{
            ...BASE_CONTROL,
            width: ancho,
            padding: '0 10px 0 28px',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
      </div>
    </div>
  );
}

/**
 * Recuento de filas a la derecha de la barra. Empuja con `margin-left: auto` y
 * comparte la linea base de los controles, no la de los rotulos.
 */
export function RecuentoFiltro({ children }: { children: ReactNode }) {
  return (
    <div
      aria-live="polite"
      style={{
        marginLeft: 'auto',
        height: ALTO,
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'var(--font-data)',
        fontSize: 'var(--fs-2xs)',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}
