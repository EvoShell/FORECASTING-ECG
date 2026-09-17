/**
 * Las etiquetas de latido de un paciente: lo que el cardiólogo anotó.
 *
 * Sin esto no hay forma de decir si el sistema acertó. La página podía marcar un latido
 * como sospechoso, pero no podía contrastar esa marca contra nada, y una detección sin
 * verdad de terreno no se puede defender ante un tribunal.
 *
 * Por qué un archivo estático y no la API. Las anotaciones están en disco desde el
 * principio, y el backend las lee — y las descartaba en la misma línea. Se ha corregido,
 * pero **el servicio que la página usa es un despliegue anterior** y no devuelve los
 * símbolos. Precalcularlas a `public/data/anotaciones/` funciona con el backend que hay
 * hoy y con el que venga.
 *
 * LA ALINEACIÓN, que es la parte delicada. El backend no convierte en latido todos los
 * picos R: salta el primero y el último como latidos guarda, y descarta aquellos cuya
 * ventana (92 muestras antes del pico, 164 después) se saldría de la señal. En el caso
 * normal eso deja `beats.length === r_peaks.length - 2`, y el latido `i` corresponde al
 * pico `i + 1`. Cuando la cuenta no cuadra **no se arriesga una alineación equivocada**:
 * se declara que no hay verdad de terreno para esa señal y la página lo dice. Una
 * etiqueta desplazada es peor que ninguna etiqueta.
 */
import { useEffect, useState } from 'react';

export const DIR_ANOTACIONES = '/data/anotaciones';

export type ClaseAAMI = 'N' | 'SVEB' | 'VEB' | 'F' | 'Q';

/** Las tres clases que el experimento 8 considera ectópicas. La Q queda fuera. */
export const CLASES_ECTOPICAS: ClaseAAMI[] = ['SVEB', 'VEB', 'F'];

export const esEctopica = (c: ClaseAAMI | null): boolean =>
  c !== null && (CLASES_ECTOPICAS as string[]).includes(c);

export interface Anotaciones {
  paciente: string;
  base: string;
  nLatidos: number;
  conteo: Record<string, number>;
  pctEctopicos: number;
  /** Índice de muestra del pico R de cada latido, en el eje de 360 Hz. */
  muestras: number[];
  /** Símbolo crudo de PhysioNet. */
  simbolos: string[];
  clases: ClaseAAMI[];
}

export interface EstadoAnotaciones {
  datos: Anotaciones | null;
  cargando: boolean;
  /** Null si se cargaron bien; el motivo si no. La página lo muestra tal cual. */
  error: string | null;
}

export function useAnotaciones(paciente: string | null): EstadoAnotaciones {
  const [e, setE] = useState<EstadoAnotaciones>({ datos: null, cargando: false, error: null });

  useEffect(() => {
    if (!paciente) {
      setE({ datos: null, cargando: false, error: null });
      return;
    }
    let vivo = true;
    setE({ datos: null, cargando: true, error: null });
    (async () => {
      try {
        const url = `${DIR_ANOTACIONES}/${encodeURIComponent(paciente)}.json`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        const j = await r.json();
        // Un servidor de desarrollo devuelve index.html ante una ruta inexistente y
        // `json()` reventaria con un mensaje incomprensible; mejor comprobarlo aqui.
        if (!Array.isArray(j?.muestras)) throw new Error(`${url}: no contiene un vector de muestras`);
        if (vivo) {
          setE({
            datos: {
              paciente: j.paciente,
              base: j.base,
              nLatidos: j.n_latidos,
              conteo: j.conteo ?? {},
              pctEctopicos: j.pct_ectopicos ?? 0,
              muestras: j.muestras,
              simbolos: j.simbolos ?? [],
              clases: j.clases ?? [],
            },
            cargando: false,
            error: null,
          });
        }
      } catch (err) {
        if (vivo) {
          setE({ datos: null, cargando: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
    })();
    return () => { vivo = false; };
  }, [paciente]);

  return e;
}

/**
 * Empareja cada latido segmentado con su etiqueta.
 *
 * Devuelve un vector de la misma longitud que `nLatidos`, con la clase de cada latido o
 * `null` donde no se pudo determinar. Si la aritmética de la alineación no cuadra,
 * devuelve `null` entero: es preferible no enseñar verdad de terreno a enseñarla
 * desplazada.
 *
 * `tolerancia` en muestras a 360 Hz. 18 muestras son 50 ms: más que suficiente para
 * absorber el redondeo del reescalado de INCART (≤1 muestra) y la diferencia entre
 * truncar y redondear, y lo bastante estricto para no emparejar con el latido vecino,
 * que está a 280 muestras de media.
 */
export function alinearEtiquetas(
  anotaciones: Anotaciones | null,
  rPeaks: number[] | null,
  nLatidos: number,
  tolerancia = 18,
): { clases: (ClaseAAMI | null)[]; muestras: (number | null)[]; motivo: string | null } {
  const vacio = {
    clases: Array(nLatidos).fill(null) as (ClaseAAMI | null)[],
    muestras: Array(nLatidos).fill(null) as (number | null)[],
    motivo: null as string | null,
  };
  if (!anotaciones) return { ...vacio, motivo: 'sin anotaciones para este paciente' };
  if (!rPeaks || rPeaks.length === 0) return { ...vacio, motivo: 'el servicio no devolvió los picos R' };

  // El desplazamiento normal es 1: se descartaron el primer y el último pico.
  const desfase = rPeaks.length - nLatidos;
  if (desfase < 0 || desfase > 4) {
    return { ...vacio, motivo: `no cuadran los recuentos: ${rPeaks.length} picos y ${nLatidos} latidos` };
  }
  const inicio = desfase >= 2 ? 1 : 0;

  const clases: (ClaseAAMI | null)[] = [];
  const muestras: (number | null)[] = [];
  let emparejados = 0;
  // Las anotaciones vienen ordenadas, asi que basta un puntero que avanza.
  let k = 0;
  for (let i = 0; i < nLatidos; i++) {
    const pico = rPeaks[i + inicio];
    if (pico === undefined) { clases.push(null); muestras.push(null); continue; }
    while (k + 1 < anotaciones.muestras.length
      && Math.abs(anotaciones.muestras[k + 1] - pico) <= Math.abs(anotaciones.muestras[k] - pico)) {
      k++;
    }
    if (Math.abs(anotaciones.muestras[k] - pico) <= tolerancia) {
      clases.push(anotaciones.clases[k] ?? null);
      muestras.push(anotaciones.muestras[k]);
      emparejados++;
    } else {
      clases.push(null);
      muestras.push(null);
    }
  }

  // Si se empareja menos de la mitad, la alineacion no es de fiar aunque no haya
  // reventado: mejor declararlo que pintar etiquetas dispersas y sin sentido.
  if (emparejados < nLatidos / 2) {
    return { ...vacio, motivo: `solo se emparejaron ${emparejados} de ${nLatidos} latidos` };
  }
  return { clases, muestras, motivo: null };
}
