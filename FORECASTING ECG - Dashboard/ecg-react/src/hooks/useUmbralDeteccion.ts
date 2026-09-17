/**
 * El umbral de detección de latido ectópico, y lo que se puede y no se puede decir con él.
 *
 * De dónde sale. El experimento 8 midió que el ERROR de predicción separa latidos
 * ectópicos de normales: ordenando 316 740 latidos de 50 pacientes por su error
 * cuadrático medio, el área bajo la curva de precisión-exhaustividad es 0.3808 frente a
 * una prevalencia de 0.1222, o sea 3.12 veces mejor que ordenar al azar. El umbral que
 * maximiza F1 vale 0.4762 en 41 de las 46 filas del archivo: en la práctica es un umbral
 * global sobre el MSE.
 *
 * LA SALVEDAD, que es lo importante y por eso va aquí arriba y no en una nota al pie.
 * Ese umbral se calculó sobre los residuos de CINCUENTA modelos distintos, cada uno
 * entrenado sin el paciente que evaluaba. La API sirve un único modelo entrenado con los
 * 123 pacientes, incluidos esos 50. Sus residuos sobre ellos serán sistemáticamente más
 * bajos, así que el umbral **sub-detecta**: marcará menos latidos de los que marcaría el
 * protocolo original. No es un ajuste fino, es otra distribución.
 *
 * Se usa igualmente, porque recalcularlo sin fuga de información costaría las 9.55 horas
 * de reentrenamiento que registra `progreso.json`, y porque recalcularlo CON fuga —pasando
 * el modelo final por los pacientes que ya vio— daría un número optimista y no publicable.
 * La decisión es usarlo declarando su procedencia en pantalla. Quien lea la página tiene
 * que poder saber esto sin leer el código.
 *
 * Dos límites más que la página tiene que declarar:
 *   - Solo hay evidencia de detección para 46 de los 123 pacientes seleccionables.
 *   - La ectopia supraventricular es casi invisible al residuo: su MSE medio es 1.19
 *     veces el de un latido normal, frente a 3.42 de la ventricular. Lo que este método
 *     detecta es, sobre todo, ectopia ventricular.
 */
import { useEffect, useState } from 'react';

export const FUENTE_DETECCION_P4 = '/data/nb8/p4_deteccion_por_paciente.csv';
export const FUENTE_RESUMEN_P4 = '/data/nb8/p4_resumen.json';
export const FUENTE_CLASES_P3 = '/data/nb8/p3_error_por_clase.csv';

/** Lo que el experimento 8 midió para un paciente concreto. */
export interface ReferenciaPaciente {
  paciente: string;
  base: string;
  umbral: number;
  nLatidos: number;
  nEctopicos: number;
  precision: number;
  exhaustividad: number;
  especificidad: number;
  f1: number;
  ap: number;
}

export interface UmbralDeteccion {
  /** Umbral global sobre el MSE. Es la mediana de los umbrales por pliegue. */
  umbralGlobal: number | null;
  /** Referencia de cada uno de los 46 pacientes evaluados, por identificador. */
  porPaciente: Record<string, ReferenciaPaciente>;
  /** Cifras globales del experimento: AUC-PR, prevalencia y ganancia. */
  global: { aucPr: number; prevalencia: number; ganancia: number; nLatidos: number; nPacientes: number } | null;
  /** MSE medio de cada clase AAMI, para explicar qué ve y qué no ve el residuo. */
  porClase: Record<string, { mse: number; n: number; razonVsNormal: number }>;
  cargando: boolean;
  error: string | null;
}

function filas(csv: string): Record<string, string>[] {
  const l = csv.trim().split(/\r?\n/);
  const cab = l[0].split(',').map((c) => c.trim());
  return l.slice(1).map((x) => {
    const c = x.split(',');
    return Object.fromEntries(cab.map((k, i) => [k, (c[i] ?? '').trim()]));
  });
}

const n = (x: string | undefined) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : NaN;
};

const mediana = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function useUmbralDeteccion(): UmbralDeteccion {
  const [e, setE] = useState<UmbralDeteccion>({
    umbralGlobal: null, porPaciente: {}, global: null, porClase: {}, cargando: true, error: null,
  });

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [rc, rj, rk] = await Promise.all([
          fetch(FUENTE_DETECCION_P4), fetch(FUENTE_RESUMEN_P4), fetch(FUENTE_CLASES_P3),
        ]);
        for (const [r, u] of [[rc, FUENTE_DETECCION_P4], [rj, FUENTE_RESUMEN_P4], [rk, FUENTE_CLASES_P3]] as const) {
          if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`);
        }
        const texto = await rc.text();
        if (texto.trimStart().startsWith('<')) throw new Error(`${FUENTE_DETECCION_P4}: se recibió HTML, no CSV`);
        const det = filas(texto);
        const resumen = await rj.json();
        const clasesCsv = filas(await rk.text());

        const porPaciente: Record<string, ReferenciaPaciente> = {};
        for (const f of det) {
          porPaciente[f.paciente] = {
            paciente: f.paciente,
            base: f.base,
            umbral: n(f.umbral),
            nLatidos: n(f.n),
            nEctopicos: n(f.n_ectopicos),
            precision: n(f.precision),
            exhaustividad: n(f.exhaustividad),
            especificidad: n(f.especificidad),
            f1: n(f.f1),
            ap: n(f.ap),
          };
        }

        const normal = clasesCsv.find((c) => c.clase_aami === 'N');
        const mseNormal = normal ? n(normal.mse_media) : NaN;
        const porClase: Record<string, { mse: number; n: number; razonVsNormal: number }> = {};
        for (const c of clasesCsv) {
          const m = n(c.mse_media);
          porClase[c.clase_aami] = { mse: m, n: n(c.n), razonVsNormal: m / mseNormal };
        }

        if (vivo) {
          setE({
            umbralGlobal: mediana(det.map((f) => n(f.umbral)).filter(Number.isFinite)),
            porPaciente,
            global: {
              aucPr: resumen.auc_pr,
              prevalencia: resumen.prevalencia,
              ganancia: resumen.ganancia,
              nLatidos: resumen.n_latidos,
              nPacientes: resumen.n_pacientes,
            },
            porClase,
            cargando: false,
            error: null,
          });
        }
      } catch (err) {
        if (vivo) {
          setE((v) => ({ ...v, cargando: false, error: err instanceof Error ? err.message : String(err) }));
        }
      }
    })();
    return () => { vivo = false; };
  }, []);

  return e;
}
