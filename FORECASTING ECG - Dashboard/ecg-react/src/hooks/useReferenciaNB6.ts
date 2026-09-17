/**
 * Las cifras de referencia del experimento 6, leídas de sus archivos.
 *
 * La página de Predicción LOPO las tenía escritas a mano en una constante: R² 0.6734,
 * IC95, los tres horizontes, Shape Corr, Forecast Score, el gap… quince números
 * copiados del CSV. Casi todos cuadraban, y ese era justamente el peligro: el día que
 * el CSV se recalcule, la página seguiría enseñando los viejos sin que nadie lo note.
 * Es la única página del tablero que copiaba en vez de leer.
 *
 * Aquí se leen y, donde hace falta, se calculan sobre las 123 filas. Cada bloque de la
 * página puede así declarar su archivo de procedencia, como hacen las demás.
 *
 * Dos decisiones que conviene conocer:
 *
 * 1. **Se exponen los dos modelos.** `base` es `CNN_GRU_ATTN` y `calibrado` es
 *    `CNN_GRU_ATTN_FT`. La tesis publica como resultado del proyecto el calibrado
 *    (0.6797), y la página venía enseñando el base (0.6734), que es peor. Ahora están
 *    los dos y la página declara cuál muestra.
 * 2. **El IC95 se calcula aquí**, con la normal sobre los 123 pliegues. La constante que
 *    había escrita, [0.6237, 0.7231], difiere del cálculo en la cuarta cifra decimal
 *    —el cálculo da [0.6235, 0.7233]—. Es un redondeo arrastrado, no un dato distinto,
 *    pero un intervalo que no se reproduce desde el archivo no es defendible.
 */
import { useEffect, useState } from 'react';

export const FUENTE_LOPO = '/data/nb5/resultados_lopo.csv';
export const FUENTE_RESUMEN = '/data/nb5/tabla_resumen.csv';

/** Resumen de un vector: media, desviación típica muestral e IC95 de la media. */
function resumir(v: number[]) {
  const n = v.length;
  if (n === 0) return { n: 0, media: NaN, std: NaN, ic95: null as [number, number] | null };
  const media = v.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { n, media, std: NaN, ic95: null };
  const std = Math.sqrt(v.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1));
  const e = 1.96 * (std / Math.sqrt(n));
  return { n, media, std, ic95: [media - e, media + e] as [number, number] };
}

export interface ModeloNB6 {
  /** Pliegues sobre los que se calcula todo lo de este modelo. */
  n: number;
  r2: number;
  r2Std: number;
  ic95: [number, number] | null;
  /** R² de t+1, t+2 y t+3, en ese orden. */
  r2PorHorizonte: [number, number, number];
  rmse: number;
  mae: number;
  shapeCorr: number;
  slopeMse: number;
  ampError: number;
  forecastScore: number;
  dtwMedio: number;
  /** R² de entrenamiento menos el de prueba. Cuanto menor, menos sobreajuste. */
  gapTrainTest: number;
  /** Cuántos pliegues superan cada umbral. Es lo que la media esconde. */
  distribucion: { ge080: number; ge060: number; ge050: number; negativos: number };
  /** R² por paciente, para poder situar al que se está viendo. */
  porPaciente: Record<string, number>;
}

export interface ReferenciaNB6 {
  base: ModeloNB6 | null;
  calibrado: ModeloNB6 | null;
  /** Media de R² por base de datos. MIT-BIH e INCART no rinden igual y hay que decirlo. */
  porBase: Record<string, { n: number; media: number }>;
  cargando: boolean;
  error: string | null;
}

function filas(csv: string): Record<string, string>[] {
  const lineas = csv.trim().split(/\r?\n/);
  const cab = lineas[0].split(',').map((c) => c.trim());
  return lineas.slice(1).map((l) => {
    const c = l.split(',');
    return Object.fromEntries(cab.map((k, i) => [k, (c[i] ?? '').trim()]));
  });
}

const num = (x: string | undefined): number | null => {
  if (x === undefined || x === '') return null;
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
};

/** Media de una columna sobre las filas de un modelo, ignorando lo que no es número. */
const columna = (f: Record<string, string>[], k: string): number[] =>
  f.map((r) => num(r[k])).filter((x): x is number => x !== null);

const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);

function construir(f: Record<string, string>[]): ModeloNB6 | null {
  if (f.length === 0) return null;
  const r2 = columna(f, 'R2_total');
  const r = resumir(r2);
  const train = columna(f, 'R2_train');
  return {
    n: r.n,
    r2: r.media,
    r2Std: r.std,
    ic95: r.ic95,
    r2PorHorizonte: [
      media(columna(f, 'R2_t1')),
      media(columna(f, 'R2_t2')),
      media(columna(f, 'R2_t3')),
    ],
    rmse: media(columna(f, 'RMSE_total')),
    mae: media(columna(f, 'MAE_total')),
    shapeCorr: media(columna(f, 'Shape_Corr')),
    slopeMse: media(columna(f, 'Slope_MSE')),
    ampError: media(columna(f, 'Amp_Error')),
    forecastScore: media(columna(f, 'Forecast_Score')),
    dtwMedio: media(columna(f, 'DTW_mean')),
    gapTrainTest: media(train) - r.media,
    distribucion: {
      ge080: r2.filter((x) => x >= 0.8).length,
      ge060: r2.filter((x) => x >= 0.6).length,
      ge050: r2.filter((x) => x >= 0.5).length,
      negativos: r2.filter((x) => x < 0).length,
    },
    porPaciente: Object.fromEntries(
      f.map((x) => [x.paciente_test, num(x.R2_total) ?? NaN]).filter(([, v]) => Number.isFinite(v as number)),
    ),
  };
}

export function useReferenciaNB6(): ReferenciaNB6 {
  const [estado, setEstado] = useState<ReferenciaNB6>({
    base: null, calibrado: null, porBase: {}, cargando: true, error: null,
  });

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(FUENTE_LOPO);
        if (!r.ok) throw new Error(`${FUENTE_LOPO}: HTTP ${r.status}`);
        const t = await r.text();
        // Un servidor de desarrollo devuelve index.html ante una ruta inexistente;
        // sin esta comprobación el CSV se parsearía como basura.
        if (t.trimStart().startsWith('<')) throw new Error(`${FUENTE_LOPO}: se recibió HTML, no CSV`);
        const f = filas(t);
        const base = f.filter((x) => x.Modelo === 'CNN_GRU_ATTN');
        const cal = f.filter((x) => x.Modelo === 'CNN_GRU_ATTN_FT');

        // El identificador de INCART empieza por I; el de MIT-BIH es numérico.
        const porBase: Record<string, { n: number; media: number }> = {};
        for (const etiqueta of ['MIT-BIH', 'INCART']) {
          const sub = base.filter((x) =>
            etiqueta === 'INCART' ? /^I/i.test(x.paciente_test) : !/^I/i.test(x.paciente_test));
          const v = columna(sub, 'R2_total');
          if (v.length) porBase[etiqueta] = { n: v.length, media: media(v) };
        }

        if (vivo) {
          setEstado({
            base: construir(base),
            calibrado: construir(cal),
            porBase,
            cargando: false,
            error: null,
          });
        }
      } catch (e) {
        if (vivo) {
          setEstado({
            base: null, calibrado: null, porBase: {}, cargando: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();
    return () => { vivo = false; };
  }, []);

  return estado;
}
