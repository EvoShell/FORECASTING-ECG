/**
 * Experimento 7 — Busqueda sistematica de hiperparametros.
 *
 * Todo lo que este hook expone sale de un archivo de `public/data/`. No hay ni una
 * cifra escrita a mano: las medias, las desviaciones, los valores p y las
 * configuraciones se leen tal cual, y lo unico que se calcula aqui son diferencias
 * y conteos sobre esos mismos vectores —operaciones que el lector puede reproducir
 * con el archivo delante—. Cada campo derivado dice de donde sale.
 *
 * Archivos que se leen:
 *   /data/nb7/hp_dl_resumen.json                     resumen de las dos busquedas de red
 *   /data/nb7/hp_dl_CNN_GRU_ATTN.csv                 las 20 configuraciones evaluadas
 *   /data/nb7/hp_dl_GRU.csv                          idem, para el GRU
 *   /data/nb7/hp_dl_sensibilidad_CNN_GRU_ATTN.csv    efecto marginal de cada hiperparametro
 *   /data/nb7/hp_dl_sensibilidad_GRU.csv             idem, para el GRU
 *   /data/nb7/hp_resumen.json                        busqueda sobre RF, DT y MLP
 *   /data/nb7/hp_comparacion_final.csv               detalle por paciente de RF, DT y MLP
 *   /data/nb7/p2_ectopicos_vs_r2.csv                 ectopicos y R2 de la cohorte completa
 *   /data/nb5/resultados_lopo.csv                    epocas del protocolo definitivo
 */
import { useEffect, useState } from 'react';
import { parseCSV } from '@/hooks/useCSV';

/* ─────────────────────────── rutas, en un solo sitio ─────────────────────── */

export const FUENTES_NB7HP = {
  dlResumen: '/data/nb7/hp_dl_resumen.json',
  dlConfigs: {
    CNN_GRU_ATTN: '/data/nb7/hp_dl_CNN_GRU_ATTN.csv',
    GRU: '/data/nb7/hp_dl_GRU.csv',
  },
  dlSensibilidad: {
    CNN_GRU_ATTN: '/data/nb7/hp_dl_sensibilidad_CNN_GRU_ATTN.csv',
    GRU: '/data/nb7/hp_dl_sensibilidad_GRU.csv',
  },
  tradResumen: '/data/nb7/hp_resumen.json',
  tradPorPaciente: '/data/nb7/hp_comparacion_final.csv',
  ectopicos: '/data/nb7/p2_ectopicos_vs_r2.csv',
  lopo: '/data/nb5/resultados_lopo.csv',
} as const;

/* ───────────────────────────────── tipos ─────────────────────────────────── */

export type ArquitecturaHP = 'CNN_GRU_ATTN' | 'GRU';

/** Protocolo de la busqueda sobre redes, tal como lo declara hp_dl_resumen.json. */
export interface ProtocoloDLHP {
  n_iter: number;
  folds: string[];
  epochs: number;
  semilla: number;
  pool: string;
}

/** Una de las dos entradas de hp_dl_resumen.json, sin transformar. */
export interface ResumenArquitecturaHP {
  protocolo: ProtocoloDLHP;
  r2_base_media: number;
  r2_base_std: number;
  r2_opt_media: number;
  r2_opt_std: number;
  delta_medio: number;
  mejora_relativa_pct: number;
  pacientes_mejorados: number;
  n_pacientes: number;
  wilcoxon_W: number;
  wilcoxon_p: number;
  significativo_005: boolean;
  config_base: Record<string, string>;
  config_optimizada: Record<string, string>;
  r2_por_paciente: {
    base: number[];
    optimizada: number[];
    pacientes: string[];
  };
}

export type ResumenDLHP = Record<ArquitecturaHP, ResumenArquitecturaHP>;

/** Una de las 20 configuraciones evaluadas. Las columnas `hp_*` quedan en `hp`. */
export interface FilaConfigHP {
  arquitectura: string;
  combinacion: number;
  esBase: boolean;
  r2ValMedio: number;
  r2ValStd: number;
  minutos: number;
  /** Las columnas `hp_*` del CSV, con su nombre original y su valor como texto. */
  hp: Record<string, string>;
}

/** Efecto marginal de un valor concreto de un hiperparametro. */
export interface FilaSensibilidadHP {
  hiperparametro: string;
  valor: string;
  r2Medio: number;
  n: number;
  /** Recorrido del hiperparametro completo: max(r2_medio) - min(r2_medio). */
  rango: number;
}

/** Recorrido de un hiperparametro, ya agrupado. */
export interface RecorridoHP {
  hiperparametro: string;
  rango: number;
  /** Numero de valores distintos probados para ese hiperparametro. */
  valores: number;
}

/** Protocolo de la busqueda sobre modelos tradicionales, distinto del anterior. */
export interface ProtocoloTradHP {
  filtro: string;
  lookback: number;
  n_iter: number;
  cv: string;
  semilla: number;
  pacientes: string[];
  n_pacientes: number;
  formulacion: string;
}

export interface ModeloTradHP {
  r2_base_media: number;
  r2_base_std: number;
  r2_opt_media: number;
  r2_opt_std: number;
  delta_medio: number;
  mejora_relativa_pct: number;
  pacientes_mejorados: number;
  n_pacientes: number;
  wilcoxon_W: number;
  wilcoxon_p: number;
  significativo_005: boolean;
  config_consenso: Record<string, string>;
}

export interface ResumenTradHP {
  protocolo: ProtocoloTradHP;
  modelos: Record<string, ModeloTradHP>;
  tiempo_total_s: number;
}

/** Fila de hp_comparacion_final.csv: un paciente de un modelo tradicional. */
export interface FilaTradPaciente {
  modelo: string;
  paciente: string;
  r2TestBase: number;
  r2TestOpt: number;
  deltaR2: number;
}

/** El pliegue peor de la busqueda, con su contexto clinico de la cohorte completa. */
export interface PliegueCritico {
  paciente: string;
  /** R2 del pliegue dentro de la busqueda, configuracion base. */
  r2EnBusqueda: number;
  /** R2 del mismo paciente en la cohorte completa de 123 pliegues. */
  r2CohorteCompleta: number | null;
  pctEctopicos: number | null;
  nLatidos: number | null;
  base: string | null;
}

/** Comparacion emparejada entre las dos arquitecturas optimizadas, misma cohorte. */
export interface ContrasteArquitecturas {
  pacientes: string[];
  attnOpt: number[];
  gruOpt: number[];
  /** Media de las diferencias emparejadas GRU_opt - ATTN_opt sobre los pliegues. */
  deltaMedio: number;
  /** La misma media excluyendo el pliegue critico. */
  deltaMedioSinCritico: number;
  /** Pliegues en los que el GRU optimizado supera a la arquitectura final. */
  gruSuperaEn: number;
  n: number;
  /** Cuanto de la suma de diferencias aporta el pliegue critico, en tanto por ciento. */
  aporteCriticoPct: number;
}

export interface NB7HPDatos {
  dl: ResumenDLHP;
  configs: Record<ArquitecturaHP, FilaConfigHP[]>;
  /** Nombres de las columnas `hp_*` de cada CSV, en el orden del archivo. */
  hpColumnas: Record<ArquitecturaHP, string[]>;
  sensibilidad: Record<ArquitecturaHP, FilaSensibilidadHP[]>;
  /** Recorridos de mayor a menor: el primero es el hiperparametro dominante. */
  recorridos: Record<ArquitecturaHP, RecorridoHP[]>;
  /** Mejor configuracion de cada busqueda por r2_val_medio. */
  mejorConfig: Record<ArquitecturaHP, FilaConfigHP | null>;
  /** La configuracion base, la que el proyecto ya usaba. */
  configBase: Record<ArquitecturaHP, FilaConfigHP | null>;
  /** Tasa de aprendizaje mas baja de la rejilla, por arquitectura. */
  lrMinima: Record<ArquitecturaHP, number | null>;
  /** Minutos sumados de las configuraciones evaluadas. */
  minutosTotales: Record<ArquitecturaHP, number>;
  trad: ResumenTradHP;
  tradPorPaciente: FilaTradPaciente[];
  tradModelos: string[];
  pliegueCritico: PliegueCritico | null;
  contraste: ContrasteArquitecturas | null;
  /** Epocas del protocolo definitivo, leidas de resultados_lopo.csv. */
  epocasDefinitivo: number | null;
  /** Pliegues sobre los que se leyo ese numero de epocas. */
  nPlieguesDefinitivo: number;
}

export interface NB7HPResultado {
  datos: NB7HPDatos | null;
  cargando: boolean;
  error: string | null;
}

/* ───────────────────────────── utilidades ────────────────────────────────── */

/**
 * El servidor de desarrollo y el alojamiento de la SPA devuelven index.html con
 * codigo 200 ante una ruta que no existe. Sin esta comprobacion, un JSON ausente
 * revienta en JSON.parse con un mensaje incomprensible y un CSV ausente se
 * parsearia como filas de basura sin avisar de nada.
 */
async function texto(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const t = await r.text();
  if (t.trimStart().startsWith('<')) {
    throw new Error(`${url}: el servidor devolvio HTML, no el archivo de datos`);
  }
  return t;
}

async function leerJson<T>(url: string): Promise<T> {
  return JSON.parse(await texto(url)) as T;
}

async function leerCsv(url: string): Promise<Record<string, unknown>[]> {
  return parseCSV<Record<string, unknown>>(await texto(url));
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(x) ? x : null;
};

const media = (xs: number[]): number =>
  xs.length === 0 ? NaN : xs.reduce((s, x) => s + x, 0) / xs.length;

/* ─────────────────────────── transformaciones ────────────────────────────── */

function aConfigs(filas: Record<string, unknown>[]): FilaConfigHP[] {
  return filas.map((f) => {
    const hp: Record<string, string> = {};
    for (const [k, v] of Object.entries(f)) {
      if (k.startsWith('hp_')) hp[k] = v === null || v === undefined ? '' : String(v);
    }
    return {
      arquitectura: String(f.arquitectura ?? ''),
      combinacion: num(f.combinacion) ?? NaN,
      // parseCSV ya convierte True/False a booleano, pero el archivo podria
      // regenerarse con otra convencion: se acepta tambien el texto.
      esBase: f.es_base === true || String(f.es_base).toLowerCase() === 'true',
      r2ValMedio: num(f.r2_val_medio) ?? NaN,
      r2ValStd: num(f.r2_val_std) ?? NaN,
      minutos: num(f.minutos) ?? NaN,
      hp,
    };
  });
}

function aSensibilidad(filas: Record<string, unknown>[]): FilaSensibilidadHP[] {
  return filas.map((f) => ({
    hiperparametro: String(f.hiperparametro ?? ''),
    // El archivo del GRU escribe los enteros como 32.0 y el de la otra
    // arquitectura como 32; se muestran tal cual vienen, sin reescribirlos.
    valor: f.valor === null || f.valor === undefined ? '' : String(f.valor),
    r2Medio: num(f.r2_medio) ?? NaN,
    n: num(f.n) ?? 0,
    rango: num(f.rango) ?? NaN,
  }));
}

/** Agrupa la sensibilidad por hiperparametro. `rango` se repite en cada fila. */
function aRecorridos(filas: FilaSensibilidadHP[]): RecorridoHP[] {
  const mapa = new Map<string, { rango: number; valores: number }>();
  filas.forEach((f) => {
    const previo = mapa.get(f.hiperparametro);
    if (previo) previo.valores += 1;
    else mapa.set(f.hiperparametro, { rango: f.rango, valores: 1 });
  });
  return Array.from(mapa.entries())
    .map(([hiperparametro, { rango, valores }]) => ({ hiperparametro, rango, valores }))
    .sort((a, b) => b.rango - a.rango);
}

function aTradPaciente(filas: Record<string, unknown>[]): FilaTradPaciente[] {
  return filas.map((f) => ({
    modelo: String(f.modelo ?? ''),
    paciente: String(f.paciente ?? ''),
    r2TestBase: num(f.r2_test_base) ?? NaN,
    r2TestOpt: num(f.r2_test_opt) ?? NaN,
    deltaR2: num(f.delta_r2) ?? NaN,
  }));
}

/**
 * Pliegue con el R2 mas bajo de la busqueda, cruzado con la cohorte completa.
 * No se elige a mano: se toma el minimo del vector `base` de la arquitectura final.
 */
function hallarPliegueCritico(
  arq: ResumenArquitecturaHP,
  ectopicos: Record<string, unknown>[],
): PliegueCritico | null {
  const base = arq.r2_por_paciente?.base ?? [];
  const pacientes = arq.r2_por_paciente?.pacientes ?? [];
  if (base.length === 0 || base.length !== pacientes.length) return null;
  let i = 0;
  for (let k = 1; k < base.length; k++) if (base[k] < base[i]) i = k;
  const paciente = String(pacientes[i]);
  const fila = ectopicos.find((f) => String(f.paciente) === paciente);
  return {
    paciente,
    r2EnBusqueda: base[i],
    r2CohorteCompleta: fila ? num(fila.R2_total) : null,
    pctEctopicos: fila ? num(fila.pct_ectopicos) : null,
    nLatidos: fila ? num(fila.n_latidos) : null,
    base: fila ? String(fila.base) : null,
  };
}

/**
 * Contraste emparejado entre las dos arquitecturas optimizadas sobre los mismos
 * pliegues. Solo diferencias y conteos: aqui NO se calcula ninguna prueba de
 * hipotesis, porque la que corresponde a este par no esta en ningun archivo y
 * escribirla a mano la volveria inverificable.
 */
function contrastar(
  attn: ResumenArquitecturaHP,
  gru: ResumenArquitecturaHP,
  critico: string | null,
): ContrasteArquitecturas | null {
  const pa = (attn.r2_por_paciente?.pacientes ?? []).map(String);
  const pg = (gru.r2_por_paciente?.pacientes ?? []).map(String);
  if (pa.length === 0 || pa.length !== pg.length) return null;
  if (pa.some((p, i) => p !== pg[i])) return null; // sin pliegues alineados no hay par

  const attnOpt = attn.r2_por_paciente.optimizada;
  const gruOpt = gru.r2_por_paciente.optimizada;
  const dif = attnOpt.map((v, i) => gruOpt[i] - v);
  const sinCritico = dif.filter((_, i) => pa[i] !== critico);
  const suma = dif.reduce((s, x) => s + x, 0);
  const aporte = dif.find((_, i) => pa[i] === critico);

  return {
    pacientes: pa,
    attnOpt,
    gruOpt,
    deltaMedio: media(dif),
    deltaMedioSinCritico: media(sinCritico),
    gruSuperaEn: dif.filter((d) => d > 0).length,
    n: dif.length,
    aporteCriticoPct: aporte !== undefined && suma !== 0 ? (aporte / suma) * 100 : NaN,
  };
}

/**
 * Epocas del protocolo definitivo. Se leen de la columna `epochs` de los pliegues
 * LOPO de la arquitectura final; si no fueran todas iguales se devuelve null antes
 * que inventar un numero.
 */
function leerEpocasDefinitivo(
  lopo: Record<string, unknown>[],
): { epocas: number | null; n: number } {
  const filas = lopo.filter((f) => String(f.Modelo) === 'CNN_GRU_ATTN');
  const valores = new Set(filas.map((f) => num(f.epochs)).filter((x): x is number => x !== null));
  return { epocas: valores.size === 1 ? Array.from(valores)[0] : null, n: filas.length };
}

/* ─────────────────────────────── el hook ─────────────────────────────────── */

export function useNB7HPResults(): NB7HPResultado {
  const [datos, setDatos] = useState<NB7HPDatos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [dl, csvAttn, csvGru, sensAttn, sensGru, trad, comparacion, ectopicos, lopo] =
          await Promise.all([
            leerJson<ResumenDLHP>(FUENTES_NB7HP.dlResumen),
            leerCsv(FUENTES_NB7HP.dlConfigs.CNN_GRU_ATTN),
            leerCsv(FUENTES_NB7HP.dlConfigs.GRU),
            leerCsv(FUENTES_NB7HP.dlSensibilidad.CNN_GRU_ATTN),
            leerCsv(FUENTES_NB7HP.dlSensibilidad.GRU),
            leerJson<ResumenTradHP>(FUENTES_NB7HP.tradResumen),
            leerCsv(FUENTES_NB7HP.tradPorPaciente),
            leerCsv(FUENTES_NB7HP.ectopicos),
            leerCsv(FUENTES_NB7HP.lopo),
          ]);
        if (!vivo) return;

        if (!dl?.CNN_GRU_ATTN || !dl?.GRU) {
          throw new Error(`${FUENTES_NB7HP.dlResumen}: falta CNN_GRU_ATTN o GRU`);
        }
        if (!trad?.modelos || !trad?.protocolo) {
          throw new Error(`${FUENTES_NB7HP.tradResumen}: falta modelos o protocolo`);
        }

        const configs: Record<ArquitecturaHP, FilaConfigHP[]> = {
          CNN_GRU_ATTN: aConfigs(csvAttn),
          GRU: aConfigs(csvGru),
        };
        const sensibilidad: Record<ArquitecturaHP, FilaSensibilidadHP[]> = {
          CNN_GRU_ATTN: aSensibilidad(sensAttn),
          GRU: aSensibilidad(sensGru),
        };

        const mejor = (fs: FilaConfigHP[]): FilaConfigHP | null =>
          fs.length === 0 ? null : fs.reduce((a, b) => (b.r2ValMedio > a.r2ValMedio ? b : a));

        const lrMinimaDe = (fs: FilaConfigHP[]): number | null => {
          const lrs = fs.map((f) => num(f.hp.hp_lr)).filter((x): x is number => x !== null);
          return lrs.length === 0 ? null : Math.min(...lrs);
        };

        const critico = hallarPliegueCritico(dl.CNN_GRU_ATTN, ectopicos);
        const ep = leerEpocasDefinitivo(lopo);

        setDatos({
          dl,
          configs,
          hpColumnas: {
            CNN_GRU_ATTN: Object.keys(configs.CNN_GRU_ATTN[0]?.hp ?? {}),
            GRU: Object.keys(configs.GRU[0]?.hp ?? {}),
          },
          sensibilidad,
          recorridos: {
            CNN_GRU_ATTN: aRecorridos(sensibilidad.CNN_GRU_ATTN),
            GRU: aRecorridos(sensibilidad.GRU),
          },
          mejorConfig: {
            CNN_GRU_ATTN: mejor(configs.CNN_GRU_ATTN),
            GRU: mejor(configs.GRU),
          },
          configBase: {
            CNN_GRU_ATTN: configs.CNN_GRU_ATTN.find((f) => f.esBase) ?? null,
            GRU: configs.GRU.find((f) => f.esBase) ?? null,
          },
          lrMinima: {
            CNN_GRU_ATTN: lrMinimaDe(configs.CNN_GRU_ATTN),
            GRU: lrMinimaDe(configs.GRU),
          },
          minutosTotales: {
            CNN_GRU_ATTN: configs.CNN_GRU_ATTN.reduce((s, f) => s + (f.minutos || 0), 0),
            GRU: configs.GRU.reduce((s, f) => s + (f.minutos || 0), 0),
          },
          trad,
          tradPorPaciente: aTradPaciente(comparacion),
          tradModelos: Object.keys(trad.modelos),
          pliegueCritico: critico,
          contraste: contrastar(dl.CNN_GRU_ATTN, dl.GRU, critico?.paciente ?? null),
          epocasDefinitivo: ep.epocas,
          nPlieguesDefinitivo: ep.n,
        });
        setError(null);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return { datos, cargando, error };
}
