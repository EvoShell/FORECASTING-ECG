import { useEffect, useMemo, useState } from 'react';

/**
 * Datos del Experimento 8: error por clase de latido (P3) y detección de evento (P4).
 *
 * Todo lo que este hook devuelve sale de un archivo servido en `public/data/`. No hay
 * ninguna cifra escrita aquí a mano: las medias, medianas y recorridos se calculan
 * sobre las filas leídas, y cada estructura declara de qué archivo procede.
 *
 * Dos decisiones deliberadas, ambas de honestidad estadística:
 *
 * 1. El p-valor de `p3_contraste.json` NO se expone. Vale 0.0, y eso no es un
 *    resultado: es desbordamiento numérico de la aproximación normal de Mann-Whitney
 *    con 316 740 latidos. El tipo `ContrasteP3` no tiene campo `p` a propósito, para
 *    que ningún componente pueda imprimirlo por descuido. El tamaño del efecto —la
 *    razón de MSE— sí se expone, que es lo que aquí significa algo.
 *
 * 2. La detección por paciente se resume por mediana y recorrido, no solo por su
 *    media. La dispersión entre pacientes es parte del resultado: hay pliegues con
 *    precisión nula y pliegues con precisión alta, y una media los tapa.
 */

export const FUENTE_CLASES = '/data/nb8/p3_error_por_clase.csv';
export const FUENTE_CONTRASTE = '/data/nb8/p3_contraste.json';
export const FUENTE_RESUMEN_P4 = '/data/nb8/p4_resumen.json';
export const FUENTE_DETECCION = '/data/nb8/p4_deteccion_por_paciente.csv';
export const FUENTE_PROGRESO = '/data/nb8/progreso.json';
export const FUENTE_SALVEDAD = '/data/nb8/salvedad_derivaciones.json';
export const FUENTE_CURVA_PR = '/data/nb8/p4_curva_precision_exhaustividad.png';
export const FUENTE_LOPO_NB5 = '/data/nb5/resultados_lopo.csv';

/** Modelo de NB5 contra el que se contrasta la reproducción del pipeline. */
export const MODELO_CONTRASTE = 'CNN_GRU_ATTN';

/**
 * Agrupación AAMI. Son etiquetas, no cifras: N es el latido normal, SVEB/VEB/F son las
 * tres clases ectópicas y Q es el latido no clasificable o de marcapasos. El contraste
 * normal-ectópico de `p3_contraste.json` excluye Q; el hook lo comprueba sumando los n
 * en lugar de darlo por supuesto (ver `contrasteCuadra`).
 */
export type GrupoAAMI = 'normal' | 'ectopico' | 'no_clasificable';

const GRUPO_POR_CLASE: Record<string, GrupoAAMI> = {
  N: 'normal',
  SVEB: 'ectopico',
  VEB: 'ectopico',
  F: 'ectopico',
  Q: 'no_clasificable',
};

export interface FilaClaseAAMI extends Record<string, unknown> {
  clase_aami: string;
  n: number;
  mse_media: number;
  mse_mediana: number;
  rmse_media: number;
  mae_media: number;
  shape_corr_media: number;
  pct: number;
  grupo: GrupoAAMI;
  /** MSE de la clase dividido por el de N. Calculado, no leído. */
  razonMseVsNormal: number;
  /** Correlación de forma de la clase menos la de N. Calculado, no leído. */
  deltaCorrVsNormal: number;
}

/** Contraste normal / ectópico. Sin campo `p`: ver la nota de cabecera. */
export interface ContrasteP3 {
  mse_normal: number;
  mse_ectopico: number;
  razon: number;
  U: number;
  n_normal: number;
  n_ectopico: number;
  /** Latidos que entran en el contraste. Es la suma de los dos n. */
  n_total: number;
  /** Clases que el CSV agrupa como ectópicas, y cuyos n suman `n_ectopico`. */
  clasesEctopicas: string[];
  /** Clases del CSV que el contraste deja fuera. */
  clasesExcluidas: string[];
  /** Latidos de las clases excluidas del contraste. */
  nExcluidos: number;
  /** Verdadero si los n del CSV reproducen los del JSON. Si es falso, hay que decirlo. */
  contrasteCuadra: boolean;
}

export interface ResumenP4 {
  auc_pr: number;
  prevalencia: number;
  ganancia: number;
  puntuacion: string;
  n_latidos: number;
  n_ectopicos: number;
  n_pacientes: number;
}

export interface FilaDeteccion extends Record<string, unknown> {
  paciente: string;
  base: string;
  umbral: number;
  n: number;
  n_ectopicos: number;
  VP: number;
  FP: number;
  FN: number;
  VN: number;
  precision: number;
  exhaustividad: number;
  especificidad: number;
  f1: number;
  ap: number;
}

/** Resumen de dispersión de una columna. Todo calculado sobre las filas leídas. */
export interface Dispersion {
  n: number;
  mediana: number;
  media: number;
  min: number;
  max: number;
  /** max − min. La amplitud entre pacientes, no una desviación. */
  recorrido: number;
  p25: number;
  p75: number;
  /** p75 − p25. */
  ric: number;
}

export interface ParPaciente extends Record<string, unknown> {
  paciente: string;
  r2NB8: number;
  r2NB5: number;
  delta: number;
  latidos: number;
  minutos: number;
}

export interface Reproduccion {
  /** Pacientes presentes en progreso.json, en orden. */
  pacientes: string[];
  /** Pliegues emparejados con el LOPO de la sexta fase. */
  n: number;
  /** Pliegues ejecutados en el cuaderno 8, según progreso.json. */
  nEjecutados: number;
  /** Media de `r2` de progreso.json sobre los pliegues emparejados. */
  r2MedioNB8: number;
  /** Media de `R2_total` de resultados_lopo.csv, modelo CNN_GRU_ATTN, mismos pacientes. */
  r2MedioNB5: number;
  /** r2MedioNB8 − r2MedioNB5. */
  delta: number;
  r2MedianaNB8: number;
  r2MinNB8: number;
  r2MaxNB8: number;
  /** Pacientes de progreso.json que no aparecen en el LOPO de la sexta fase. */
  pacientesSinContraste: string[];
  /** Pliegues emparejados, para la gráfica y la tabla. */
  pares: ParPaciente[];
  latidosTotales: number;
  minutosTotales: number;
  fuenteNB8: string;
  fuenteNB5: string;
  modeloNB5: string;
}

export interface SalvedadDerivacion {
  paciente: string;
  canales: string[];
}

export interface NB8Results {
  cargando: boolean;
  error: string | null;
  clases: FilaClaseAAMI[];
  claseNormal: FilaClaseAAMI | null;
  /** Clases ectópicas ordenadas por MSE descendente: la peor primero. */
  clasesEctopicasOrdenadas: FilaClaseAAMI[];
  contraste: ContrasteP3 | null;
  resumenP4: ResumenP4 | null;
  deteccion: FilaDeteccion[];
  /** Dispersión entre pacientes de las columnas de detección. */
  dispersion: {
    precision: Dispersion | null;
    exhaustividad: Dispersion | null;
    f1: Dispersion | null;
    especificidad: Dispersion | null;
    ap: Dispersion | null;
    umbral: Dispersion | null;
  };
  /** Bases presentes en el CSV de detección, con su número de pacientes. */
  basesDeteccion: { base: string; n: number }[];
  /**
   * Pacientes con pliegue ejecutado pero sin fila de detección. Se calcula, y hay que
   * mostrarlo: el n de la detección por paciente no es el de los pliegues.
   */
  pacientesSinDeteccion: string[];
  reproduccion: Reproduccion | null;
  salvedad: SalvedadDerivacion[];
}

// ── Carga ─────────────────────────────────────────────────────────────────────

async function texto(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const t = await r.text();
  // El servidor de desarrollo devuelve index.html ante una ruta inexistente; sin esta
  // comprobación el CSV se parsearía como basura y la tabla saldría vacía.
  if (t.trimStart().startsWith('<')) throw new Error(`${url}: se recibió HTML, no datos`);
  return t;
}

async function json<T>(url: string): Promise<T> {
  return JSON.parse(await texto(url)) as T;
}

function filas(csv: string): Record<string, string>[] {
  const [cab, ...resto] = csv.trim().split(/\r?\n/);
  const cols = cab.split(',');
  return resto.filter(Boolean).map((l) => {
    const c = l.split(',');
    return Object.fromEntries(cols.map((k, i) => [k.trim(), (c[i] ?? '').trim()]));
  });
}

const num = (v: string | number | undefined | null): number => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : NaN;
};

// ── Estadística descriptiva ───────────────────────────────────────────────────

function cuantil(ordenados: number[], q: number): number {
  if (ordenados.length === 0) return NaN;
  if (ordenados.length === 1) return ordenados[0];
  const pos = (ordenados.length - 1) * q;
  const bajo = Math.floor(pos);
  const alto = Math.ceil(pos);
  if (bajo === alto) return ordenados[bajo];
  return ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (pos - bajo);
}

function describir(valores: number[]): Dispersion | null {
  const v = valores.filter((x) => Number.isFinite(x));
  if (v.length === 0) return null;
  const ord = [...v].sort((a, b) => a - b);
  const p25 = cuantil(ord, 0.25);
  const p75 = cuantil(ord, 0.75);
  return {
    n: v.length,
    mediana: cuantil(ord, 0.5),
    media: v.reduce((s, x) => s + x, 0) / v.length,
    min: ord[0],
    max: ord[ord.length - 1],
    recorrido: ord[ord.length - 1] - ord[0],
    p25,
    p75,
    ric: p75 - p25,
  };
}

const media = (v: number[]): number =>
  v.length === 0 ? NaN : v.reduce((s, x) => s + x, 0) / v.length;

// ── Tipos de los archivos crudos ──────────────────────────────────────────────

interface ContrasteCrudo {
  mse_normal: number;
  mse_ectopico: number;
  razon: number;
  U: number;
  /**
   * Presente en el archivo y deliberadamente NO propagado. Vale 0.0 por desbordamiento
   * numérico; informarlo sería afirmar algo que el cálculo no sostiene.
   */
  p?: number;
  n_normal: number;
  n_ectopico: number;
}

interface EntradaProgreso {
  minutos: number;
  r2: number;
  latidos: number;
  cuando: string;
}

interface Crudos {
  clasesCsv: Record<string, string>[];
  contraste: ContrasteCrudo;
  resumenP4: ResumenP4;
  deteccionCsv: Record<string, string>[];
  progreso: Record<string, EntradaProgreso>;
  salvedad: SalvedadDerivacion[];
  lopoCsv: Record<string, string>[];
}

export function useNB8Results(): NB8Results {
  const [crudos, setCrudos] = useState<Crudos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [clasesCsv, contraste, resumenP4, deteccionCsv, progreso, salvedad, lopoCsv] =
          await Promise.all([
            texto(FUENTE_CLASES).then(filas),
            json<ContrasteCrudo>(FUENTE_CONTRASTE),
            json<ResumenP4>(FUENTE_RESUMEN_P4),
            texto(FUENTE_DETECCION).then(filas),
            json<Record<string, EntradaProgreso>>(FUENTE_PROGRESO),
            json<SalvedadDerivacion[]>(FUENTE_SALVEDAD),
            // El valor de contraste de la reproducción NO está en nb8/: es el LOPO de la
            // sexta fase, del que se toman solo los pacientes de progreso.json.
            texto(FUENTE_LOPO_NB5).then(filas),
          ]);
        if (!vivo) return;
        setCrudos({ clasesCsv, contraste, resumenP4, deteccionCsv, progreso, salvedad, lopoCsv });
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido');
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const clases = useMemo((): FilaClaseAAMI[] => {
    if (!crudos) return [];
    const base = crudos.clasesCsv.map((r) => ({
      clase_aami: r.clase_aami,
      n: num(r.n),
      mse_media: num(r.mse_media),
      mse_mediana: num(r.mse_mediana),
      rmse_media: num(r.rmse_media),
      mae_media: num(r.mae_media),
      shape_corr_media: num(r.shape_corr_media),
      pct: num(r.pct),
      grupo: GRUPO_POR_CLASE[r.clase_aami] ?? 'no_clasificable',
    }));
    const normal = base.find((c) => c.grupo === 'normal');
    return base.map((c) => ({
      ...c,
      razonMseVsNormal: normal ? c.mse_media / normal.mse_media : NaN,
      deltaCorrVsNormal: normal ? c.shape_corr_media - normal.shape_corr_media : NaN,
    }));
  }, [crudos]);

  const claseNormal = useMemo(
    () => clases.find((c) => c.grupo === 'normal') ?? null,
    [clases],
  );

  const clasesEctopicasOrdenadas = useMemo(
    () => clases.filter((c) => c.grupo === 'ectopico').sort((a, b) => b.mse_media - a.mse_media),
    [clases],
  );

  const contraste = useMemo((): ContrasteP3 | null => {
    if (!crudos) return null;
    const c = crudos.contraste;
    const ectopicas = clases.filter((x) => x.grupo === 'ectopico');
    const excluidas = clases.filter((x) => x.grupo === 'no_clasificable');
    const nEctopicasCsv = ectopicas.reduce((s, x) => s + x.n, 0);
    const nNormalCsv = claseNormal?.n ?? NaN;
    return {
      mse_normal: c.mse_normal,
      mse_ectopico: c.mse_ectopico,
      razon: c.razon,
      U: c.U,
      n_normal: c.n_normal,
      n_ectopico: c.n_ectopico,
      n_total: c.n_normal + c.n_ectopico,
      clasesEctopicas: ectopicas.map((x) => x.clase_aami),
      clasesExcluidas: excluidas.map((x) => x.clase_aami),
      nExcluidos: excluidas.reduce((s, x) => s + x.n, 0),
      contrasteCuadra: nEctopicasCsv === c.n_ectopico && nNormalCsv === c.n_normal,
    };
  }, [crudos, clases, claseNormal]);

  const deteccion = useMemo((): FilaDeteccion[] => {
    if (!crudos) return [];
    return crudos.deteccionCsv.map((r) => ({
      paciente: r.paciente,
      base: r.base,
      umbral: num(r.umbral),
      n: num(r.n),
      n_ectopicos: num(r.n_ectopicos),
      VP: num(r.VP),
      FP: num(r.FP),
      FN: num(r.FN),
      VN: num(r.VN),
      precision: num(r.precision),
      exhaustividad: num(r.exhaustividad),
      especificidad: num(r.especificidad),
      f1: num(r.f1),
      ap: num(r.ap),
    }));
  }, [crudos]);

  const dispersion = useMemo(
    () => ({
      precision: describir(deteccion.map((r) => r.precision)),
      exhaustividad: describir(deteccion.map((r) => r.exhaustividad)),
      f1: describir(deteccion.map((r) => r.f1)),
      especificidad: describir(deteccion.map((r) => r.especificidad)),
      ap: describir(deteccion.map((r) => r.ap)),
      umbral: describir(deteccion.map((r) => r.umbral)),
    }),
    [deteccion],
  );

  const basesDeteccion = useMemo(() => {
    const cuenta = new Map<string, number>();
    deteccion.forEach((r) => cuenta.set(r.base, (cuenta.get(r.base) ?? 0) + 1));
    return Array.from(cuenta.entries()).map(([base, n]) => ({ base, n }));
  }, [deteccion]);

  const reproduccion = useMemo((): Reproduccion | null => {
    if (!crudos) return null;
    const pacientes = Object.keys(crudos.progreso);
    if (pacientes.length === 0) return null;

    // Mitad del cuaderno 8: el R² de cada pliegue ejecutado, tal como quedó en
    // progreso.json al terminar la corrida.
    const r2NB8PorPaciente = new Map(pacientes.map((p) => [p, num(crudos.progreso[p].r2)]));

    // Mitad de contraste: el mismo modelo del documento, en el LOPO de la sexta fase,
    // restringido a estos mismos pacientes. Sin esa restricción se compararían 50
    // pliegues contra los 123 del archivo, que es otra cohorte.
    const r2NB5PorPaciente = new Map<string, number>();
    crudos.lopoCsv.forEach((r) => {
      if (r.Modelo !== MODELO_CONTRASTE) return;
      const p = String(r.paciente_test);
      if (!r2NB8PorPaciente.has(p)) return;
      r2NB5PorPaciente.set(p, num(r.R2_total));
    });

    const pares: ParPaciente[] = pacientes
      .filter((p) => r2NB5PorPaciente.has(p))
      .map((p) => {
        const r2NB8 = r2NB8PorPaciente.get(p) as number;
        const r2NB5 = r2NB5PorPaciente.get(p) as number;
        return {
          paciente: p,
          r2NB8,
          r2NB5,
          delta: r2NB8 - r2NB5,
          latidos: num(crudos.progreso[p].latidos),
          minutos: num(crudos.progreso[p].minutos),
        };
      });

    const descNB8 = describir(pacientes.map((p) => r2NB8PorPaciente.get(p) as number));
    const r2MedioNB8 = media(pares.map((x) => x.r2NB8));
    const r2MedioNB5 = media(pares.map((x) => x.r2NB5));

    return {
      pacientes,
      n: pares.length,
      nEjecutados: pacientes.length,
      r2MedioNB8,
      r2MedioNB5,
      delta: r2MedioNB8 - r2MedioNB5,
      r2MedianaNB8: descNB8?.mediana ?? NaN,
      r2MinNB8: descNB8?.min ?? NaN,
      r2MaxNB8: descNB8?.max ?? NaN,
      pacientesSinContraste: pacientes.filter((p) => !r2NB5PorPaciente.has(p)),
      pares,
      latidosTotales: pacientes.reduce((s, p) => s + num(crudos.progreso[p].latidos), 0),
      minutosTotales: pacientes.reduce((s, p) => s + num(crudos.progreso[p].minutos), 0),
      fuenteNB8: FUENTE_PROGRESO,
      fuenteNB5: FUENTE_LOPO_NB5,
      modeloNB5: MODELO_CONTRASTE,
    };
  }, [crudos]);

  const pacientesSinDeteccion = useMemo(() => {
    if (!crudos) return [];
    const conFila = new Set(deteccion.map((r) => r.paciente));
    return Object.keys(crudos.progreso).filter((p) => !conFila.has(p));
  }, [crudos, deteccion]);

  return {
    cargando: crudos === null && error === null,
    error,
    clases,
    claseNormal,
    clasesEctopicasOrdenadas,
    contraste,
    resumenP4: crudos?.resumenP4 ?? null,
    deteccion,
    dispersion,
    basesDeteccion,
    pacientesSinDeteccion,
    reproduccion,
    salvedad: crudos?.salvedad ?? [],
  };
}

export default useNB8Results;
