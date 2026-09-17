/**
 * Casos concretos de detección: la onda real, la predicha, y el veredicto.
 *
 * Para qué existe. El panel de detección da un recuento —VP 16, FP 5, precisión 0.762—
 * y eso responde a «¿cuánto acierta?». No responde a **«enséñeme esa alarma»**, que es lo
 * que un tribunal pregunta a continuación: qué latido fue, cuál era su etiqueta, y por qué
 * el sistema lo marcó. Sin el caso concreto, la cifra es una afirmación sin prueba.
 *
 * Los datos los genera `scripts/generar_casos_deteccion.py` desde
 * `results/NB8/ondas_predichas/*.npz`, que guardan la onda real y la predicha de cada
 * ventana y cada horizonte junto con su clase AAMI.
 *
 * DOS COSAS QUE HAY QUE SABER ANTES DE ENSEÑAR ESTO:
 *
 * 1. **Estos casos vienen del protocolo publicable, no de la sesión en vivo.** Los `.npz`
 *    los produjo un modelo por paciente, entrenado sin ese paciente. El modelo que
 *    responde en la página vio a los 123, y por eso su exhaustividad sale más baja. Las
 *    dos cosas son ciertas; hay que decir cuál se está mirando.
 * 2. **La clase Q queda fuera de la evaluación**, como en el experimento 8. Un latido de
 *    marcapasos no es ni normal ni ectópico, y contarlo como normal dispararía los falsos
 *    positivos: en el paciente 102, más del 95 % de los latidos son Q, y sin excluirlos la
 *    precisión cae de 0.7500 a 0.0162.
 *
 * El recuento que traen estos archivos reproduce el CSV publicado en los 46 pacientes.
 */
import { useEffect, useState } from 'react';

export const DIR_CASOS = '/data/nb8/casos';

export type Veredicto = 'VP' | 'FP' | 'FN' | 'VN';

export interface CasoDeteccion {
  veredicto: Veredicto;
  /** Índice de la ventana dentro de la evaluación del paciente. */
  ventana: number;
  /** 0 es t+1, 1 es t+2, 2 es t+3. */
  horizonte: number;
  clase: string;
  /** Error cuadrático medio entre la onda real y la predicha. */
  mse: number;
  /** 256 muestras del latido real, normalizadas. */
  real: number[];
  /** 256 muestras del latido que el modelo predijo. */
  predicho: number[];
}

export interface CasosPaciente {
  paciente: string;
  base: string;
  umbral: number;
  nVentanas: number;
  nEvaluables: number;
  nExcluidosQ: number;
  recuento: { VP: number; FP: number; FN: number; VN: number };
  precision: number | null;
  exhaustividad: number | null;
  casos: CasoDeteccion[];
}

export interface FilaIndice {
  paciente: string;
  base: string;
  nCasos: number;
  umbral: number;
  precision: number | null;
  exhaustividad: number | null;
}

/** Qué significa cada veredicto, en una línea. Se muestra junto al caso. */
export const EXPLICACION: Record<Veredicto, { es: string; en: string }> = {
  VP: {
    es: 'el sistema lo marcó y el cardiólogo lo anotó como ectópico',
    en: 'the system flagged it and the cardiologist annotated it as ectopic',
  },
  FP: {
    es: 'el sistema lo marcó, pero el cardiólogo lo anotó como normal',
    en: 'the system flagged it, but the cardiologist annotated it as normal',
  },
  FN: {
    es: 'el cardiólogo lo anotó como ectópico y el sistema no lo marcó',
    en: 'the cardiologist annotated it as ectopic and the system did not flag it',
  },
  VN: {
    es: 'latido normal que el sistema no marcó; es el caso que debe dominar',
    en: 'a normal beat the system did not flag; this is the case that should dominate',
  },
};

export function useIndiceCasos() {
  const [estado, setEstado] = useState<{
    filas: FilaIndice[];
    cargando: boolean;
    error: string | null;
  }>({ filas: [], cargando: true, error: null });

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`${DIR_CASOS}/indice.json`);
        if (!r.ok) throw new Error(`${DIR_CASOS}/indice.json: HTTP ${r.status}`);
        const j = await r.json();
        if (!Array.isArray(j)) throw new Error('el índice no es una lista');
        if (vivo) {
          setEstado({
            filas: j.map((x: Record<string, unknown>) => ({
              paciente: String(x.paciente),
              base: String(x.base),
              nCasos: Number(x.n_casos),
              umbral: Number(x.umbral),
              precision: x.precision === null ? null : Number(x.precision),
              exhaustividad: x.exhaustividad === null ? null : Number(x.exhaustividad),
            })),
            cargando: false,
            error: null,
          });
        }
      } catch (e) {
        if (vivo) {
          setEstado({ filas: [], cargando: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => { vivo = false; };
  }, []);

  return estado;
}

export function useCasosDeteccion(paciente: string | null) {
  const [estado, setEstado] = useState<{
    datos: CasosPaciente | null;
    cargando: boolean;
    error: string | null;
  }>({ datos: null, cargando: false, error: null });

  useEffect(() => {
    if (!paciente) {
      setEstado({ datos: null, cargando: false, error: null });
      return;
    }
    let vivo = true;
    setEstado({ datos: null, cargando: true, error: null });
    (async () => {
      try {
        const url = `${DIR_CASOS}/${encodeURIComponent(paciente)}.json`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        const j = await r.json();
        if (!Array.isArray(j?.casos)) throw new Error(`${url}: no contiene casos`);
        if (vivo) {
          setEstado({
            datos: {
              paciente: j.paciente,
              base: j.base,
              umbral: j.umbral,
              nVentanas: j.n_ventanas,
              nEvaluables: j.n_evaluables,
              nExcluidosQ: j.n_excluidos_Q,
              recuento: j.recuento,
              precision: j.precision,
              exhaustividad: j.exhaustividad,
              casos: j.casos,
            },
            cargando: false,
            error: null,
          });
        }
      } catch (e) {
        if (vivo) {
          setEstado({ datos: null, cargando: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => { vivo = false; };
  }, [paciente]);

  return estado;
}
