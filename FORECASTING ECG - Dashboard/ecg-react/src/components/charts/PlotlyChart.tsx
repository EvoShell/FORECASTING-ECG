/**
 * Envoltorio de Plotly.
 *
 * El problema que resuelve: `layout` y `config` se pasan como literales de objeto
 * desde las paginas, de modo que su identidad cambia en cada render. Con esas dos
 * cosas en las dependencias del efecto, `Plotly.react` se llamaba en **cada render**
 * aunque no hubiera cambiado ni un dato. En la pagina LOPO, que repinta a ritmo de
 * animacion, eso significaba redibujar todas las graficas por fotograma: era la
 * causa principal de la lentitud.
 *
 * Ahora el efecto depende de una firma calculada: `layout` y `config` se comparan por
 * su contenido (son objetos pequenos) y las trazas por referencia de sus vectores, que
 * es lo unico que puede ser grande. Ademas el componente va memorizado, para que un
 * repintado del padre no llegue siquiera hasta aqui.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
// Bundle local: sin red el CDN fallaba y ninguna grafica se dibujaba.
import Plotly from '@/lib/plotly';
import { tok } from '@/lib/tokens';

type PlotlyProps = {
  data: unknown[];
  layout?: Record<string, unknown>;
  config?: Record<string, unknown>;
  style?: React.CSSProperties;
  onError?: (error: string) => void;
  /** Texto cuando no hay nada que dibujar. Callar deja un hueco inexplicado. */
  vacio?: string;
};

/**
 * Firma de las trazas: nombre del campo mas la identidad del valor.
 *
 * No se serializan los vectores: un ECG puede traer decenas de miles de muestras y
 * recorrerlos en cada render costaria mas que el propio dibujado. Basta con que los
 * vectores conserven su referencia, que es lo que hacen cuando vienen de un `useMemo`.
 */
function firmaTrazas(data: unknown[]): unknown[] {
  return data.map((traza) => {
    if (traza === null || typeof traza !== 'object') return traza;
    const salida: unknown[] = [];
    for (const [k, v] of Object.entries(traza as Record<string, unknown>)) {
      salida.push(k, v);
    }
    return salida;
  });
}

function iguales(a: unknown[], b: unknown[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (Array.isArray(x) && Array.isArray(y)) {
      if (!iguales(x, y)) return false;
    } else if (x !== y) {
      return false;
    }
  }
  return true;
}

function PlotlyChartBase({ data, layout = {}, config = {}, style, onError, vacio }: PlotlyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const safeData = useMemo(() => (Array.isArray(data) && data.length > 0 ? data : []), [data]);

  // Firmas estables: solo cambian cuando cambia el contenido, no la identidad.
  const firmaLayout = JSON.stringify(layout);
  const firmaConfig = JSON.stringify(config);
  const firmaData = useRef<unknown[]>([]);
  const nueva = firmaTrazas(safeData);
  if (!iguales(firmaData.current, nueva)) firmaData.current = nueva;
  const marcaData = firmaData.current;

  useEffect(() => {
    const nodo = containerRef.current;
    if (!nodo) return;
    if (safeData.length === 0) {
      setIsLoading(false);
      return;
    }

    const defaultLayout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      // `var()` no resuelve en atributos del SVG: hay que dar el valor calculado.
      font: { family: 'DM Mono, monospace', color: tok('--text-muted', '#94A3B8') },
      margin: { t: 20, r: 20, b: 40, l: 60 },
      ...layout,
    };

    const defaultConfig = {
      displayModeBar: true,
      displaylogo: false,
      responsive: true,
      ...config,
    };

    // El dibujado es asincrono y el desmontaje no lo espera. Si el componente se va
    // antes de que Plotly termine, su codigo interno acaba llamando a `gd.emit` sobre
    // un div al que `purge` ya le quito sus propiedades, y salta
    // «gd.emit is not a function». No es un fallo de la grafica: es una carrera de
    // desmontaje, y no debe ensenarsele al usuario como si no se hubiera podido dibujar.
    let vivo = true;

    const fallo = (err: unknown) => {
      if (!vivo || !nodo.isConnected) return;   // se desmonto a medio dibujar
      const msg = err instanceof Error ? err.message : 'Error al dibujar la grafica';
      console.error('[PlotlyChart]', err);
      setError(msg);
      onError?.(msg);
    };

    // Un nodo desprendido del documento no se puede dibujar. Ocurre cuando un limite
    // de errores recrea el arbol: la referencia sigue viva, pero el div ya no esta.
    if (!nodo.isConnected) return;

    try {
      // `Plotly.react` devuelve una promesa: el try/catch no capturaba un fallo
      // asincrono y la grafica se quedaba en blanco sin decir por que.
      Promise.resolve(
        Plotly.react(nodo, safeData as never[], defaultLayout, defaultConfig),
      )
        .then(() => { if (vivo) setIsLoading(false); })
        .catch(fallo);
    } catch (err) {
      fallo(err);
    }

    return () => { vivo = false; };
    // `layout` y `config` entran por su firma, no por su identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcaData, firmaLayout, firmaConfig]);

  // Limpieza solo al desmontar: Plotly deja nodos y oyentes si no se purga.
  useEffect(() => {
    const nodo = containerRef.current;
    return () => {
      if (!nodo) return;
      try {
        Plotly.purge(nodo);
      } catch {
        // Si ya estaba purgado, no hay nada que hacer.
      }
    };
  }, []);

  if (error) {
    return (
      <div role="alert" style={{
        padding: '20px', textAlign: 'center', color: 'var(--crit)',
        background: 'var(--crit-tint)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--crit)', fontSize: 'var(--fs-sm)',
      }}>
        No se ha podido dibujar la grafica: {error}
      </div>
    );
  }

  if (safeData.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '200px', padding: '20px', textAlign: 'center',
        color: 'var(--text-muted)', fontSize: 'var(--fs-sm)',
        border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
        ...style,
      }}>
        {vacio ?? 'Sin datos que representar con los filtros actuales.'}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '200px', ...style }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {isLoading && (
        <div role="status" aria-live="polite" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-muted)', fontSize: 'var(--fs-sm)',
          pointerEvents: 'none',
        }}>
          Dibujando grafica...
        </div>
      )}
    </div>
  );
}

export const PlotlyChart = memo(PlotlyChartBase, (a, b) => {
  // Sin comparador, la memorizacion no sirve: el array de datos llega con identidad
  // nueva en cada render del padre aunque los vectores de dentro sean los mismos.
  // `style` tambien suele venir como literal inline: comparar por identidad
  // haria fallar la memorizacion siempre.
  if (a.vacio !== b.vacio || a.onError !== b.onError) return false;
  if (JSON.stringify(a.style ?? {}) !== JSON.stringify(b.style ?? {})) return false;
  if (JSON.stringify(a.layout ?? {}) !== JSON.stringify(b.layout ?? {})) return false;
  if (JSON.stringify(a.config ?? {}) !== JSON.stringify(b.config ?? {})) return false;
  return iguales(firmaTrazas(a.data ?? []), firmaTrazas(b.data ?? []));
});
export default PlotlyChart;
