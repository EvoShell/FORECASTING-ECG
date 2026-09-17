// ======================================================================
// Lopo.tsx — NB6 Cross-Patient Multi-Step Dashboard
// Model: CNN_GRU_ATTN  |  HORIZON=3  |  123 patients (MIT-BIH + INCART)
// ======================================================================
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useECGStore } from "@/store/useECGStore";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { PlotlyChart } from "@/components/charts/PlotlyChart";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Pause,
  Play,
  RotateCcw,
  Signal,
  TrendingUp,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";
import { useLang } from "@/i18n";
import { useSearchParams } from "react-router-dom";
import { MetricStat, MetricGrid } from "@/components/metrics/MetricStat";
import { DataTable } from "@/components/data/DataTable";
import { useReferenciaNB6, FUENTE_LOPO } from "@/hooks/useReferenciaNB6";
import { useUmbralDeteccion, FUENTE_DETECCION_P4, FUENTE_RESUMEN_P4 } from "@/hooks/useUmbralDeteccion";
import {
  useAnotaciones,
  alinearEtiquetas,
  esEctopica,
  DIR_ANOTACIONES,
  type ClaseAAMI,
} from "@/hooks/useAnotaciones";

// ── Configuracion del modelo NB6 ──────────────────────────
//
// Lo que queda aqui son PARAMETROS del modelo (forma de la entrada, horizonte,
// estadisticos de normalizacion): cosas que el codigo necesita para construir la
// peticion y que no cambian si se recalculan los resultados.
//
// Las METRICAS que antes tambien vivian aqui —R2, IC95, los tres horizontes, Shape
// Corr, Forecast Score, el gap— se leen ahora de `useReferenciaNB6`, que las saca de
// resultados_lopo.csv. Se conservan como respaldo para el primer fotograma, mientras
// el archivo carga, y nada mas. Si divergen del CSV, manda el CSV.──────
// Filter pipeline from filtro_completo() in 06_Cross_patient_MultiStep.ipynb:
// 1. iirnotch(60 Hz, Q=30) + filtfilt
// 2. butter(4, 0.5-40 Hz, 'sos') + sosfiltfilt
// 3. detrend(type='linear')
// 4. z-score global: (s - mean(s)) / (std(s) + 1e-8)
// NO MEDIAN FILTER in NB6. 'F_NB6' is the identifier for this exact pipeline.
const NB6_CONFIG = {
  modelo: "CNN_GRU_ATTN",
  filtro: "F_NB6", // triggers Notch+BP+Detrend+Znorm pipeline (no MED)
  lookback: 5,
  horizon: 3,
  beatLen: 256,
  featDim: 257,
  r2Medio: 0.6734,
  ic95: [0.6235, 0.7233] as [number, number],
  nPacientes: 123,
  rrMuGlobal: 0.7758458256721497,
  rrStdGlobal: 0.23085200786590576,
  r2ByHorizon: [0.6833, 0.6765, 0.6604] as [number, number, number],
  shapeCorr: 0.8383,
  forecastScore: 0.7073,
  gapTrainTest: 0.0956,
  // Intervalo RR medio de la cohorte, de /data/nb7/p2_resumen.json (0.811 s).
  // Es la referencia que importa: la prediccion debe estar lista antes del
  // siguiente latido. Comparar contra 0 ms no significaba nada.
  rrMedioMs: 811,
  nMitbih: 48,
  nIncart: 75,
} as const;

// ── Patient lists ────────────────────────────────────────

const API_AVAILABLE_MITBIH = new Set([
  "100",
  "101",
  "102",
  "103",
  "104",
  "105",
  "106",
  "107",
  "108",
  "109",
  "111",
  "112",
  "113",
  "114",
  "115",
  "116",
  "117",
  "118",
  "119",
  "121",
  "122",
  "123",
  "124",
  "200",
  "201",
  "202",
  "203",
  "205",
  "207",
  "208",
  "209",
  "210",
  "212",
  "213",
  "214",
  "215",
  "217",
  "219",
  "220",
  "221",
  "222",
  "223",
  "228",
  "230",
  "231",
  "232",
  "233",
  "234",
]);
const API_AVAILABLE_INCART = new Set(
  Array.from({ length: 75 }, (_, i) => `I${String(i + 1).padStart(2, "0")}`)
);

// ── Horizon colors ────────────────────────────────────────
const H_COLORS = ["var(--ok)", "var(--warn)", "var(--crit)"] as const;
const H_LABELS = ["t+1", "t+2", "t+3"] as const;
const H_FILL = [
  "rgba(39,174,96,0.15)",
  "rgba(243,156,18,0.12)",
  "rgba(231,76,60,0.10)",
] as const;

// ── Types ────────────────────────────────────────
type PatientGroup = "MITBIH" | "INCART";

interface LopoMetrics {
  frame: number;
  r2: number; // mean across horizons
  r2_t1: number;
  r2_t2: number;
  r2_t3: number;
  rmse: number;
  mae: number;
  dtw: number; // mean DTW across horizons
  dtw_t: number[];
  shapeCorr: number;
  slopeMse: number;
  ampError: number;
  forecastScore: number;
  latencyMs: number;      // ida y vuelta completa desde el navegador (incluye la red)
  serverMs: number | null;   // total del servidor
  inferenceMs: number | null; // solo la pasada del modelo
}

/**
 * Un latido evaluado en vivo.
 *
 * Sustituye a `ClinicalAlert`, que declaraba severidades «critical» y «warning» y
 * nunca llego a construirse: el panel que lo pintaba era inalcanzable porque el
 * estado solo se vaciaba, jamas se llenaba. Prometia deteccion clinica y no
 * entregaba ninguna.
 *
 * Esto es lo que de verdad se puede afirmar: el error de prediccion de este latido,
 * si supera el umbral del experimento 8, y —cuando hay anotacion— que clase le
 * asigno el cardiologo. Con esas tres cosas se puede decir si la marca acerto.
 */
interface LatidoEvaluado {
  /** Indice del latido dentro de la senal segmentada. */
  indice: number;
  /** Horizonte al que se predijo: 0 es t+1. */
  horizonte: number;
  /** Error cuadratico medio entre el latido real y el predicho. */
  mse: number;
  /** El MSE supera el umbral de deteccion. */
  marcado: boolean;
  /** Clase AAMI anotada, o null si no hay verdad de terreno para este latido. */
  clase: ClaseAAMI | null;
  /** Verdadero si la clase es ectopica; null si no se sabe o si esta excluido. */
  ectopico: boolean | null;
  /** Latido de clase Q: queda fuera de la evaluacion, como en el experimento 8. */
  excluido?: boolean;
}

/**
 * Guarda la tabla de analisis como CSV.
 *
 * La sesion se pierde al recargar, y lo que se mira en una defensa conviene poder
 * llevarselo. Se escribe con `;` porque es lo que Excel espera en configuracion
 * regional espanola, y con BOM para que no destroce los acentos.
 */
function descargarCsv(filas: PasoAnalisis[]) {
  const cab = ["paso", "latido_inicial", "segundo", "error_maximo", "umbral",
               "alarma", "clases", "veredicto", "r2"];
  const cuerpo = filas.map((f) => [
    f.paso,
    f.indiceInicial,
    f.segundo === null ? "" : f.segundo.toFixed(3),
    f.mseMax.toFixed(6),
    f.umbral === null ? "" : f.umbral.toFixed(6),
    f.alarma ? "si" : "no",
    f.clases.map((c) => c ?? "?").join("|"),
    f.veredicto,
    f.r2.toFixed(4),
  ].join(";"));
  const texto = "\uFEFF" + [cab.join(";"), ...cuerpo].join("\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "analisis_lopo.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Un analisis completo: cinco latidos de contexto, tres predichos, y el veredicto.
 *
 * El bucle anterior corria sin parar hasta que alguien lo detenia, y con eso no se
 * puede examinar nada: cuando querias mirar una alarma, ya iba por el marco siguiente.
 * Ahora cada analisis es una unidad que se cierra: predice, evalua, deja su fila en la
 * tabla y se detiene. En modo continuo sigue encadenando, pero **se para solo en cuanto
 * encuentra una alarma**, que es el momento en que hay algo que mirar.
 */
interface PasoAnalisis {
  /** Numero de analisis dentro de la sesion, empezando en 1. */
  paso: number;
  /** Indice del primer latido predicho dentro de la senal segmentada. */
  indiceInicial: number;
  /** Segundo del registro en que ocurre, si se conocen los picos R. */
  segundo: number | null;
  /** El mayor error de los tres latidos predichos: el que dispara la alarma. */
  mseMax: number;
  /** Umbral aplicado. */
  umbral: number | null;
  /** Alguno de los tres latidos supero el umbral. */
  alarma: boolean;
  /** Clases AAMI anotadas de los tres latidos, en orden. */
  clases: (ClaseAAMI | null)[];
  /** Que fue de la alarma frente a la anotacion del cardiologo. */
  veredicto: "VP" | "FP" | "FN" | "VN" | "sin etiqueta";
  /** R2 medio del analisis. */
  r2: number;
}

// ======================================================================
// Pure helper functions (no React deps)
// ======================================================================

const applyBiquad = (x: number[], b: number[], a: number[]) => {
  const y = new Array<number>(x.length).fill(0);
  for (let i = 0; i < x.length; i++) {
 y[i] =
 b[0] * x[i] +
 (i >= 1 ? b[1] * x[i - 1] - a[1] * y[i - 1] : 0) +
 (i >= 2 ? b[2] * x[i - 2] - a[2] * y[i - 2] : 0);
  }
  return y;
};
const filtfilt = (x: number[], b: number[], a: number[]) => {
  const fwd = applyBiquad(x, b, a);
  return applyBiquad([...fwd].reverse(), b, a).reverse();
};

/** IIR notch at 60 Hz, Q=30 — matches scipy.signal.iirnotch(60, 30, fs) + filtfilt */
function notch60(signal: number[], fs = 360): number[] {
  const f0 = 60;
  const Q = 30;
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = 1;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  return filtfilt(signal, [b0 / a0, b1 / a0, b2 / a0], [1, a1 / a0, a2 / a0]);
}

/** Zero-phase Butterworth BP — bandpass only, used for R-peak detection.
 * Cutoffs: 0.5 —o 40 Hz matching NB6 notebook F_ALTO = 40.0 Hz */
function butterworthFilter(signal: number[], fs = 360): number[] {
  const lowcut = 0.5;
  const highcut = Math.min(40, fs / 2 - 1); // NB6 uses F_ALTO=40 Hz
  const lpCoeffs = (fc: number, fsamp: number) => {
 const wn = Math.tan((Math.PI * fc) / fsamp);
 const k = wn * wn;
 const nm = 1 + Math.SQRT2 * wn + k;
 return {
 b: [k / nm, (2 * k) / nm, k / nm],
 a: [1, (2 * (k - 1)) / nm, (1 - Math.SQRT2 * wn + k) / nm],
 };
  };
  const hpCoeffs = (fc: number, fsamp: number) => {
 const wn = Math.tan((Math.PI * fc) / fsamp);
 const k = wn * wn;
 const nm = 1 + Math.SQRT2 * wn + k;
 return {
 b: [1 / nm, -2 / nm, 1 / nm],
 a: [1, (2 * (k - 1)) / nm, (1 - Math.SQRT2 * wn + k) / nm],
 };
  };
  const hp = hpCoeffs(lowcut, fs);
  const lp = lpCoeffs(highcut, fs);
  return filtfilt(filtfilt(signal, hp.b, hp.a), lp.b, lp.a);
}

function findRPeaks(signal: number[], fs = 360): number[] {
  const dsf = 4;
  const ds = signal.filter((_, i) => i % dsf === 0);
  const dsFs = Math.floor(fs / dsf);
  const filt = butterworthFilter(ds, dsFs);
  const diff = filt.map((v, i) => (i > 0 ? (v - filt[i - 1]) ** 2 : 0));
  const ws = Math.max(1, Math.floor(0.15 * dsFs));
  const mwa = diff.map((_, i) => {
 const s = Math.max(0, i - ws + 1);
 const w = diff.slice(s, i + 1);
 return w.reduce((a, b) => a + b, 0) / w.length;
  });
  let maxV = -Infinity;
  for (const v of mwa) {
 if (v > maxV) maxV = v;
  }
  const thr = 0.35 * maxV;
  const minD = Math.max(1, Math.floor(0.25 * dsFs));
  const peaks: number[] = [];
  for (let i = 1; i < mwa.length - 1; i++) {
 if (mwa[i] > thr && mwa[i] > mwa[i - 1] && mwa[i] > mwa[i + 1]) {
 if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minD) {
 peaks.push(i * dsf);
 }
 }
  }
  return peaks;
}

/** Linear detrend — matches scipy.signal.detrend(type='linear') used in filtro_completo */
function linearDetrend(signal: number[]): number[] {
  const n = signal.length;
  if (n < 2) return signal;
  // Fit best straight line y = slope*x + intercept, subtract it
  const mx = (n - 1) / 2;
  const my = signal.reduce((a, b) => a + b, 0) / n;
  let cov = 0,
 varx = 0;
  for (let i = 0; i < n; i++) {
 cov += (i - mx) * (signal[i] - my);
 varx += (i - mx) ** 2;
  }
  const slope = varx > 0 ? cov / varx : 0;
  const intercept = my - slope * mx;
  return signal.map((v, i) => v - (slope * i + intercept));
}

/**
 * NB6 full signal preprocessing — matches filtro_completo() from 06_Cross_patient_MultiStep.ipynb:
 * 1. Notch 60 Hz (iirnotch, Q=30, filtfilt) — matches scipy.signal.iirnotch(60,30,360)
 * 2. Bandpass 0.5-40 Hz Butterworth
 * 3. Linear detrend
 * 4. Global z-score of entire signal
 *
 * NOTE: The notebook uses FS=360 for ALL signals including INCART (257 Hz).
 * We always apply this filter at 360 Hz — no resampling.
 */
function filtroCompletoNB6(signal: number[], fs = 360): number[] {
  // 1. Notch 60 Hz, Q=30 — exact match to scipy iirnotch
  let s = notch60(signal, fs);
  // 2. Bandpass 0.5-40 Hz Butterworth (order 2 per section, filtfilt ? order 4)
  s = butterworthFilter(s, fs);
  // 3. Detrend
  s = linearDetrend(s);
  // 4. Global z-score
  const mu = s.reduce((a, b) => a + b, 0) / s.length;
  let vari = 0;
  for (const v of s) vari += (v - mu) ** 2;
  const sd = Math.max(Math.sqrt(vari / s.length), 1e-8);
  return s.map((v) => (v - mu) / sd);
}

/** Fixed-window segmentation (NB6 style: PRE_R=92, POST_R=164, no resample)
 *  CRITICAL: RR interval is BACKWARD (rpeaks[i] - rpeaks[i-1]) matching extraer_latidos_v3 */
function segmentBeatsFixedWindow(
  signal: number[],
  rPeaks: number[],
  beatLen = 256,
): {
  beats: number[][];
  rrIntervals: number[];
} {
  const PRE_R = Math.floor((beatLen * 36) / 100); // 256*36//100 = 92 (integer division like Python)
  const POST_R = beatLen - PRE_R; // 164
  const beats: number[][] = [];
  const rrIntervals: number[] = [];
  for (let i = 1; i < rPeaks.length - 1; i++) {
 const r = rPeaks[i];
 const ini = r - PRE_R;
 const fin = r + POST_R;
 if (ini < 0 || fin > signal.length) continue;
 const raw = signal.slice(ini, fin);
 if (raw.length !== beatLen) continue;
 // Per-beat z-score + clip (matches extraer_latidos_v3)
 const mu = raw.reduce((a, b) => a + b, 0) / beatLen;
 let vari = 0;
 for (const v of raw) vari += (v - mu) ** 2;
 const sd = Math.max(Math.sqrt(vari / beatLen), 1e-6);
 beats.push(raw.map((v) => Math.max(-5, Math.min(5, (v - mu) / sd))));
 // BACKWARD RR: rpeaks[i] - rpeaks[i-1]  (matches notebook: rr = (rpeaks[i] - rpeaks[i-1]) / FS)
 const rrSec = (rPeaks[i] - rPeaks[i - 1]) / 360;
 rrIntervals.push(Math.max(0.3, Math.min(2.0, rrSec)));
  }
  return { beats, rrIntervals };
}

/** Fallback midpoint segmentation (for demo synthetic signal) */
function segmentBeatsMidpoint(
  signal: number[],
  rPeaks: number[],
  beatLen = 256,
): {
  beats: number[][];
  rrIntervals: number[];
} {
  const beats: number[][] = [];
  const rrIntervals: number[] = [];
  for (let i = 1; i < rPeaks.length - 1; i++) {
 const start = Math.floor((rPeaks[i - 1] + rPeaks[i]) / 2);
 const end = Math.ceil((rPeaks[i] + rPeaks[i + 1]) / 2);
 if (end - start < 50) continue;
 let beat = signal.slice(start, end);
 if (beat.length < beatLen)
 beat = [
 ...beat,
 ...new Array(beatLen - beat.length).fill(beat[beat.length - 1] ?? 0),
 ];
 else beat = beat.slice(0, beatLen);
 const mu = beat.reduce((a, b) => a + b, 0) / beatLen;
 let vari = 0;
 for (const v of beat) vari += (v - mu) ** 2;
 const sd = Math.max(Math.sqrt(vari / beatLen), 1e-6);
 beats.push(beat.map((v) => Math.max(-5, Math.min(5, (v - mu) / sd))));
 // BACKWARD RR: rpeaks[i] - rpeaks[i-1] (consistent with extraer_latidos_v3)
 rrIntervals.push(
 Math.max(0.3, Math.min(2.0, (rPeaks[i] - rPeaks[i - 1]) / 360)),
 );
  }
  return { beats, rrIntervals };
}

// ── Metric functions ────────────────────────────────────────
function r2Score(yTrue: number[], yPred: number[]): number {
  const n = Math.min(yTrue.length, yPred.length);
  if (n === 0) return 0;
  const mu = yTrue.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let ss = 0,
 sr = 0;
  for (let i = 0; i < n; i++) {
 ss += (yTrue[i] - mu) ** 2;
 sr += (yTrue[i] - yPred[i]) ** 2;
  }
  return ss < 1e-12 ? 0 : 1 - sr / ss;
}
function rmseScore(yTrue: number[], yPred: number[]): number {
  const n = Math.min(yTrue.length, yPred.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += (yTrue[i] - yPred[i]) ** 2;
  return Math.sqrt(s / n);
}
function maeScore(yTrue: number[], yPred: number[]): number {
  const n = Math.min(yTrue.length, yPred.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(yTrue[i] - yPred[i]);
  return s / n;
}
function dtwDistance(a: number[], b: number[]): number {
  const n = a.length,
 m = b.length;
  if (n === 0 || m === 0) return 0;
  const dtw: number[][] = Array.from({ length: n + 1 }, () =>
 new Array(m + 1).fill(Infinity),
  );
  dtw[0][0] = 0;
  for (let i = 1; i <= n; i++)
 for (let j = 1; j <= m; j++)
 dtw[i][j] =
 Math.abs(a[i - 1] - b[j - 1]) +
 Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
  return dtw[n][m] / (n + m);
}
function slopeMSE(yTrue: number[], yPred: number[]): number {
  const n = Math.min(yTrue.length, yPred.length) - 1;
  if (n <= 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++)
 s += Math.min(
 (yTrue[i + 1] - yTrue[i] - (yPred[i + 1] - yPred[i])) ** 2,
 10,
 );
  return s / n;
}
function ampError(yTrue: number[], yPred: number[]): number {
  const tMax = Math.max(...yTrue),
 tMin = Math.min(...yTrue);
  const pMax = Math.max(...yPred),
 pMin = Math.min(...yPred);
  return Math.abs(tMax - tMin - (pMax - pMin));
}
function shapeCorrelation(yTrue: number[], yPred: number[]): number {
  const n = Math.min(yTrue.length, yPred.length);
  if (n < 2) return 0;
  const muA = yTrue.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const muB = yPred.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let cov = 0,
 sA = 0,
 sB = 0;
  for (let i = 0; i < n; i++) {
 cov += (yTrue[i] - muA) * (yPred[i] - muB);
 sA += (yTrue[i] - muA) ** 2;
 sB += (yPred[i] - muB) ** 2;
  }
  return sA < 1e-12 || sB < 1e-12 ? 0 : cov / Math.sqrt(sA * sB);
}

/** Deterministic-ish hash for reproducible per-frame variation */
function simHash(seed: number): () => number {
  let s = seed | 0;
  return () => {
 s = (s * 1103515245 + 12345) & 0x7fffffff;
 return (s / 0x7fffffff) * 2 - 1; // range [-1, 1]
  };
}

/**
 * Local simulation — realistic multi-horizon ECG beat prediction.
 *
 * Produces visually distinct predictions per horizon with:
 *  1. Progressiv noise: σ grows  t+1 —T t+2 —T t+3
 *  2. QRS amplitude variation (±8—o20 % depending on horizon)
 *  3. Temporal jitter — slight phase shift simulating RR variability
 *  4. T-wave morphology drift (amplitude + width change)
 *  5. Frame-seeded RNG so successive calls yield different shapes
 */
function simulateOneBeatAdvanced(
  ctx: number[][],
  horizonStep: number,
  frameSeed: number,
): number[] {
  const beatLen = ctx[0]?.length ?? NB6_CONFIG.beatLen;
  const n = ctx.length;
  if (n === 0) return new Array(beatLen).fill(0);

  const rng = simHash(frameSeed * 7 + horizonStep * 1337);

  // 1) Weighted average of context — give more weight to recent beats
  const base: number[] = new Array(beatLen).fill(0);
  const weights = ctx.map((_, j) => Math.exp(-0.3 * (n - 1 - j)));
  const wSum = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < beatLen; i++) {
 for (let j = 0; j < n; j++) {
 base[i] += (ctx[j][i] ?? 0) * weights[j];
 }
 base[i] /= wSum;
  }

  // 2) Progressive noise amplitude: t+1=0.06, t+2=0.12, t+3=0.20
  const noiseAmp = 0.06 + horizonStep * 0.07;

  // 3) QRS amplitude perturbation: ±8 % at t+1, ±14 % at t+2, ±20 % at t+3
  const ampScale = 1.0 + rng() * (0.08 + horizonStep * 0.06);

  // 4) Temporal jitter: shift the signal by ±1—o3 samples
  const maxShift = 1 + horizonStep;
  const shift = Math.round(rng() * maxShift);

  // 5) T-wave region perturbation (samples ~140—o220 of 256-sample beat)
  const tWaveCenter = Math.floor(beatLen * 0.65);
  const tWaveWidth = Math.floor(beatLen * 0.12);
  const tWaveAmpDelta = rng() * (0.15 + horizonStep * 0.10);

  // 6) Build final beat
  const out: number[] = [];
  for (let i = 0; i < beatLen; i++) {
 // Shifted index with clamping
 const srcIdx = Math.max(0, Math.min(beatLen - 1, i + shift));
 let v = base[srcIdx] * ampScale;

 // T-wave perturbation (Gaussian envelope)
 const dt = (i - tWaveCenter) / tWaveWidth;
 v += tWaveAmpDelta * Math.exp(-0.5 * dt * dt);

 // Progressive noise
 v += rng() * noiseAmp;

 out.push(v);
  }
  return out;
}

// Global frame counter for simulation seeding — ensures each call produces unique output
let _simFrameCounter = 0;

/** Simulate NB6 multi-step output: returns HORIZON=3 beats at once
 *  Each horizon has progressively more degradation (realistic behavior). */
function simulateNB6(ctxBeats: number[][], horizon = 3): number[][] {
  const predicted: number[][] = [];
  const frameSeed = ++_simFrameCounter;
  let ctx = [...ctxBeats];
  for (let h = 0; h < horizon; h++) {
 const beat = simulateOneBeatAdvanced(
 ctx.slice(-NB6_CONFIG.lookback),
 h,
 frameSeed,
 );
 predicted.push(beat);
 ctx = [...ctx.slice(1), beat];
  }
  return predicted;
}

/** Build synthetic INCART-style ECG (slightly more irregular than MIT-BIH) */
function buildDemoSignal(beats = 80, fs = 360, incart = false): number[] {
  const sig: number[] = [];
  for (let b = 0; b < beats; b++) {
 const hr = incart ? 55 + Math.random() * 40 : 65 + Math.random() * 20;
 const rrMs = (60 / hr) * fs;
 const len = Math.round(rrMs + (Math.random() - 0.5) * (incart ? 60 : 20));
 const amp = 1.0 + (Math.random() - 0.5) * (incart ? 0.7 : 0.3);
 const pvc = incart && Math.random() < 0.08;
 for (let t = 0; t < len; t++) {
 const x = t / len;
 let v =
 Math.exp(-200 * (x - 0.35) ** 2) * (pvc ? -amp * 1.8 : amp) + // R
 Math.exp(-80 * (x - 0.2) ** 2) * 0.15 + // P
 Math.exp(-500 * (x - 0.39) ** 2) * -0.4 + // S
 Math.exp(-30 * (x - 0.65) ** 2) * (0.25 + (Math.random() - 0.5) * 0.1); // T
 v += (Math.random() - 0.5) * 0.05;
 sig.push(v);
 }
  }
  return sig;
}

// ======================================================================
// Main Page Component
// ======================================================================
export function LopoPage() {
  const signalStore = useECGStore((s) => s.signal);
  const setSignalStore = useECGStore((s) => s.setSignal);
  const { t } = useLang();

  // Las cifras de referencia salen de resultados_lopo.csv, no de una constante.
  const referencia = useReferenciaNB6();
  // El umbral de deteccion de latido ectopico y su procedencia.
  const deteccion = useUmbralDeteccion();

  // Se usa el modelo BASE, no el calibrado, y la razon importa: el archivo que la API
  // sirve es `CNN_GRU_ATTN_final_patched.keras`, que es el base. Ensenar al lado las
  // referencias del calibrado —que la tesis publica como resultado del proyecto, 0.6797—
  // seria comparar las predicciones de un modelo con las metricas de otro. La cifra del
  // calibrado se declara aparte, en el pie, para que no se pierda.
  const R = referencia.base;



  /** Referencia con respaldo: lo leido del archivo, y la constante solo mientras carga. */
  const ref = useMemo(() => ({
    r2: R?.r2 ?? NB6_CONFIG.r2Medio,
    ic95: R?.ic95 ?? NB6_CONFIG.ic95,
    r2PorHorizonte: R?.r2PorHorizonte ?? NB6_CONFIG.r2ByHorizon,
    shapeCorr: R?.shapeCorr ?? NB6_CONFIG.shapeCorr,
    forecastScore: R?.forecastScore ?? NB6_CONFIG.forecastScore,
    gap: R?.gapTrainTest ?? NB6_CONFIG.gapTrainTest,
    rmse: R?.rmse ?? 0.5139,
    mae: R?.mae ?? 0.3178,
    slopeMse: R?.slopeMse ?? 0.0223,
    ampError: R?.ampError ?? 0.5653,
    n: R?.n ?? NB6_CONFIG.nPacientes,
    leido: R !== null,
  }), [R]);

  // ,, API connection status ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  // null = checking, true = online, false = offline
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [despertando, setDespertando] = useState(false);
  const [beatsLoaded, setBeatsLoaded] = useState(0);

  // Comprobacion de salud del servicio.
  //
  // Antes pedia "/api/health" a pelo, ignorando VITE_API_URL: con la API desplegada
  // en otro servidor, la peticion iba al propio front, fallaba, y la pagina caia en
  // modo demostracion aunque el servicio estuviera perfectamente vivo.
  //
  // Ademas el servicio se duerme por inactividad y la primera peticion puede tardar
  // mas de 25 s. Por eso se reintenta: mientras tanto, el estado es "despertando"
  // en vez de "sin conexion", que es lo que confundia.
  useEffect(() => {
    let vivo = true;
    let intentos = 0;

    const comprobar = async () => {
      while (vivo && intentos < 4) {
        intentos += 1;
        try {
          const r = await api.salud();
          if (!vivo) return;
          if (r.status === "healthy" || r.status === "ok") {
            setApiOnline(true);
            setDespertando(false);
            return;
          }
        } catch {
          if (!vivo) return;
          // El primer fallo casi siempre es el arranque en frio, no una caida.
          if (intentos === 1) setDespertando(true);
        }
        if (intentos < 4) await new Promise((r) => setTimeout(r, 4000));
      }
      if (vivo) {
        setApiOnline(false);
        setDespertando(false);
      }
    };

    comprobar();
    return () => {
      vivo = false;
    };
  }, []);

  // ,, Source & patient ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  // Signal source is determined by patient group: MIT-BIH uses API when available,
  // INCART always uses synthetic signal.
  // El paciente vive en la direccion: `/lopo?paciente=208`. Asi se puede enviar un
  // caso concreto al asesor, y la pagina vuelve a el al recargar.
  const [params, setParams] = useSearchParams();
  const pacienteUrl = params.get("paciente");
  const [patientGroup, setPatientGroup] = useState<PatientGroup>(
    pacienteUrl && /^I/i.test(pacienteUrl) ? "INCART" : "MITBIH",
  );
  const [demoPatient, setDemoPatient] = useState(pacienteUrl ?? "100");

  // El servicio ignora el parametro `lead` que se le envia y toma siempre el canal 0
  // del registro. Segun el propio `salvedad_derivaciones.json` del proyecto, en 102,
  // 104 y 114 ese canal no es MLII; y en los 75 registros de INCART tampoco. Declarar
  // «MLII» sin matices era falso para 78 de los 123 pacientes seleccionables.
  const derivacionReal =
    patientGroup === "INCART" || ["102", "104", "114"].includes(demoPatient)
      ? "canal 0"
      : "MLII";

  // Un paciente que no existe en la lista se ignora sin romper nada.
  useEffect(() => {
    const actual = params.get("paciente");
    if (actual !== demoPatient) {
      const p = new URLSearchParams(params);
      p.set("paciente", demoPatient);
      setParams(p, { replace: true });
    }
    // Solo al cambiar de paciente: `params` cambia de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoPatient]);
  const [patientExpanded, setPatientExpanded] = useState(false);

  // ,, Mode & playback ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  const [speed, setSpeed] = useState(0.5);

  /**
   * Espejos de los controles de reproduccion.
   *
   * El bucle de animacion se monta una sola vez por ejecucion y captura el valor que
   * `speed` tuviera al arrancar. Estaba fuera de sus dependencias, con el aviso del
   * linter silenciado: mover el deslizador de velocidad mientras la senal corria no
   * hacia absolutamente nada. Meterlo en las dependencias reiniciaria la animacion en
   * cada arrastre, asi que se lee por referencia, que es lo que un bucle necesita.
   */
  const speedRef = useRef(0.5);
  const [autoAnimate] = useState(true);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // ,, Signal state ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  const [normalizedBeats, setNormalizedBeats] = useState<number[][]>([]);
  // Los picos R que el servicio uso. No se guardaban en ninguna parte, y sin ellos
  // no hay forma de saber que latido de la anotacion corresponde a cada latido
  // segmentado, ni por tanto de contrastar una marca contra la verdad del cardiologo.
  const [rPeaksSenal, setRPeaksSenal] = useState<number[]>([]);
  const [rrPerBeat, setRrPerBeat] = useState<number[]>([]);
  const [beatMu, setBeatMu] = useState(0);
  const [beatStd, setBeatStd] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [lopoError, setLopoError] = useState<string | null>(null);

  // ,, Prediction results ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  const [metricsHistory, setMetricsHistory] = useState<LopoMetrics[]>([]);
  const [r2ByStep, setR2ByStep] = useState<number[][]>([[], [], []]);
  const [currentPredBeats, setCurrentPredBeats] = useState<number[][]>([]);
  const [currentCtxBeats, setCurrentCtxBeats] = useState<number[][]>([]);
  const [currentRealFuture, setCurrentRealFuture] = useState<number[][]>([]);
  const [useSimMode, setUseSimMode] = useState(false);


  // Los latidos evaluados en la sesion. A diferencia del vector de alertas que
  // sustituye, este si se llena: una entrada por latido y horizonte comparado.
  const [evaluados, setEvaluados] = useState<LatidoEvaluado[]>([]);

  // ── El analisis, paso a paso ────────────────────────────────────────────
  /** `paso` analiza uno y se detiene; `serie` encadena y se para en la alarma. */
  const [modoAnalisis, setModoAnalisis] = useState<"paso" | "serie">("paso");
  /** Una fila por analisis. Es la tabla que queda para revisar y exportar. */
  const [pasos, setPasos] = useState<PasoAnalisis[]>([]);
  /** Los tres latidos del analisis que se esta viendo, con su veredicto. */
  const [latidosMarco, setLatidosMarco] = useState<LatidoEvaluado[]>([]);
  /** Se detuvo por haber encontrado una alarma, no por haber terminado. */
  const [paradoPorAlarma, setParadoPorAlarma] = useState(false);

  // ── Deteccion sobre el residuo ──────────────────────────────────────────
  // Las etiquetas del cardiologo para el paciente que se esta viendo.
  const anotaciones = useAnotaciones(demoPatient);

  // La alineacion entre latido segmentado y latido anotado. Si no cuadra, devuelve
  // el motivo y la pagina lo dice en lugar de pintar etiquetas desplazadas.
  const { clases: clasesPorLatido, motivo: motivoEtiquetas } = useMemo(
    () => alinearEtiquetas(anotaciones.datos, rPeaksSenal, normalizedBeats.length),
    [anotaciones.datos, rPeaksSenal, normalizedBeats.length],
  );

  /** Lo que el experimento 8 midio para este paciente, si estuvo en su cohorte. */
  const refPaciente = deteccion.porPaciente[demoPatient] ?? null;

  /**
   * El umbral que se aplica. Se prefiere el del propio paciente cuando existe; si no,
   * la mediana de los 46 pliegues, que en la practica es un umbral global porque 41 de
   * ellos comparten el mismo valor.
   */
  const umbralUsado = refPaciente?.umbral ?? deteccion.umbralGlobal;

  /** Recuento de la sesion: la matriz de confusion que se va llenando en vivo. */
  // El bucle de prediccion vive en un efecto que NO depende del umbral ni de las
  // etiquetas: anadirlos como dependencia lo reiniciaria a mitad de sesion y se
  // perderia el historico. Se leen por referencia, que siempre tiene el valor vigente.
  const modoRef = useRef<"paso" | "serie">("paso");
  /** Por donde va el analisis. El bucle reanuda aqui en vez de volver al principio. */
  const marcoRef = useRef(0);
  const picosRef = useRef<number[]>([]);
  const umbralRef = useRef<number | null>(null);
  const clasesRef = useRef<(ClaseAAMI | null)[]>([]);
  useEffect(() => { modoRef.current = modoAnalisis; }, [modoAnalisis]);
  useEffect(() => { picosRef.current = rPeaksSenal; }, [rPeaksSenal]);
  useEffect(() => { umbralRef.current = umbralUsado; }, [umbralUsado]);
  useEffect(() => { clasesRef.current = clasesPorLatido; }, [clasesPorLatido]);

  const conteo = useMemo(() => {
    let vp = 0, fp = 0, fn = 0, vn = 0, marcados = 0, conVerdad = 0, excluidos = 0;
    for (const e of evaluados) {
      if (e.excluido) { excluidos++; continue; }
      if (e.marcado) marcados++;
      if (e.ectopico === null) continue;
      conVerdad++;
      if (e.marcado && e.ectopico) vp++;
      else if (e.marcado && !e.ectopico) fp++;
      else if (!e.marcado && e.ectopico) fn++;
      else vn++;
    }
    return {
      total: evaluados.length - excluidos,
      excluidos,
      marcados,
      conVerdad,
      vp, fp, fn, vn,
      // Se devuelven nulos y no ceros: sin marcas no hay precision que calcular, y un
      // cero se leeria como «acierta el 0 %», que es una afirmacion distinta.
      precision: vp + fp > 0 ? vp / (vp + fp) : null,
      exhaustividad: vp + fn > 0 ? vp / (vp + fn) : null,
    };
  }, [evaluados]);

  // Un unico bucle: el del analisis prospectivo. El segundo, el del generador
  // autoregresivo, se retiro junto con el modo Futuro.
  const animationRef = useRef<number | ReturnType<typeof setTimeout>>(0);

  // ── Theme ─────────────────────────────────────────────────────────────
  const storeTheme = useECGStore((s) => s.theme);
  const isDark = storeTheme === "dark";

  const pGrid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const pTick = isDark ? "var(--text-muted)" : "var(--text-muted)";
  const pBg = isDark ? "var(--bg)" : "var(--surface)";

  // 
  // Signal loading
  // 
  /**
   * Generacion de carga en curso.
   *
   * Sin este testigo, pulsar el paciente 207 (lento) y acto seguido el 100 (rapido)
   * dejaba llegar la respuesta de 207 despues, y sus latidos se guardaban bajo el
   * rotulo del 100: la pagina mostraba metricas de un paciente con la etiqueta de
   * otro. Cada llamada toma un numero; solo la ultima tiene permiso para escribir.
   */
  const cargaGenRef = useRef(0);

  const loadSignal = useCallback(async () => {
 const generacion = ++cargaGenRef.current;
 const vigente = () => cargaGenRef.current === generacion;

 setIsLoading(true);
 setLopoError(null);
 setIsRunning(false);
 setMetricsHistory([]);
 setR2ByStep([[], [], []]);
 setCurrentPredBeats([]);
 // Al cambiar de paciente quedaban en pantalla el contexto, el futuro real, las
 // alertas y las metricas del anterior: con el rotulo ya actualizado, parecian
 // pertenecer al paciente nuevo.
 setCurrentCtxBeats([]);
 setCurrentRealFuture([]);
 setEvaluados([]);
 setBeatsLoaded(0);
 setRPeaksSenal([]);
 if (animationRef.current) {
 clearTimeout(animationRef.current as number);
 cancelAnimationFrame(animationRef.current as number);
 }

  try {
    let rawSignal: number[] = [];
    let rawRpeaks: number[] | null = null;
    const isIncart = patientGroup === "INCART";

    // Fetch real ECG from API when the patient is MIT-BIH or INCART and available
    const isAvailableApi = (isIncart && API_AVAILABLE_INCART.has(demoPatient)) || (!isIncart && API_AVAILABLE_MITBIH.has(demoPatient));

    // ── Try server-side processing first (one call, no huge JSON roundtrip) ──
    let usedApi = false;
    if (isAvailableApi) {
      try {
        const proc = await api.processPatient({
          patientId: demoPatient,
          lead: "MLII",
          filter_type: NB6_CONFIG.filtro,
          normalize_global: false,
        });
        if (!vigente()) return;
        if (
          proc.beats &&
          proc.beats.length >= NB6_CONFIG.lookback + NB6_CONFIG.horizon
        ) {
          setNormalizedBeats(proc.beats);
          setRPeaksSenal(proc.r_peaks ?? []);
          setRrPerBeat(proc.rr_per_beat ?? []);
          setBeatMu(proc.beat_mu ?? 0);
          setBeatStd(proc.beat_std ?? 1);
          setBeatsLoaded(proc.beats.length);
          setSignalStore({
            patientId: demoPatient,
            lead: "MLII",
            values: proc.signal,
            timestamps: proc.signal.map((_, i) => i / 360),
            annotations: [],
          });
          setApiOnline(true);
          // La ruta de API es la real: si veniamos de un fallo anterior, hay que
          // reponer el modo, o el rotulo seguiria diciendo «simulacion» sobre
          // resultados del modelo de verdad.
          setUseSimMode(false);
          usedApi = true;
        }
      } catch (e) {
        if (!vigente()) return;
        // Antes esto solo apagaba la insignia y caia a simulacion. El banner de
        // error existia y era practicamente inalcanzable.
        setLopoError(
          `${t("El servicio no respondió", "The service did not respond")}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
        setApiOnline(false);
      }
    }

    if (usedApi) return; // done — API handled everything

    // ── Signal fetch fallback (for processSignal path if processPatient fails) ──
    if (isAvailableApi) {
      try {
        const resp = await api.getSignal(demoPatient);
        if (!vigente()) return;
        rawSignal = resp.signal;
        rawRpeaks = resp.r_peaks.length > 3 ? resp.r_peaks : null;
      } catch {
        rawSignal = buildDemoSignal(120, 360, isIncart);
      }
    } else {
      rawSignal = buildDemoSignal(120, 360, isIncart);
    }

    // ,, Try backend preprocessing (NB6 pipeline via API) ,,,,,
    try {
      const proc = await api.processSignal({
        signal: rawSignal,
        fs: 360,
        filter_type: NB6_CONFIG.filtro,
        detect_peaks: true,
        r_peaks_hint: rawRpeaks,
        normalize_global: false,
      });
      if (!vigente()) return;
      if (
        proc.beats &&
        proc.beats.length >= NB6_CONFIG.lookback + NB6_CONFIG.horizon
      ) {
        setNormalizedBeats(proc.beats);
        setRPeaksSenal(proc.r_peaks ?? []);
        setRrPerBeat(proc.rr_per_beat ?? []);
        setBeatMu(proc.beat_mu ?? 0);
        setBeatStd(proc.beat_std ?? 1);
        setBeatsLoaded(proc.beats.length);
        setSignalStore({
          patientId: demoPatient,
          lead: "MLII",
          values: proc.signal,
          timestamps: proc.signal.map((_, i) => i / 360),
          annotations: [],
        });
        setApiOnline(true);
        setUseSimMode(false);
        return;
      }
      } catch (e) {
      if (!vigente()) return;
      // Antes esto solo apagaba la insignia y caia a simulacion. El banner de
      // error existia y era practicamente inalcanzable.
      setLopoError(
      `${t("El servicio no respondió", "The service did not respond")}: ${
        e instanceof Error ? e.message : String(e)
      }`,
      );
      setApiOnline(false);
    }

    // ,, Local fallback: full NB6 pipeline in JavaScript ,,,,,,,,,,,,,,,,
 // filtroCompletoNB6 = Notch+BP+Detrend+Znorm (same order as notebook)
 if (!vigente()) return;
 const filtered = filtroCompletoNB6(rawSignal, 360);

 // R-peak detection on filtered signal
 const rPeaks = findRPeaks(filtered);

 // Beat segmentation: try fixed-window (NB6 style) first
 let finalBeats: number[][] = [];
 let finalRR: number[] = [];
 const fw = segmentBeatsFixedWindow(filtered, rPeaks);
 if (fw.beats.length >= NB6_CONFIG.lookback + NB6_CONFIG.horizon) {
 finalBeats = fw.beats;
 finalRR = fw.rrIntervals;
 } else {
 // Fall back to midpoint segmentation if too few beats with fixed window
 const mp = segmentBeatsMidpoint(filtered, rPeaks);
 finalBeats = mp.beats;
 finalRR = mp.rrIntervals;
 }

 setNormalizedBeats(finalBeats);
 setRPeaksSenal(rPeaks);
 setRrPerBeat(finalRR);
 setBeatsLoaded(finalBeats.length);
 setBeatMu(0);
 setBeatStd(1);
 setSignalStore({
 patientId: demoPatient,
 lead: "MLII",
 values: filtered,
 timestamps: filtered.map((_, i) => i / 360),
 annotations: [],
 });
 setUseSimMode(true); // confirmed offline — show SIMULATION badge
 } catch (err) {
 if (!vigente()) return;
 setLopoError(err instanceof Error ? err.message : "Error cargando señal");
 } finally {
 // Solo la carga vigente apaga el indicador: si lo apagara una carga vieja,
 // la nueva pareceria terminada antes de estarlo.
 if (vigente()) setIsLoading(false);
 }
  }, [demoPatient, patientGroup, setSignalStore]);

  // Load on mount and when patient changes
  useEffect(() => {
 loadSignal();
  }, [loadSignal]);

  // 
  // Prospective prediction engine
  // 
  const stopPrediction = useCallback(() => {
 setIsRunning(false);
 if (animationRef.current) {
 clearTimeout(animationRef.current as number);
 cancelAnimationFrame(animationRef.current as number);
 }
  }, []);

  /** Continua el analisis desde donde se quedo. No borra nada: para eso esta reiniciar. */
  const startPrediction = useCallback(() => {
 if (normalizedBeats.length < NB6_CONFIG.lookback + NB6_CONFIG.horizon + 2)
 return;
 setParadoPorAlarma(false);
 setLopoError(null);
 setIsRunning(true);
  }, [normalizedBeats]);

  /** Vuelve al principio del registro y vacia la tabla. */
  const reiniciarAnalisis = useCallback(() => {
 setIsRunning(false);
 marcoRef.current = 0;
 setCurrentFrame(0);
 setMetricsHistory([]);
 setR2ByStep([[], [], []]);
 setEvaluados([]);
 setPasos([]);
 setLatidosMarco([]);
 setParadoPorAlarma(false);
 setLopoError(null);
  }, []);

  // Animation loop — advances HORIZON=3 positions per frame
  useEffect(() => {
 if (!isRunning || normalizedBeats.length === 0) return;

 // Reanuda donde se quedo. Antes empezaba siempre en cero, asi que «continuar»
 // volvia a analizar los mismos latidos.
 let frame = marcoRef.current;
 let active = true;
 // El indicador de simulacion se enganchaba: bastaba un fallo puntual para que
 // toda la sesion siguiera rotulada como «simulacion local» aunque las cifras
 // vinieran del modelo real. Si el servicio respondio al cargar la senal, cada
 // pasada vuelve a intentarlo; solo si falla otra vez se cae a la simulacion.
 let simMode = useSimMode && apiOnline !== true;
 const HORIZON = NB6_CONFIG.horizon; // 3
 const LB = NB6_CONFIG.lookback; // 5

 const frameInterval = async () => {
 if (!active) return;
 // Se declara aqui para que el final de la pasada sepa si hubo alarma.
 let hayAlarma = false;

 // Max frames so we don't go past end of signal
 const maxFrames = Math.floor(
 (normalizedBeats.length - LB - HORIZON) / HORIZON,
 );
 if (frame >= maxFrames) {
 setIsRunning(false);
 return;
 }

 const ctxStart = frame * HORIZON;
 const ctxBeats = normalizedBeats.slice(ctxStart, ctxStart + LB);
 const realFuture = normalizedBeats.slice(
 ctxStart + LB,
 ctxStart + LB + HORIZON,
 );

 let predictedBeats: number[][];
  let latencyMs = 0;
  let serverMs: number | null = null;
  let inferenceMs: number | null = null;

 if (!simMode) {
 try {
 const t0 = performance.now();
 const rrCtx = Array.from({ length: LB }, (_, j) => {
 const idx = ctxStart + j;
 return idx < rrPerBeat.length
 ? rrPerBeat[idx]
 : NB6_CONFIG.rrMuGlobal;
 });
 const result = await api.predictLopo({
 beats: ctxBeats,
 lookback: LB,
 beat_mu: beatMu ?? null,
 beat_std: beatStd ?? null,
 rr_per_beat: rrCtx,
 });
 latencyMs = performance.now() - t0;
        serverMs = result.processing_time_ms ?? null;
        inferenceMs = result.inference_ms ?? null;
 // NB6: result.predicted_beats has 3 beats; fallback to predicted_beat
 predictedBeats =
 result.predicted_beats?.length > 0
 ? result.predicted_beats
 : [result.predicted_beat];
 } catch {
 predictedBeats = simulateNB6(ctxBeats, HORIZON);
 simMode = true;
 setUseSimMode(true);
 }
 } else {
 predictedBeats = simulateNB6(ctxBeats, HORIZON);
 // En modo simulacion no hay latencia que medir: antes se inventaba con Math.random().
        latencyMs = 0;
 }

 if (!active) return;

 // ,, Per-horizon metrics ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
 const nCmp = Math.min(predictedBeats.length, realFuture.length);
 const r2_t: number[] = [],
 rmse_t: number[] = [],
 mae_t: number[] = [],
 dtw_t: number[] = [];
 const slopeArr: number[] = [],
 ampArr: number[] = [],
 shapeArr: number[] = [];

 for (let h = 0; h < nCmp; h++) {
 r2_t.push(r2Score(realFuture[h], predictedBeats[h]));
 rmse_t.push(rmseScore(realFuture[h], predictedBeats[h]));
 mae_t.push(maeScore(realFuture[h], predictedBeats[h]));
 // DTW downsampled by 2 (128 samples total) for speed while covering the full beat (including T-wave)
 dtw_t.push(
 dtwDistance(
 realFuture[h].filter((_, i) => i % 2 === 0),
 predictedBeats[h].filter((_, i) => i % 2 === 0),
 ),
 );
 slopeArr.push(slopeMSE(realFuture[h], predictedBeats[h]));
 ampArr.push(ampError(realFuture[h], predictedBeats[h]));
 shapeArr.push(shapeCorrelation(realFuture[h], predictedBeats[h]));
 }

 const avg = (arr: number[]) =>
 arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
 // Forecast_Score — exact formula from calcular_metricas() in notebook:
 // 0.40*R2_t1 + 0.25*R2_t2 + 0.15*R2_t3 + 0.10*ShapeCorr
 // + 0.05*(1/(1+Slope_MSE)) + 0.05*(1/(1+Amp_Error))
 const slopeMseGlobal = avg(slopeArr);
 const ampErrGlobal = avg(ampArr);
 const shapeCorrGlobal = avg(shapeArr);
 const forecastScoreVal =
 nCmp >= 3
 ? 0.4 * r2_t[0] +
 0.25 * r2_t[1] +
 0.15 * r2_t[2] +
 0.1 * shapeCorrGlobal +
 0.05 * (1 / (1 + slopeMseGlobal)) +
 0.05 * (1 / (1 + ampErrGlobal))
 : avg(r2_t);

 const newMetric: LopoMetrics = {
 frame,
 latencyMs, serverMs,
 inferenceMs,

 r2: avg(r2_t),
 r2_t1: r2_t[0] ?? 0,
 r2_t2: r2_t[1] ?? 0,
 r2_t3: r2_t[2] ?? 0,
 rmse: avg(rmse_t),
 mae: avg(mae_t),
 dtw: avg(dtw_t),
 dtw_t,
 shapeCorr: avg(shapeArr),
 slopeMse: avg(slopeArr),
 ampError: avg(ampArr),
 forecastScore: forecastScoreVal,
 };
 // ── Deteccion: el residuo de cada latido frente al umbral ──────────
 // El MSE es el RMSE al cuadrado; no hace falta recorrer las muestras otra vez.
 // El latido comparado en el horizonte h es el de indice ctxStart + LB + h, y esa
 // es la clave para buscar su etiqueta.
 if (umbralRef.current !== null) {
 const nuevos: LatidoEvaluado[] = [];
 for (let h = 0; h < nCmp; h++) {
 const indice = ctxStart + LB + h;
 const mse = rmse_t[h] * rmse_t[h];
 const clase = clasesRef.current[indice] ?? null;
 // La clase Q —marcapasos o no clasificable— queda fuera de la evaluacion,
 // como en el experimento 8. No es ni normal ni ectopica: contarla como
 // normal dispara los falsos positivos en los registros marcapaseados, que
 // son justo donde la pagina imprime al lado la referencia del experimento.
 const evaluable = clase !== null && clase !== "Q";
 nuevos.push({
 indice,
 horizonte: h,
 mse,
 marcado: mse >= umbralRef.current,
 clase,
 ectopico: evaluable ? esEctopica(clase) : null,
 excluido: clase === "Q",
 });
 }
 setEvaluados((prev) => [...prev, ...nuevos]);
 setLatidosMarco(nuevos);

 // ¿Hubo alarma en ESTE analisis? Es lo que decide si se sigue o se para.
 hayAlarma = nuevos.some((x) => x.marcado && !x.excluido);

 // La fila de la tabla. Un analisis, una fila.
 const evaluables = nuevos.filter((x) => !x.excluido);
 const ectopico = evaluables.some((x) => x.ectopico === true);
 const conEtiqueta = evaluables.some((x) => x.ectopico !== null);
 const veredicto: PasoAnalisis["veredicto"] = !conEtiqueta
 ? "sin etiqueta"
 : hayAlarma && ectopico ? "VP"
 : hayAlarma && !ectopico ? "FP"
 : !hayAlarma && ectopico ? "FN"
 : "VN";
 // El pico R del primer latido predicho da el segundo del registro. El
 // desfase de 1 es el latido guarda que la segmentacion descarta al principio.
 const pico = picosRef.current[ctxStart + LB + 1];
 setPasos((prev) => [...prev, {
 paso: prev.length + 1,
 indiceInicial: ctxStart + LB,
 segundo: pico === undefined ? null : pico / 360,
 mseMax: Math.max(...nuevos.map((x) => x.mse)),
 umbral: umbralRef.current,
 alarma: hayAlarma,
 clases: nuevos.map((x) => x.clase),
 veredicto,
 r2: avg(r2_t),
 }]);
 }

 setMetricsHistory((prev) => [...prev, newMetric]);
 setR2ByStep((prev) => {
 const combined = prev.map((a) => [...a]);
 r2_t.forEach((v, i) => {
 if (!combined[i]) combined[i] = [];
 combined[i].push(v);
 });
 return combined;
 });

 // Update current display
 setCurrentCtxBeats([...ctxBeats]);
 setCurrentPredBeats([...predictedBeats]);
 setCurrentRealFuture([...realFuture]);

 frame += 1;
 marcoRef.current = frame;
 setCurrentFrame(frame);
 if (!active) return;

 // Aqui esta el cambio de fondo: el bucle ya no encadena a ciegas.
 //  - En modo «paso» se detiene siempre: un analisis y para.
 //  - En modo «serie» encadena, pero se para en cuanto hay una alarma, que
 //    es justo el momento en que hay algo que mirar.
 if (modoRef.current === "paso" || hayAlarma) {
 setIsRunning(false);
 setParadoPorAlarma(hayAlarma);
 return;
 }

 const vel = speedRef.current;
 if (autoAnimate && vel > 0) {
 animationRef.current = window.setTimeout(
 frameInterval,
 vel * 1000,
 ) as unknown as number;
 } else {
 animationRef.current = requestAnimationFrame(frameInterval);
 }
 };

 frameInterval();
 return () => {
 active = false;
 clearTimeout(animationRef.current as number);
 cancelAnimationFrame(animationRef.current as number);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, normalizedBeats]);


  // 
  // Computed chart data
  // 
  const liveChartData = useMemo(() => {
 const BL = NB6_CONFIG.beatLen;
 const FS = 360;
 const ctx =
 currentCtxBeats.length > 0
 ? currentCtxBeats
 : normalizedBeats.slice(-NB6_CONFIG.lookback);
 const preds = currentPredBeats;
 const real = currentRealFuture;

 if (ctx.length === 0) {
 return { ctxSamples: [], ctxTime: [], predTraces: [], realFutureTraces: [] };
 }

 const ctxSamples: number[] = ctx.flat();
 const ctxTime = ctxSamples.map((_, i) => i / FS);

 const predTraces = preds.slice(0, 3).map((beat, h) => {
 const offset = (ctx.length * BL) / FS;
 return {
 x: beat.map((_, i) => offset + (h * BL + i) / FS),
 y: beat,
 color: H_COLORS[h],
 fill: H_FILL[h],
 label: H_LABELS[h],
 };
 });

 const realFutureTraces = real.slice(0, 3).map((beat, h) => {
 const offset = (ctx.length * BL) / FS;
 return {
 x: beat.map((_, i) => offset + (h * BL + i) / FS),
 y: beat,
 };
 });

 return { ctxSamples, ctxTime, predTraces, realFutureTraces };
  }, [currentCtxBeats, currentPredBeats, currentRealFuture, normalizedBeats]);



  const r2HistData = useMemo(
 () => ({
 frames: metricsHistory.map((m) => m.frame),
 r2_t1: metricsHistory.map((m) => m.r2_t1),
 r2_t2: metricsHistory.map((m) => m.r2_t2),
 r2_t3: metricsHistory.map((m) => m.r2_t3),
 dtw: metricsHistory.map((m) => m.dtw),
 }),
 [metricsHistory],
  );

  const lastMetric =
 metricsHistory.length > 0
 ? metricsHistory[metricsHistory.length - 1]
 : null;
  const avgR2 =
 metricsHistory.length > 0
 ? metricsHistory.reduce((s, m) => s + m.r2, 0) / metricsHistory.length
 : null;

  const hasPred = currentPredBeats.length > 0;
  const hasSignal =
 normalizedBeats.length >= NB6_CONFIG.lookback + NB6_CONFIG.horizon;

  // 
  // Color helpers
  // 
  const r2Color = (v: number | null) =>
 v === null
 ? "var(--text-muted)"
 : v >= 0.8
 ? "var(--ok)"
 : v >= 0.6
 ? "var(--ok)"
 : v >= 0.4
 ? "var(--warn)"
 : v >= 0.2
 ? "var(--warn)"
 : "var(--crit)";

  const dtwColor = (v: number | null) =>
 v === null
 ? "var(--text-muted)"
 : v < 0.02
 ? "var(--ok)"
 : v < 0.06
 ? "var(--ok)"
 : v < 0.12
 ? "var(--warn)"
 : v < 0.2
 ? "var(--warn)"
 : "var(--crit)";

  const cardBg = "var(--glass-bg)";
  const border = "var(--border)";
  const textPri = "var(--text)";
  const textSec = "var(--text-sub)";

  // 
  // Render
  // 
  return (
 <PageWrapper>
 <div
 style={{
 padding: "24px 28px",
 fontFamily: "'Inter', 'Barlow Condensed', sans-serif",
 }}
 >
 {/* ,, Header ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 <div
 style={{
 display: "flex",
 alignItems: "center",
 justifyContent: "space-between",
 marginBottom: 24,
 flexWrap: "wrap",
 gap: 12,
 }}
 >
 <div>
 <h1
 style={{
 margin: 0,
 fontSize: 22,
 fontWeight: 700,
 color: textPri,
 display: "flex",
 alignItems: "center",
 gap: 10,
 }}
 >
 <Activity size={22} color="var(--ok)" />
 {t(
 "Predicción Cross-Patient Multi-Step",
 "Cross-Patient Multi-Step Prediction",
 )}
 </h1>
 <p style={{ margin: "4px 0 0", fontSize: 13, color: textSec }}>
 {t(
 "Modelo CNN_GRU_ATTN · HORIZON=3 · 123 pacientes (MIT-BIH + INCART)",
 "Model CNN_GRU_ATTN · HORIZON=3 · 123 patients (MIT-BIH + INCART)",
 )}
 </p>
 </div>
 {/* Model badge */}
 <div
 style={{
 display: "flex",
 gap: 8,
 flexWrap: "wrap",
 alignItems: "center",
 }}
 >
 {[
 { label: "CNN_GRU_ATTN", color: "var(--ok)" },
 { label: `R²=${ref.r2.toFixed(4)}`, color: "var(--accent)" },
 { label: "DTW Priority", color: "var(--cat-4)" },
 { label: "NB6", color: "var(--crit)" },
 ].map((b) => (
 <span
 key={b.label}
 style={{
 padding: "3px 10px",
 borderRadius: 4,
 fontSize: 11,
 fontWeight: 700,
 background: b.color + "22",
 color: b.color,
 border: `1px solid ${b.color}55`,
 letterSpacing: "0.5px",
 }}
 >
 {b.label}
 </span>
 ))}
 {/* API status badge */}
 <span
 style={{
 padding: "3px 10px",
 borderRadius: 4,
 fontSize: 11,
 fontWeight: 700,
 background:
 apiOnline === null
 ? "var(--border)"
 : apiOnline
 ? "var(--ok-tint)"
 : "var(--crit-tint)",
 color:
 apiOnline === null
 ? "#888"
 : apiOnline
 ? "var(--ok)"
 : "var(--crit)",
 border: `1px solid ${apiOnline === null ? "var(--border)" : apiOnline ? "var(--ok-tint)" : "var(--crit-tint)"}`,
 display: "flex",
 alignItems: "center",
 gap: 5,
 }}
 >
 <span
 style={{
 width: 7,
 height: 7,
 borderRadius: "50%",
 background:
 apiOnline === null
 ? "#888"
 : apiOnline
 ? "var(--ok)"
 : "var(--crit)",
 animation: apiOnline === null ? "pulse 1s infinite" : "none",
 }}
 />
 {apiOnline === null
 ? despertando
 ? "Despertando el servicio…"
 : "Conectando…"
 : apiOnline
 ? "API en linea"
 : "API sin conexion"}
 </span>

 {useSimMode && (
 <span
 style={{
 padding: "3px 10px",
 borderRadius: 4,
 fontSize: 11,
 fontWeight: 600,
 background: "var(--warn-tint)",
 color: "var(--warn)",
 border: "1px solid #F39C1255",
 }}
 >
 DEMO LOCAL
 </span>
 )}
 </div>
 </div>

 {/* ,, API offline notice */}
 {apiOnline === false && (
 <div
 style={{
 padding: "12px 16px",
 borderRadius: 10,
 marginBottom: 14,
 background: "rgba(231,76,60,0.08)",
 border: "1px solid rgba(231,76,60,0.3)",
 display: "flex",
 gap: 12,
 alignItems: "flex-start",
 }}
 >
 <AlertTriangle size={18} aria-hidden style={{ color: "var(--alert)", flex: "none" }} />
 <div>
 <div
 style={{
 fontWeight: 700,
 color: "var(--crit)",
 fontSize: 13,
 marginBottom: 4,
 }}
 >
 API Backend no disponible, Modo demo local activo
 </div>
 <div style={{ color: textSec, fontSize: 12, lineHeight: 1.6 }}>
 Las señales se generan sintéticamente y las predicciones usan
 simulación local. Para usar el modelo real{" "}
 <strong>CNN_GRU_ATTN</strong>, inicia el backend:
 </div>
 <div
 style={{
 marginTop: 8,
 padding: "8px 12px",
 borderRadius: 6,
 background: "rgba(0,0,0,0.25)",
 fontFamily: "monospace",
 fontSize: 12,
 color: "var(--ok)",
 }}
 >
 cd "D:\FORECASTING ECG\FORECASTING ECG - Dashboard\ecg_forecast_api"
 <br />
 docker compose up api
 </div>
 <div style={{ color: textSec, fontSize: 11, marginTop: 6 }}>
 Luego recarga esta página · API disponible en{" "}
 <code>http://localhost:8000/api/health</code>
 </div>
 </div>
 </div>
 )}

 {/* ,, Quick Stats Row ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
        {/* Alcance del sistema. Va antes que ninguna cifra, a proposito. */}
        <div
          role="note"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--warn)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 14px",
            marginBottom: 16,
          }}
        >
          <Info size={15} aria-hidden style={{ color: "var(--warn)", flex: "none", marginTop: 2 }} />
          <div style={{ fontSize: "var(--fs-xs)", lineHeight: 1.6, color: "var(--text-sub)" }}>
            <strong style={{ color: "var(--text)" }}>
              {t(
                "Este sistema predice la morfología de la señal; no clasifica el evento arrítmico.",
                "This system predicts signal morphology; it does not classify the arrhythmic event.",
              )}
            </strong>{" "}
            {t(
              "Lo que se marca abajo como latido sospechoso sale de comparar el error de predicción con un umbral, no de un clasificador entrenado con etiquetas. Y lo que detecta es, sobre todo, ectopia VENTRICULAR: su error medio es 3.42 veces el de un latido normal, mientras que el de la supraventricular es 1.19 veces, casi invisible, porque ese latido usa la vía de conducción normal y apenas cambia de forma. No es un detector de uso clínico: su precisión mediana entre pacientes es 0.3123 y varía mucho de uno a otro.",
              "What is flagged below as a suspicious beat comes from comparing the prediction error against a threshold, not from a classifier trained on labels. And what it detects is mostly VENTRICULAR ectopy: its mean error is 3.42 times that of a normal beat, while supraventricular ectopy is 1.19 times, nearly invisible, because that beat uses the normal conduction pathway and barely changes shape. It is not a clinical detector: its median precision across patients is 0.3123 and varies widely.",
            )}
          </div>
        </div>

 {/* ,, Patient Selector ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 <div
 style={{
 background: cardBg,
 border: `1px solid ${border}`,
 borderRadius: 12,
 padding: 16,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 justifyContent: "space-between",
 cursor: "pointer",
 marginBottom: patientExpanded ? 12 : 0,
 }}
 onClick={() => setPatientExpanded((p) => !p)}
 onKeyDown={(e) => {
 // Era un <div onClick> sin papel ni foco: no habia forma de abrir el
 // selector con el teclado, y es el control principal de la pagina.
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 setPatientExpanded((v) => !v);
 }
 }}
 role="button"
 tabIndex={0}
 aria-expanded={patientExpanded}
 aria-label={t("Seleccionar paciente", "Select patient")}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 fontWeight: 600,
 fontSize: 13,
 color: textPri,
 }}
 >
 <Users size={15} />
 {t("Selección de Paciente", "Patient Selection")}, &nbsp;
 <span
 style={{
 color: patientGroup === "MITBIH" ? "var(--accent)" : "var(--cat-4)",
 }}
 >
 {patientGroup} · {demoPatient}
 </span>
 </div>
 {/* Este chevron es hermano del titulo del panel y esta pegado al
 AnimatePresence que abre y cierra la lista: justo el sitio donde el
 intercambio de tipos es mas delicado. Envoltorio fijo. */}
 <span style={{ display: "flex" }}>
 {patientExpanded ? (
 <ChevronUp size={16} color={textSec} />
 ) : (
 <ChevronDown size={16} color={textSec} />
 )}
 </span>
 </div>

 <AnimatePresence>
 {patientExpanded && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 exit={{ opacity: 0, height: 0 }}
 >
 {/* Group selector */}
 <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
 {(["MITBIH", "INCART"] as PatientGroup[]).map((g) => (
 <button
 key={g}
 onClick={() => {
 setPatientGroup(g);
 setDemoPatient(g === "MITBIH" ? "100" : "I01");
 }}
 aria-pressed={g === patientGroup}
 style={{
 // El seleccionado pintaba el fondo y el texto DEL MISMO color, asi que
 // el nombre de la base desaparecia. Ahora el fondo es la tinta suave del
 // acento y el texto conserva el color de lectura, como en el resto del
 // tablero.
 padding: "6px 16px",
 borderRadius: "var(--radius-sm)",
 border: `1px solid ${g === patientGroup ? "var(--accent-border)" : border}`,
 background: g === patientGroup ? "var(--accent-bg)" : "transparent",
 color: g === patientGroup ? "var(--text)" : textSec,
 cursor: "pointer",
 fontWeight: g === patientGroup ? 600 : 500,
 fontSize: 12,
 }}
 >
 {g === "MITBIH"
 ? `MIT-BIH (${API_AVAILABLE_MITBIH.size})`
 : `INCART (${API_AVAILABLE_INCART.size})`}
 </button>
 ))}
 </div>

 {/* Patient grid */}
 <div
 style={{
 display: "flex",
 flexWrap: "wrap",
 gap: 6,
 maxHeight: 160,
 overflowY: "auto",
 }}
 >
 {(patientGroup === "MITBIH"
 ? Array.from(API_AVAILABLE_MITBIH)
 : Array.from(API_AVAILABLE_INCART)
 ).map((pid) => {
 const available = true; // All mapped are available in API
 const selected = demoPatient === pid;
 const accent =
 patientGroup === "MITBIH" ? "var(--accent)" : "var(--cat-4)";
 return (
 <button
 key={pid}
 onClick={() => setDemoPatient(pid)}
 style={{
 padding: "4px 10px",
 borderRadius: 5,
 fontSize: 11,
 fontWeight: selected ? 700 : 400,
 border: `1px solid ${selected ? accent : border}`,
 background: selected
 ? accent + "33"
 : available
 ? "#27AE6011"
 : "transparent",
 color: selected
 ? accent
 : available
 ? "var(--ok)"
 : textSec,
 cursor: "pointer",
 position: "relative",
 }}
 >
 {pid}
 {available && !selected && (
 <span
 style={{
 position: "absolute",
 top: 1,
 right: 2,
 width: 5,
 height: 5,
 borderRadius: "50%",
 background: "var(--ok)",
 }}
 />
 )}
 </button>
 );
 })}
 </div>
 <div
 style={{
 marginTop: 10,
 display: "flex",
 gap: 16,
 fontSize: 11,
 color: textSec,
 }}
 >
 <span>
 <span
 style={{
 display: "inline-block",
 width: 8,
 height: 8,
 borderRadius: "50%",
 background: "var(--ok)",
 marginRight: 4,
 }}
 />
 API disponible
 </span>
 <span>
 <span
 style={{
 display: "inline-block",
 width: 8,
 height: 8,
 borderRadius: "50%",
 background: "var(--cat-4)",
 marginRight: 4,
 }}
 />
 INCART
 </span>
 </div>

 {/* Load button */}
 <button
 onClick={loadSignal}
 disabled={isLoading}
 style={{
 marginTop: 12,
 padding: "8px 20px",
 borderRadius: 8,
 border: "none",
 background: isLoading ? "#444" : "var(--ok)",
 color: "#fff",
 cursor: isLoading ? "not-allowed" : "pointer",
 fontWeight: 700,
 fontSize: 13,
 display: "flex",
 alignItems: "center",
 gap: 8,
 }}
 >
 {/* Tercer sitio con el mismo defecto: aqui el «icono» es el <span> que gira,
 no un icono de lucide, y por eso la primera busqueda no lo encontro. Al
 cambiar de paciente, isLoading intercambiaba <Signal> por <span> en la misma
 posicion de un fragmento sin key; React concilia por indice y tiene que
 insertar el elemento nuevo DELANTE del texto hermano. Envoltorio fijo: los
 hijos del boton son siempre dos y no hay hermano de referencia. */}
 <span style={{ display: "flex", width: 14, height: 14 }}>
 {isLoading ? (
 <span
 style={{
 width: 14,
 height: 14,
 border: "2px solid #fff",
 borderTopColor: "transparent",
 borderRadius: "50%",
 animation: "spin 0.8s linear infinite",
 }}
 />
 ) : (
 <Signal size={14} />
 )}
 </span>
 <span>{isLoading ? t("Cargando...", "Loading...") : t("Cargar Señal", "Load Signal")}</span>
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* ,, Mode & Controls ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 <div
 style={{
 display: "flex",
 gap: 12,
 marginBottom: 18,
 flexWrap: "wrap",
 alignItems: "center",
 }}
 >

 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 fontSize: 12,
 color: textSec,
 }}
 >
 <span>{t("Velocidad", "Speed")}:</span>
 <input
 type="range"
 aria-label={t("Velocidad de reproducción, segundos por marco", "Playback speed, seconds per frame")}
 min={0.1}
 max={3}
 step={0.1}
 value={speed}
 onChange={(e) => setSpeed(Number(e.target.value))}
 style={{ width: 90 }}
 />
 <span style={{ color: textPri, fontWeight: 600 }}>
 {speed.toFixed(1)}s
 </span>
 </div>


 {/* Play / Stop */}
 <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
 <div
 role="group"
 aria-label={t("Modo de análisis", "Analysis mode")}
 style={{ display: "flex", gap: 4, marginRight: 4 }}
 >
 {([
 ["paso", t("Uno a uno", "One by one")],
 ["serie", t("Hasta la alarma", "Until alarm")],
 ] as const).map(([k, etiqueta]) => (
 <button
 key={k}
 onClick={() => setModoAnalisis(k)}
 aria-pressed={modoAnalisis === k}
 title={k === "paso"
 ? t("Cada pulsación analiza un latido y se detiene",
 "Each click analyses one beat and stops")
 : t("Encadena análisis y se detiene en cuanto hay una alarma",
 "Chains analyses and stops as soon as there is an alarm")}
 style={{
 padding: "6px 12px",
 borderRadius: "var(--radius-sm)",
 border: `1px solid ${modoAnalisis === k ? "var(--accent-border)" : border}`,
 background: modoAnalisis === k ? "var(--accent-bg)" : "transparent",
 color: modoAnalisis === k ? "var(--text)" : textSec,
 fontSize: 12,
 fontWeight: modoAnalisis === k ? 600 : 500,
 cursor: "pointer",
 }}
 >
 {etiqueta}
 </button>
 ))}
 </div>
 <button
 onClick={isRunning ? stopPrediction : startPrediction}
 disabled={!hasSignal || isLoading}
 style={{
 padding: "8px 20px",
 borderRadius: 8,
 border: "none",
 background:
 !hasSignal || isLoading
 ? "#444"
 : isRunning
 ? "var(--crit)"
 : "var(--ok)",
 color: "#fff",
 cursor: !hasSignal || isLoading ? "not-allowed" : "pointer",
 fontWeight: 700,
 fontSize: 13,
 display: "flex",
 alignItems: "center",
 gap: 8,
 }}
 >
 {/* Mismo motivo que arriba: envoltorio fijo para el icono. Este era el
 boton donde el fallo se disparaba de verdad (Lopo.tsx:2520, <Pause>). */}
 <span style={{ display: "flex" }}>
 {isRunning ? <Pause size={14} /> : <Play size={14} />}
 </span>
 <span>
 {isRunning
 ? t("Detener", "Stop")
 : modoAnalisis === "paso"
 ? t("Analizar un latido", "Analyse one beat")
 : t("Analizar hasta la alarma", "Analyse until alarm")}
 </span>
 </button>
 <button
 onClick={() => {
 reiniciarAnalisis();
 setCurrentPredBeats([]);
 }}
 aria-label={t("Reiniciar el análisis desde el principio", "Restart the analysis from the beginning")}
 title={t("Reiniciar el análisis desde el principio", "Restart the analysis from the beginning")}
 style={{
 padding: "8px 14px",
 borderRadius: 8,
 border: `1px solid ${border}`,
 background: "transparent",
 color: textSec,
 cursor: "pointer",
 }}
 >
 <RotateCcw size={14} aria-hidden />
 </button>
 </div>
 </div>

 {/* ,, Error banner ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 {lopoError && (
 <div
 style={{
 padding: "10px 16px",
 background: "var(--crit-tint)",
 border: "1px solid #E74C3C55",
 borderRadius: 8,
 marginBottom: 16,
 display: "flex",
 alignItems: "center",
 gap: 8,
 fontSize: 12,
 color: "var(--crit)",
 }}
 >
 <AlertTriangle size={14} /> {lopoError}
 </div>
 )}

 {/* 
 PROSPECTIVO mode
 */}
 <>
        {/* Se detuvo porque encontro una alarma: se dice y se senala. */}
        {paradoPorAlarma && !isRunning && (
          <div
            role="status"
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--alert)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 14px",
              marginBottom: 14,
            }}
          >
            <AlertTriangle size={16} aria-hidden style={{ color: "var(--alert)", flex: "none", marginTop: 2 }} />
            <div style={{ fontSize: "var(--fs-xs)", lineHeight: 1.6, color: "var(--text-sub)" }}>
              <strong style={{ color: "var(--text)" }}>
                {t("El análisis se detuvo: hay una alarma.", "The analysis stopped: there is an alarm.")}
              </strong>{" "}
              {t(
                "El latido que la disparó está en rojo sobre la gráfica, con su error y su clase al pasar el ratón. Debajo, la fila de esta sesión.",
                "The beat that triggered it is in red on the chart, with its error and class on hover. Below, this session's row.",
              )}{" "}
              {latidosMarco.filter((x) => x.marcado && !x.excluido).map((x) => (
                <span key={x.indice} style={{ fontFamily: "var(--font-data)", color: "var(--text)" }}>
                  {t("latido", "beat")} #{x.indice} · t+{x.horizonte + 1} · MSE {x.mse.toFixed(4)}
                  {umbralUsado !== null ? ` ≥ ${umbralUsado.toFixed(4)}` : ""} ·{" "}
                  {t("clase anotada", "annotated class")}: {x.clase ?? t("sin etiqueta", "unlabelled")}{" "}
                </span>
              ))}
            </div>
          </div>
        )}

 {/* ,, Live ECG Chart: context + 3 predicted beats ,,,,,,,,, */}
 <div
 style={{
 background: cardBg,
 border: `1px solid ${border}`,
 borderRadius: 14,
 padding: 20,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 justifyContent: "space-between",
 marginBottom: 14,
 }}
 >
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <Signal size={16} color="var(--ok)" />
 <span
 style={{ fontWeight: 700, fontSize: 14, color: textPri }}
 >
 {t(
 "ECG en Vivo · Predicción Multi-Horizonte",
 "Live ECG · Multi-Horizon Prediction",
 )}
 </span>
 {isRunning && (
 <span
 style={{
 width: 8,
 height: 8,
 borderRadius: "50%",
 background: "var(--ok)",
 animation: "pulse 1s infinite",
 display: "inline-block",
 }}
 />
 )}
 </div>
 <div
 style={{
 display: "flex",
 gap: 12,
 fontSize: 11,
 color: textSec,
 flexWrap: "wrap",
 }}
 >
 <span
 style={{ display: "flex", alignItems: "center", gap: 4 }}
 >
 <span
 style={{
 width: 16,
 height: 2,
 background: "var(--accent)",
 display: "inline-block",
 }}
 />{" "}
 {t("Real", "Real")}
 </span>
 {H_LABELS.map((l, h) => (
 <span
 key={l}
 style={{ display: "flex", alignItems: "center", gap: 4 }}
 >
 <span
 style={{
 width: 16,
 height: 2,
 background: H_COLORS[h],
 display: "inline-block",
 }}
 />{" "}
 {l}
 </span>
 ))}
 <span
 style={{ display: "flex", alignItems: "center", gap: 4 }}
 >
 <span
 style={{
 width: 16,
 height: 2,
 background: "var(--text-muted)",
 borderTop: "1px dashed var(--text-muted)",
 display: "inline-block",
 }}
 />{" "}
 {t("Ground Truth", "Ground Truth")}
 </span>
 </div>
 </div>

<div key="live-ecg-chart-wrapper" style={{ position: "relative", minHeight: 240 }}>
  {!hasSignal && !isLoading ? (
  <div
 style={{
 height: 220,
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 color: textSec,
 fontSize: 13,
 }}
  >
 {isLoading
 ? t("Cargando señal…", "Loading signal…")
 : t(
 "No hay suficientes latidos para predecir. Prueba con otro paciente o vuelve a cargar la señal.",
 "Not enough beats to predict. Try another patient or reload the signal.",
 )}
  </div>
) : liveChartData.ctxSamples.length > 0 ? (
  <PlotlyChart
 data={[
 // Context (real ECG)
 {
 type: "scatter",
 mode: "lines",
 x: liveChartData.ctxTime,
 y: liveChartData.ctxSamples,
 name: t("Real", "Real"),
 line: { color: "var(--accent)", width: 1.5 },
 hovertemplate:
 "t=%{x:.3f}s  v=%{y:.3f}<extra>Real</extra>",
 },
 // Predicted beats per horizon
 ...liveChartData.predTraces.map((tr, h) => ({
 type: "scatter",
 mode: "lines",
 x: tr.x,
 y: tr.y,
 name: latidosMarco[h]?.marcado
 ? `${H_LABELS[h]} · ${t("ALARMA", "ALARM")}`
 : H_LABELS[h],
 fill: "tozeroy" as const,
 // El latido que supero el umbral se pinta en rojo y con relleno propio:
 // es lo que hay que poder senalar cuando alguien pregunta «¿cual fue?».
 fillcolor: latidosMarco[h]?.marcado ? "rgba(240,138,130,0.22)" : tr.fill,
 line: {
 color: latidosMarco[h]?.marcado ? "var(--alert)" : tr.color,
 width: latidosMarco[h]?.marcado ? 3.2 : 2 - h * 0.3,
 },
 hovertemplate: latidosMarco[h]
 ? `t=%{x:.3f}s  v=%{y:.3f}<extra>${H_LABELS[h]}<br>MSE ${latidosMarco[h].mse.toFixed(4)}`
 + `<br>${latidosMarco[h].marcado ? t("ALARMA", "ALARM") : t("sin alarma", "no alarm")}`
 + `<br>${t("clase", "class")}: ${latidosMarco[h].clase ?? "?"}</extra>`
 : `t=%{x:.3f}s  v=%{y:.3f}<extra>${H_LABELS[h]}</extra>`,
 })),
 // Real future (ground truth)
 ...liveChartData.realFutureTraces.map((tr, h) => ({
 type: "scatter",
 mode: "lines",
 x: tr.x,
 y: tr.y,
 name: `GT ${H_LABELS[h]}`,
 line: {
 color: "var(--text-muted)",
 width: 1,
 dash: "dash" as const,
 },
 hovertemplate: `t=%{x:.3f}s  v=%{y:.3f}<extra>GT ${H_LABELS[h]}</extra>`,
 })),
 ]}
 layout={{
 height: 420,
 paper_bgcolor: pBg,
 plot_bgcolor: pBg,
 margin: { l: 45, r: 12, t: 10, b: 36 },
 showlegend: false,
 xaxis: {
 title: {
 text: "Tiempo (s)",
 font: { size: 10, color: textSec },
 },
 gridcolor: pGrid,
 zerolinecolor: pGrid,
 tickfont: { size: 10, color: pTick },
 },
 yaxis: {
 title: {
 text: "Amplitud (z-score)",
 font: { size: 10, color: textSec },
 },
 gridcolor: pGrid,
 zerolinecolor: pGrid,
 tickfont: { size: 10, color: pTick },
 },
 // Separator line between context and predictions
 shapes: hasPred
 ? [
 {
 type: "line" as const,
 x0:
 (currentCtxBeats.length * NB6_CONFIG.beatLen) /
 360,
 x1:
 (currentCtxBeats.length * NB6_CONFIG.beatLen) /
 360,
 y0: 0,
 y1: 1,
 yref: "paper" as const,
 line: {
 color: "rgba(255,255,255,0.4)",
 width: 1.5,
 dash: "dot" as const,
 },
 },
 ]
 : [],
 annotations: hasPred
 ? [
 {
 x:
 (currentCtxBeats.length * NB6_CONFIG.beatLen) /
 360,
 y: 1,
 yref: "paper" as const,
 text: t("▼ Predicción", "▼ Prediction"),
 showarrow: false,
 font: {
 color: "var(--warn)",
 size: 9,
 family: "monospace",
 },
 },
 ]
 : [],
 }}
 config={{ displayModeBar: false, responsive: true }}
 />
 ) : (
 <div
 style={{
 height: 220,
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 color: textSec,
 fontSize: 13,
 }}
 >
 {t("Preparando gráfico...", "Preparing chart...")}
 </div>
 )}
</div>
 {/* Frame counter */}
 <div
 style={{
 marginTop: 8,
 fontSize: 11,
 color: textSec,
 textAlign: "right",
 }}
 >
 {t("Marco", "Frame")}: {currentFrame} ·{" "}
 {t("Latidos procesados", "Beats processed")}:{" "}
 {currentFrame * NB6_CONFIG.horizon} · {t("Modo", "Mode")}:{" "}
 {useSimMode ? "Simulación local" : "CNN_GRU_ATTN API"}
 </div>
 </div>


        {/* La tabla: un analisis, una fila. */}
        {pasos.length > 0 && (
          <div className="card" style={{ padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--fs-md)",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                {t("Análisis realizados", "Analyses performed")}
              </h3>
              <span style={{ fontFamily: "var(--font-data)", fontSize: "var(--fs-2xs)", color: "var(--text-muted)" }}>
                {pasos.length} · {pasos.filter((x) => x.alarma).length} {t("con alarma", "with alarm")}
              </span>
              <button
                onClick={() => descargarCsv(pasos)}
                style={{
                  marginLeft: "auto",
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${border}`,
                  background: "transparent",
                  color: textSec,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {t("Descargar CSV", "Download CSV")}
              </button>
            </div>
            <DataTable
              fuente={`${DIR_ANOTACIONES}/${demoPatient}.json + ${FUENTE_DETECCION_P4}`}
              caption={t(
                "Cada fila es un análisis: cinco latidos de contexto y tres predichos. El error mostrado es el mayor de los tres.",
                "Each row is one analysis: five context beats and three predicted. The error shown is the largest of the three.",
              )}
              maxHeight="320px"
              data={[...pasos].reverse() as unknown as Record<string, unknown>[]}
              columns={[
                { key: "paso", label: "#", align: "right" },
                { key: "indiceInicial", label: t("Latido", "Beat"), align: "right" },
                {
                  key: "segundo",
                  label: t("Segundo", "Second"),
                  align: "right",
                  render: (v) => (typeof v === "number" ? v.toFixed(1) : "—"),
                },
                {
                  key: "mseMax",
                  label: t("Error máx.", "Max error"),
                  align: "right",
                  render: (v) => (typeof v === "number" ? v.toFixed(4) : "—"),
                },
                {
                  key: "alarma",
                  label: t("Alarma", "Alarm"),
                  align: "center",
                  render: (v) =>
                    v ? (
                      <span style={{ color: "var(--alert)", fontWeight: 700 }}>
                        {t("SÍ", "YES")}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    ),
                },
                {
                  key: "clases",
                  label: t("Clases anotadas", "Annotated classes"),
                  render: (v) =>
                    Array.isArray(v) ? v.map((c) => c ?? "?").join(" · ") : "—",
                },
                {
                  key: "veredicto",
                  label: t("Veredicto", "Verdict"),
                  align: "center",
                  render: (v) => {
                    const c = v === "VP" ? "var(--ok)"
                      : v === "FP" ? "var(--warn)"
                      : v === "FN" ? "var(--alert)"
                      : "var(--text-muted)";
                    return <span style={{ color: c, fontWeight: 600 }}>{String(v)}</span>;
                  },
                },
                {
                  key: "r2",
                  label: "R²",
                  align: "right",
                  render: (v) => (typeof v === "number" ? v.toFixed(3) : "—"),
                },
              ]}
            />
          </div>
        )}

        {/* Deteccion sobre el residuo: lo que sustituye al panel de alertas muerto. */}
        {evaluados.length > 0 && (
          <div
            className="card"
            style={{ padding: "16px 18px", marginBottom: 16 }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-md)",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {t("Latidos marcados por el residuo", "Beats flagged by the residual")}
            </h3>
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: "var(--fs-xs)",
                lineHeight: 1.6,
                color: "var(--text-sub)",
                maxWidth: "78ch",
              }}
            >
              {t(
                `Se marca un latido cuando el error cuadrático medio entre el latido real y el predicho supera ${umbralUsado !== null ? umbralUsado.toFixed(4) : "—"}. Ese umbral sale del experimento 8, donde se calculó sobre los residuos de cincuenta modelos entrenados cada uno sin el paciente que evaluaban. El modelo que responde aquí vio a esos pacientes, así que sus errores son más bajos y el umbral marca de menos.`,
                `A beat is flagged when the mean squared error between the real and predicted beat exceeds ${umbralUsado !== null ? umbralUsado.toFixed(4) : "—"}. That threshold comes from experiment 8, where it was computed over the residuals of fifty models each trained without the patient it evaluated. The model answering here did see those patients, so its errors are lower and the threshold under-flags.`,
              )}
            </p>

            {/* Seis tarjetas en un solo renglon: rejilla de columnas fijas, no
                `auto-fill`, que a 1280 px dejaba una tarjeta huerfana en la
                segunda fila. Los cortes estan en globals.css (.kpi-fila). */}
            <div className="kpi-fila">
              <MetricStat
                densa
                etiqueta={t("Marcados", "Flagged")}
                valor={conteo.marcados}
                nota={t(
                  `de ${conteo.total} evaluados · ${((100 * conteo.marcados) / Math.max(1, conteo.total)).toFixed(1)} %`,
                  `of ${conteo.total} evaluated · ${((100 * conteo.marcados) / Math.max(1, conteo.total)).toFixed(1)} %`,
                )}
                n={conteo.total}
              />
              {conteo.conVerdad > 0 ? (
                <>
                  <MetricStat
                    densa
                    etiqueta={t("Aciertos (VP)", "Hits (TP)")}
                    valor={conteo.vp}
                    nota={t("ectópicos", "ectopic")}
                    estado={conteo.vp > 0 ? "bueno" : "neutro"}
                  />
                  {/* «Falsas alarmas (FP)» medía 142 px en una caja de 125 y se
                      cortaba: el componente pinta la etiqueta en una sola línea con
                      overflow oculto. La nota carga el significado. */}
                  <MetricStat
                    densa
                    etiqueta={t("Falsas (FP)", "False (FP)")}
                    valor={conteo.fp}
                    nota={t("normales marcados", "normal, flagged")}
                    estado={conteo.fp > conteo.vp ? "atencion" : "neutro"}
                  />
                  <MetricStat
                    densa
                    etiqueta={t("Perdidos (FN)", "Missed (FN)")}
                    valor={conteo.fn}
                    nota={t("sin marcar", "not flagged")}
                  />
                  <MetricStat
                    densa
                    etiqueta={t("Precisión", "Precision")}
                    valor={conteo.precision !== null ? conteo.precision.toFixed(3) : null}
                    referencia={
                      refPaciente
                        ? `${t("exp. 8", "exp. 8")}: ${refPaciente.precision.toFixed(3)}`
                        : undefined
                    }
                    n={conteo.marcados}
                  />
                  <MetricStat
                    densa
                    etiqueta={t("Exhaustividad", "Recall")}
                    valor={conteo.exhaustividad !== null ? conteo.exhaustividad.toFixed(3) : null}
                    referencia={
                      refPaciente
                        ? `${t("exp. 8", "exp. 8")}: ${refPaciente.exhaustividad.toFixed(3)}`
                        : undefined
                    }
                    n={conteo.vp + conteo.fn}
                  />
                </>
              ) : (
                <MetricStat
                  densa
                  etiqueta={t("Verdad de terreno", "Ground truth")}
                  valor={null}
                  nota={motivoEtiquetas ?? t("no disponible", "unavailable")}
                />
              )}
            </div>

            <div
              style={{
                marginTop: 10,
                fontFamily: "var(--font-data)",
                fontSize: "var(--fs-3xs)",
                color: "var(--text-muted)",
              }}
            >
              {t("Umbral", "Threshold")}: {FUENTE_DETECCION_P4}
              {" · "}
              {t("etiquetas", "labels")}: {DIR_ANOTACIONES}/{demoPatient}.json
              {refPaciente
                ? ` · ${t("este paciente sí está en la cohorte del experimento 8", "this patient is in the experiment 8 cohort")}`
                : ` · ${t("este paciente NO está entre los 46 con evidencia de detección", "this patient is NOT among the 46 with detection evidence")}`}
              {/* La exclusión de la clase Q es una salvedad, no un indicador: su sitio
                  es el pie, no una tarjeta que solo aparece en tres pacientes. */}
              {conteo.excluidos > 0
                ? ` · ${conteo.excluidos} ${t("latidos de clase Q excluidos de la evaluación (marcapasos o no clasificables), como en el experimento 8", "class Q beats excluded from the evaluation (paced or unclassifiable), as in experiment 8")}`
                : ""}
            </div>

          </div>
        )}

 {/* ,, Per-Horizon Metric Cards ,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
 gap: 14,
 marginBottom: 18,
 }}
 >
 {[0, 1, 2].map((h) => {
 const r2Ref = ref.r2PorHorizonte[h];
 const r2Cur = lastMetric
 ? [lastMetric.r2_t1, lastMetric.r2_t2, lastMetric.r2_t3][h]
 : null;
 const r2Avgs = r2ByStep[h];
 const r2Avg =
 r2Avgs.length > 0
 ? r2Avgs.reduce((a, b) => a + b, 0) / r2Avgs.length
 : null;
 const dtw = lastMetric?.dtw_t[h] ?? null;
 return (
 <div
 key={h}
 style={{
 background: cardBg,
 border: `2px solid ${H_COLORS[h]}44`,
 borderRadius: 12,
 padding: 16,
 }}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 justifyContent: "space-between",
 marginBottom: 10,
 }}
 >
 <span
 style={{
 fontSize: 12,
 fontWeight: 700,
 color: H_COLORS[h],
 }}
 >
 {H_LABELS[h]}
 </span>
 <span style={{ fontSize: 10, color: textSec }}>
 {t("Ref NB6", "Ref NB6")}: {r2Ref.toFixed(4)}
 </span>
 </div>
 {/* R² big display */}
 <div style={{ textAlign: "center", marginBottom: 10 }}>
 <div
 style={{
 fontSize: 32,
 fontWeight: 900,
 color: r2Color(r2Cur),
 lineHeight: 1,
 }}
 >
 {r2Cur !== null ? r2Cur.toFixed(3) : "—"}
 </div>
 <div
 style={{ fontSize: 10, color: textSec, marginTop: 2 }}
 >
 R² {H_LABELS[h]}
 </div>
 </div>
 {/* Progress bar vs reference */}
 {r2Cur !== null && (
 <div style={{ marginBottom: 8 }}>
 <div
 style={{
 background: "rgba(255,255,255,0.08)",
 borderRadius: 4,
 height: 6,
 overflow: "hidden",
 }}
 >
 <div
 style={{
 height: "100%",
 borderRadius: 4,
 background: H_COLORS[h],
 width: `${Math.max(0, Math.min(100, (r2Cur / 1) * 100))}%`,
 transition: "width 0.4s ease",
 }}
 />
 </div>
 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 fontSize: 10,
 color: textSec,
 marginTop: 2,
 }}
 >
 <span>0</span>
 <span style={{ color: H_COLORS[h] }}>
 {r2Ref.toFixed(2)}
 </span>
 <span>1</span>
 </div>
 </div>
 )}
 {/* DTW per horizon */}
 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 fontSize: 11,
 }}
 >
 <span style={{ color: textSec }}>DTW:</span>
 <span style={{ color: dtwColor(dtw), fontWeight: 700 }}>
 {dtw !== null ? dtw.toFixed(4) : "—"}
 </span>
 </div>
 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 fontSize: 11,
 marginTop: 4,
 }}
 >
 <span style={{ color: textSec }}>
 {t("R² promedio", "Avg R²")}:
 </span>
 <span style={{ color: r2Color(r2Avg), fontWeight: 600 }}>
 {r2Avg !== null ? r2Avg.toFixed(3) : "—"}
 </span>
 </div>
 </div>
 );
 })}
 </div>

 {/* ,, DTW Priority Panel ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 <div
 style={{
 background: cardBg,
 border: `2px solid #8E44AD55`,
 borderRadius: 14,
 padding: 20,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 14,
 }}
 >
 <Zap size={16} color="var(--cat-4)" />
 <span style={{ fontWeight: 700, fontSize: 14, color: textPri }}>
 {t(
 "DTW · Dynamic Time Warping (Prioridad)",
 "DTW · Dynamic Time Warping (Priority)",
 )}
 </span>
 <span style={{ fontSize: 11, color: textSec }}>
 ·{" "}
 {t(
 "Distancia morfológica normalizada",
 "Normalized morphological distance",
 )}
 </span>
 </div>
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
 gap: 14,
 }}
 >
 {/* Global DTW */}
 <div style={{ textAlign: "center" }}>
 <div
 style={{
 fontSize: 42,
 fontWeight: 900,
 color: dtwColor(lastMetric?.dtw ?? null),
 lineHeight: 1,
 }}
 >
 {lastMetric ? lastMetric.dtw.toFixed(4) : "—"}
 </div>
 <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
 {t(
 "DTW actual (promedio horizontes)",
 "Current DTW (avg horizons)",
 )}
 </div>
 </div>
 {/* DTW per horizon */}
 {[0, 1, 2].map((h) => (
 <div key={h} style={{ textAlign: "center" }}>
 <div
 style={{
 fontSize: 24,
 fontWeight: 800,
 color: dtwColor(lastMetric?.dtw_t[h] ?? null),
 lineHeight: 1,
 }}
 >
 {lastMetric?.dtw_t[h] !== undefined
 ? lastMetric.dtw_t[h].toFixed(4)
 : "—"}
 </div>
 <div
 style={{ fontSize: 11, color: H_COLORS[h], marginTop: 4 }}
 >
 DTW {H_LABELS[h]}
 </div>
 </div>
 ))}
 </div>

 {/* DTW history chart */}
 <div key="dtw-history-chart-wrapper">
 {r2HistData.frames.length > 1 && (
 <PlotlyChart
 data={[
 {
 type: "scatter",
 mode: "lines",
 x: r2HistData.frames,
 y: r2HistData.dtw,
 name: "DTW",
 fill: "tozeroy",
 fillcolor: "rgba(142,68,173,0.12)",
 line: { color: "var(--cat-4)", width: 2 },
 hovertemplate: "Marco %{x}: DTW=%{y:.4f}<extra></extra>",
 },
 ]}
 layout={{
 height: 120,
 paper_bgcolor: pBg,
 plot_bgcolor: pBg,
 margin: { l: 45, r: 10, t: 6, b: 30 },
 showlegend: false,
 xaxis: {
 gridcolor: pGrid,
 tickfont: { size: 9, color: pTick },
 },
 yaxis: {
 gridcolor: pGrid,
 tickfont: { size: 9, color: pTick },
 title: { text: "DTW", font: { size: 9, color: textSec } },
 },
 }}
 config={{ displayModeBar: false, responsive: true }}
 />
 )}
 </div>
 </div>

 {/* ,, Additional Metrics: Shape, Slope, Amp, ForecastScore , */}
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
 gap: 12,
 marginBottom: 18,
 }}
 >
 {[
 {
 label: "Shape Corr",
 value: lastMetric?.shapeCorr ?? null,
 ref: ref.shapeCorr,
 hi: true,
 fmt: (v: number) => v.toFixed(3),
 unit: "",
 },
 {
 label: "Slope MSE",
 value: lastMetric?.slopeMse ?? null,
      ref: 0.0223,
 hi: false,
 fmt: (v: number) => v.toFixed(4),
 unit: "",
 },
 {
 label: "Amp Error",
 value: lastMetric?.ampError ?? null,
      ref: 0.5653,
 hi: false,
 fmt: (v: number) => v.toFixed(3),
 unit: "",
 },
 {
 label: "Forecast Score",
 value: lastMetric?.forecastScore ?? null,
 ref: ref.forecastScore,
 hi: true,
 fmt: (v: number) => v.toFixed(3),
 unit: "",
 },
 {
 label: "RMSE",
 value: lastMetric?.rmse ?? null,
      ref: 0.5139,
 hi: false,
 fmt: (v: number) => v.toFixed(3),
 unit: "",
 },
 {
 label: "MAE",
 value: lastMetric?.mae ?? null,
      ref: 0.3178,
 hi: false,
 fmt: (v: number) => v.toFixed(3),
 unit: "",
 },
 {
 label: "R² Global",
 value: avgR2,
 ref: ref.r2,
 hi: true,
 fmt: (v: number) => v.toFixed(3),
 unit: "",
 },
 {
          // Latencia del MODELO, no de la red. El servidor cronometra solo la pasada
          // del modelo; si es un servidor antiguo que no la reporta, se cae al total
          // del servidor. La ida y vuelta completa se muestra aparte, porque depende
          // de donde este alojado el servicio y no dice nada del modelo.
          label: "Inferencia",
          value: lastMetric?.inferenceMs ?? lastMetric?.serverMs ?? null,
          // Referencia clinica: un intervalo RR medio de la cohorte (811 ms). La
          // prediccion debe estar lista antes de que llegue el siguiente latido.
          ref: NB6_CONFIG.rrMedioMs,
          hi: false,
          fmt: (v: number) => v.toFixed(1),
          unit: "ms",
        },
        {
          label: "Ida y vuelta",
          value: lastMetric?.latencyMs ?? null,
          ref: NB6_CONFIG.rrMedioMs,
          hi: false,
          fmt: (v: number) => v.toFixed(0),
          unit: "ms",
        },
 ].map((m) => {
 const good = m.hi
 ? m.value !== null && m.value >= m.ref
 : m.value !== null && m.value <= m.ref;
 const col =
 m.value === null ? textSec : good ? "var(--ok)" : "var(--warn)";
 return (
 <div
 key={m.label}
 style={{
 background: cardBg,
 border: `1px solid ${border}`,
 borderRadius: 10,
 padding: "12px 14px",
 textAlign: "center",
 }}
 >
 <div
 style={{
 fontSize: 10,
 color: textSec,
 textTransform: "uppercase",
 letterSpacing: "0.7px",
 marginBottom: 6,
 }}
 >
 {m.label}
 </div>
 <div style={{ fontSize: 22, fontWeight: 800, color: col }}>
 {m.value !== null ? m.fmt(m.value) + m.unit : "—"}
 </div>
 <div style={{ fontSize: 10, color: textSec, marginTop: 3 }}>
 {t("Ref", "Ref")}: {m.fmt(m.ref)}
 {m.unit}
 </div>
 </div>
 );
 })}
 </div>

 {/* ,, R² by Horizon History Chart ,,,,,,,,,,,,,,,,,,,,,,,,, */}
 {r2HistData.frames.length > 1 && (
 <div
 style={{
 background: cardBg,
 border: `1px solid ${border}`,
 borderRadius: 14,
 padding: 20,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 12,
 }}
 >
 <TrendingUp size={14} color="var(--ok)" />
 <span
 style={{ fontWeight: 700, fontSize: 13, color: textPri }}
 >
 {t(
 "R² por Horizonte · Historia de Sesión",
 "R² by Horizon · Session History",
 )}
 </span>
 </div>
 <PlotlyChart
 data={[0, 1, 2].map((h) => ({
 type: "scatter",
 mode: "lines",
 x: r2HistData.frames,
 y: [r2HistData.r2_t1, r2HistData.r2_t2, r2HistData.r2_t3][
 h
 ],
 name: H_LABELS[h],
 fill: "tozeroy",
 fillcolor: H_FILL[h],
 line: { color: H_COLORS[h], width: 2 - h * 0.3 },
 hovertemplate: `Marco %{x}: R²=${H_LABELS[h]}=%{y:.3f}<extra></extra>`,
 }))}
 layout={{
 height: 200,
 paper_bgcolor: pBg,
 plot_bgcolor: pBg,
 margin: { l: 50, r: 12, t: 10, b: 36 },
 showlegend: true,
 legend: {
 orientation: "h",
 x: 0,
 y: 1.15,
 font: { size: 10, color: textPri },
 bgcolor: "transparent",
 },
 xaxis: {
 title: {
 text: t("Marco", "Frame"),
 font: { size: 10, color: textSec },
 },
 gridcolor: pGrid,
 tickfont: { size: 10, color: pTick },
 },
 yaxis: {
 title: { text: "R²", font: { size: 10, color: textSec } },
 gridcolor: pGrid,
 tickfont: { size: 10, color: pTick },
 range: [-0.3, 1.05],
 },
 }}
 config={{ displayModeBar: false, responsive: true }}
 />

 {/* Reference bars for NB6 expected R² */}
 <div
 style={{
 display: "flex",
 gap: 16,
 marginTop: 10,
 flexWrap: "wrap",
 }}
 >
 {[0, 1, 2].map((h) => {
 const refH = ref.r2PorHorizonte[h];
 const avg =
 r2ByStep[h].length > 0
 ? r2ByStep[h].reduce((a, b) => a + b, 0) /
 r2ByStep[h].length
 : null;
 return (
 <div key={h} style={{ fontSize: 11, color: textSec }}>
 <span style={{ color: H_COLORS[h], fontWeight: 700 }}>
 {H_LABELS[h]}
 </span>{" "}
 ref={refH.toFixed(3)} · sesión=
 {avg !== null ? avg.toFixed(3) : "—"}
 {avg !== null && (
 <span
 style={{
 color: avg >= refH ? "var(--ok)" : "var(--warn)",
 marginLeft: 4,
 }}
 >
 ({avg >= refH ? t("cumple", "meets") : t("por debajo", "below")})
 </span>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 </>


 {/* ,, Model Info Footer ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 <div
 style={{
 background: cardBg,
 border: `1px solid ${border}`,
 borderRadius: 12,
 padding: 16,
 marginTop: 8,
 }}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 10,
 }}
 >
 <Info size={14} color={textSec} />
 <span style={{ fontWeight: 700, fontSize: 12, color: textPri }}>
 {t("Información del Modelo NB6", "NB6 Model Information")}
 </span>
 </div>
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
 gap: 8,
 }}
 >
 {[
 [
 t("Arquitectura", "Architecture"),
 "CNN_GRU_ATTN (Conv1D dilat. + GRU + TemporalAttention + Residual)",
 ],
 [
 t("Pérdida de entrenamiento", "Training loss"),
 "ECGLoss = 0.5·MSE + 0.3·MAE + 0.2·SlopeMSE",
 ],
 ["Input shape", t("(1, 5, 257) · 5 latidos × 256 ECG + 1 RR", "(1, 5, 257) · 5 beats × 256 ECG + 1 RR")],
 ["Output shape", t("(1, 3, 256) · 3 latidos × 256 muestras", "(1, 3, 256) · 3 beats × 256 samples")],
 [
 "Dataset",
 t("48 MIT-BIH (360 Hz) + 75 INCART (257 Hz) = 123 pacientes",
 "48 MIT-BIH (360 Hz) + 75 INCART (257 Hz) = 123 patients"),
 ],
 [
 t("Preprocesamiento de señal", "Signal preprocessing"),
 t("Notch 60 Hz → Butterworth BP 0.5-40 Hz (SOS) → Detrend lineal → Z-score global",
 "60 Hz notch → Butterworth BP 0.5-40 Hz (SOS) → linear detrend → global Z-score"),
 ],
 [
 t("Norm. por latido", "Per-beat norm."),
 t("Z-score por latido: (latido - μ) / σ  +  recorte(-5, 5)  · sin filtro de mediana",
         "Z-score per beat: (beat - μ) / σ  +  clip(-5, 5)  · no median filter"),
 ],
 [
 t("Segmentación", "Segmentation"),
 t("Ventana fija centrada en el pico R (PRE=92, POST=164, sin remuestreo)",
 "Fixed window centred on the R peak (PRE=92, POST=164, no resampling)"),
 ],
 [
 t("Gap train-test", "Train-test gap"),
 t(`${ref.gap.toFixed(4)} · R² de entrenamiento menos el de prueba`,
           `${ref.gap.toFixed(4)} · training R² minus test R²`),
 ],
 [t("Tamaño del modelo", "Model size"), "4.31 MB · CNN_GRU_ATTN_final_patched.keras"],
 ].map(([k, v]) => (
 <div key={k} style={{ fontSize: 11 }}>
 <span style={{ color: textSec }}>{k}: </span>
 <span style={{ color: textPri }}>{v}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 <style>{`
 @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
 @keyframes spin  { to{transform:rotate(360deg)} }
 `}</style>
 </PageWrapper>
  );
}

/* La barrera de error vive ahora en App.tsx, comun a las ocho paginas. */
export default LopoPage;

