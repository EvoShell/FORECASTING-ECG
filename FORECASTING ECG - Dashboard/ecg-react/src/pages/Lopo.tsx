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
  Bell,
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

// ── NB6 Model Configuration ────────────────────────────────────────
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
  ic95: [0.6237, 0.7231] as [number, number],
  nPacientes: 123,
  rrMuGlobal: 0.7758458256721497,
  rrStdGlobal: 0.23085200786590576,
  r2ByHorizon: [0.6833, 0.6765, 0.6604] as [number, number, number],
  shapeCorr: 0.8383,
  forecastScore: 0.7073,
  gapTrainTest: 0.0956,
  // Intervalo RR medio de la cohorte, de results/NB7/p2_resumen.json (0.811 s).
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
type PredictionMode = "prospectivo" | "futuro";
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

interface ClinicalAlert {
  beatIdx: number;
  timeSec: number;
  type: "morphology" | "flatline" | "amplitude" | "rhythm";
  severity: "critical" | "warning";
  message: string;
  value: number;
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
  const [patientGroup, setPatientGroup] = useState<PatientGroup>("MITBIH");
  const [demoPatient, setDemoPatient] = useState("100");
  const [patientExpanded, setPatientExpanded] = useState(false);

  // ,, Mode & playback ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  const [mode, setMode] = useState<PredictionMode>("prospectivo");
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
  const [showHolterGT, setShowHolterGT] = useState(true);

  // ,, Live Holter (Futuro) ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  const [liveStatus, setLiveStatus] = useState<"idle" | "real_playing" | "predicting" | "done">("idle");
  const [liveTimeSec, setLiveTimeSec] = useState(0);
  const [livePredSamples, setLivePredSamples] = useState<number[]>([]);
  const [liveStopSec, setLiveStopSec] = useState<number | null>(null);

  const [futureAlerts, setFutureAlerts] = useState<ClinicalAlert[]>([]);
  const [futureMetrics, setFutureMetrics] = useState<{
 morphR2: number[];
 dtw: number[];
 rmse: number[];
 forecastScore: number[];
 totalBeats: number;
 totalDuration: number;
  } | null>(null);

  const animationRef = useRef<number | ReturnType<typeof setTimeout>>(0);
  const holterRef = useRef({
 active: false,
 lastT: 0,
 timeSec: 0,
 stopSec: 0,
 predicting: false,
 ctxBeats: [] as number[][],
 generatedBeats: [] as number[][],
  });

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
 setFutureAlerts([]);
 setFutureMetrics(null);
 setLiveStatus("idle");
 setLiveTimeSec(0);
 setLivePredSamples([]);
 setLiveStopSec(null);
 holterRef.current.active = false;
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
      } catch {
        if (!vigente()) return;
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
    } catch {
      if (!vigente()) return;
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

  const startPrediction = useCallback(() => {
 if (normalizedBeats.length < NB6_CONFIG.lookback + NB6_CONFIG.horizon + 2)
 return;
 setIsRunning(true);
 setCurrentFrame(0);
 setMetricsHistory([]);
 setR2ByStep([[], [], []]);
 setLopoError(null);
  }, [normalizedBeats]);

  // Animation loop — advances HORIZON=3 positions per frame
  useEffect(() => {
 if (!isRunning || normalizedBeats.length === 0) return;

 let frame = 0;
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
 setCurrentFrame(frame);
 if (!active) return;
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
  // Live Holter Generation
  // 
  const startHolter = useCallback(() => {
 if (!signalStore?.values || signalStore?.values.length === 0) return;
 setLiveStatus("real_playing");
 setLiveTimeSec(0);
 setLiveStopSec(null);
 setLivePredSamples([]);
 setFutureAlerts([]);
 
 holterRef.current = {
 active: true,
 lastT: performance.now(),
 timeSec: 0,
 stopSec: 0,
 predicting: false,
 ctxBeats: [],
 generatedBeats: [],
 };

 const loop = (t: number) => {
 if (!holterRef.current.active) return;
 const dt = (t - holterRef.current.lastT) / 1000;
 holterRef.current.lastT = t;
 
 let nextTime = holterRef.current.timeSec + dt;
 
 // If predicting, don't advance past what's generated
 if (holterRef.current.predicting) {
 const FS = 360;
 const genTime = holterRef.current.stopSec + ((holterRef.current.generatedBeats.length * Math.round(NB6_CONFIG.rrMuGlobal * FS)) / FS);
 if (nextTime > genTime) {
 nextTime = genTime; // wait for model
 }
 } else {
 // Stop if we reach the end of real signal
 if (nextTime > signalStore?.values!.length / 360) {
 nextTime = signalStore?.values!.length / 360;
 holterRef.current.active = false;
 setLiveStatus("idle");
 }
 }
 
 holterRef.current.timeSec = nextTime;
 setLiveTimeSec(nextTime);
 
 if (holterRef.current.active) {
 animationRef.current = requestAnimationFrame(loop);
 }
 };
 
 animationRef.current = requestAnimationFrame(loop);
  }, [signalStore?.values]);

  const stopAndPredict = useCallback(async () => {
 if (liveStatus !== "real_playing" || !signalStore?.values) return;
 setLiveStatus("predicting");
 const stopSec = holterRef.current.timeSec;
 setLiveStopSec(stopSec);
 holterRef.current.stopSec = stopSec;
 holterRef.current.predicting = true;

 // Find closest context beats in normalizedBeats
 let accum = 0;
 let bIdx = 0;
 while (bIdx < rrPerBeat.length && accum + rrPerBeat[bIdx] < stopSec) {
 accum += rrPerBeat[bIdx];
 bIdx++;
 }
 const lookback = NB6_CONFIG.lookback;
 bIdx = Math.max(lookback, bIdx);
 
 let ctx = [...normalizedBeats.slice(bIdx - lookback, bIdx)];
 holterRef.current.ctxBeats = ctx;

 const maxGenBeats = 100; // Generate roughly ~1 min ahead
 let generated: number[][] = []
 // El indicador de simulacion se enganchaba: bastaba un fallo puntual para que
 // toda la sesion siguiera rotulada como «simulacion local» aunque las cifras
 // vinieran del modelo real. Si el servicio respondio al cargar la senal, cada
 // pasada vuelve a intentarlo; solo si falla otra vez se cae a la simulacion.
 let simMode = useSimMode && apiOnline !== true;
 
 try {
 while (holterRef.current.active && holterRef.current.predicting && generated.length < maxGenBeats) {
 let batch: number[][] = [];
 const HORIZON = NB6_CONFIG.horizon;
 const batchSize = Math.min(HORIZON, maxGenBeats - generated.length);
 
 if (!simMode) {
 try {
 const rrCtx = ctx.map((_, j) => {
 const idx = bIdx - lookback + j + generated.length;
 return idx < rrPerBeat.length ? rrPerBeat[idx] : NB6_CONFIG.rrMuGlobal;
 });
 const result = await api.predictLopo({
 beats: ctx.slice(-lookback),
 lookback,
 beat_mu: beatMu ?? null,
 beat_std: beatStd ?? null,
 rr_per_beat: rrCtx,
 });
 batch = result.predicted_beats?.length > 0 ? result.predicted_beats.slice(0, batchSize) : [result.predicted_beat];
 } catch {
 batch = simulateNB6(ctx, batchSize);
 simMode = true;
 setUseSimMode(true);
 }
 } else {
 batch = simulateNB6(ctx, batchSize);
 }
 
 for (let b = 0; b < batch.length; b++) {
 generated.push(batch[b]);
 ctx = [...ctx.slice(1), batch[b]];
 }
 
 holterRef.current.generatedBeats = [...generated];
 
 // Trigger an update so the overlap-add hook runs
 setLivePredSamples([...generated].flat()); // Temp array trigger
 
 // Artificial delay for smooth generation effect in sim mode or to yield event loop
 await new Promise(r => setTimeout(r, simMode ? 300 : 0));
 }
 } catch (e) {
 console.error("Holter Prediction Error", e);
 }
  }, [liveStatus, normalizedBeats, rrPerBeat, beatMu, beatStd, signalStore?.values, useSimMode]);

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

  const holterData = useMemo(() => {
 if (mode !== "futuro" || !signalStore?.values) return null;
 const FS = 360;
 const WINDOW_SEC = 10;
 const windowSamples = WINDOW_SEC * FS;
 
 // 1. Real trace
 const endRealSample = Math.floor((liveStopSec ?? liveTimeSec) * FS);
 const startRealSample = Math.max(0, endRealSample - windowSamples);
 
 const realSamples = signalStore?.values.slice(startRealSample, endRealSample);
 const realTimes = Array.from({ length: realSamples.length }, (_, i) => (startRealSample + i) / FS);
 
 // 2. Predicted trace
 let predTimes: number[] = [];
 let predSamples: number[] = [];
 let gtSamples: number[] = [];
 let gtTimes: number[] = [];
 
 if ((liveStatus === "predicting" || liveStatus === "done") && liveStopSec !== null && holterRef.current.generatedBeats.length > 0) {
 const genBeats = holterRef.current.generatedBeats;
 const beatLen = 256;
 const step = beatLen; // Continuous concatenation matches Prospective mode without dropping to zero
 const totalLen = (genBeats.length - 1) * step + beatLen;
 
 const samplesArr = new Float32Array(totalLen);
 const weights = new Float32Array(totalLen);

 for (let i = 0; i < genBeats.length; i++) {
 const beat = genBeats[i];
 const startIdx = i * step;

 for (let j = 0; j < beatLen; j++) {
 samplesArr[startIdx + j] += beat[j];
 weights[startIdx + j] += 1;
 }
 }

 const finalSamples = new Array(totalLen);
 for (let i = 0; i < totalLen; i++) {
 finalSamples[i] = weights[i] > 0 ? samplesArr[i] / weights[i] : 0;
 }
 
 // Only show up to current liveTimeSec
 const maxPredSampleIdx = Math.floor((liveTimeSec - liveStopSec) * FS);
 predSamples = finalSamples.slice(0, maxPredSampleIdx);
 predTimes = predSamples.map((_, i) => liveStopSec + (i / FS));

 // 3. Ground Truth comparison (Original signal in parallel)
 if (liveStatus === "predicting" || liveStatus === "done") {
 // We need to construct the GT from normalized beats using overlap-add
 // Find the starting beat index corresponding to liveStopSec
 let gtAccum = 0;
 let bIdx = 0;
 while (bIdx < rrPerBeat.length && gtAccum + rrPerBeat[bIdx] < liveStopSec!) {
 gtAccum += rrPerBeat[bIdx];
 bIdx++;
 }
 
 // Grab the actual future normalized beats
 const numGenBeats = holterRef.current.generatedBeats.length;
 const gtBeatsToUse = normalizedBeats.slice(bIdx, bIdx + numGenBeats);
 
 if (gtBeatsToUse.length > 0) {
 const gtTotalLen = (gtBeatsToUse.length - 1) * step + beatLen;
 
 const gtSamplesArr = new Float32Array(gtTotalLen);
 const gtWeights = new Float32Array(gtTotalLen);
 
 for (let i = 0; i < gtBeatsToUse.length; i++) {
 const beat = gtBeatsToUse[i];
 const startIdx = i * step;
 
 for (let j = 0; j < beatLen; j++) {
 gtSamplesArr[startIdx + j] += beat[j];
 gtWeights[startIdx + j] += 1;
 }
 }
 
 const gtFinalSamples = new Array(gtTotalLen);
 for (let i = 0; i < gtTotalLen; i++) {
 gtFinalSamples[i] = gtWeights[i] > 0 ? gtSamplesArr[i] / gtWeights[i] : 0;
 }
 
 const maxGTSampleIdx = Math.floor((liveTimeSec - liveStopSec!) * FS);
 gtSamples = gtFinalSamples.slice(0, maxGTSampleIdx);
 gtTimes = [...predTimes].slice(0, gtSamples.length);
 }
 }
 }
 
 // Combine arrays to respect the 10-second rolling window
 const totalVisibleSamples = realSamples.length + predSamples.length;
 if (totalVisibleSamples > windowSamples) {
 const overflow = totalVisibleSamples - windowSamples;
 if (overflow < realSamples.length) {
 realSamples.splice(0, overflow);
 realTimes.splice(0, overflow);
 } else {
 const origLen = realSamples.length;
 realSamples.splice(0, origLen);
 realTimes.splice(0, origLen);
 const predOverflow = overflow - origLen;
 predSamples.splice(0, predOverflow);
 predTimes.splice(0, predOverflow);
 // Adjust GT as well if needed
 if (gtSamples.length > 0) {
 gtSamples.splice(0, predOverflow);
 gtTimes.splice(0, predOverflow);
 }
 }
 }
 
 return { realTimes, realSamples, predTimes, predSamples, gtTimes, gtSamples };
  }, [mode, liveTimeSec, liveStatus, liveStopSec, livePredSamples, signalStore?.values, normalizedBeats]);

  // ,, Metrics Calculation for Holter ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  useEffect(() => {
 if (mode === "futuro" && (liveStatus === "predicting" || liveStatus === "done") && holterData && holterData.predSamples.length > 30) {
 const { predSamples, gtSamples } = holterData;
 
 // We only calculate if we have corresponding GT
 if (gtSamples.length > 10) {
 const r2 = r2Score(gtSamples, predSamples);
 // Este calculo recorria `gtSamples` entero indexando `predSamples`, que por
 // construccion tiene otra longitud: en cuanto el real era mas largo, el termino
 // sobrante restaba `undefined` y el RMSE salia NaN en pantalla. `rmseScore`, que
 // ya existia unas lineas mas arriba, recorta al minimo de las dos longitudes.
 const rmse = rmseScore(gtSamples, predSamples);
 
 // DTW is expensive, calculate on a window for performance
 let dtw = 0;
 const dtwWindow = 256;
 if (predSamples.length >= dtwWindow) {
 dtw = dtwDistance(
 gtSamples.slice(-dtwWindow),
 predSamples.slice(-dtwWindow)
 );
 }

 setFutureMetrics(prev => {
 const totalBeats = holterRef.current.generatedBeats.length;
 const totalDuration = liveTimeSec - (liveStopSec ?? 0);
 
 const newR2 = [...(prev?.morphR2 || []), r2].slice(-100);
 const newDTW = [...(prev?.dtw || []), dtw].slice(-100);
 const newRMSE = [...(prev?.rmse || []), rmse].slice(-100);
 
 return {
 morphR2: newR2,
 dtw: newDTW,
 rmse: newRMSE,
 forecastScore: newR2, // placeholder or logic
 totalBeats,
 totalDuration
 };
 });
 }
 } else if (liveStatus === "idle") {
 setFutureMetrics(null);
 }
  }, [mode, liveStatus, holterData?.predSamples.length]);

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
  const avgDtw =
 metricsHistory.length > 0
 ? metricsHistory.reduce((s, m) => s + m.dtw, 0) / metricsHistory.length
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
 { label: "R²=0.6734", color: "var(--accent)" },
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
 <span style={{ fontSize: 20 }}>🔴</span>
 <div>
 <div
 style={{
 fontWeight: 700,
 color: "var(--crit)",
 fontSize: 13,
 marginBottom: 4,
 }}
 >
 API Backend no disponible — Modo demo local activo
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

 {/* ,, Duración Status ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 {(avgR2 !== null || futureMetrics !== null) && (
 <div
 style={{
 padding: "8px 14px",
 borderRadius: 8,
 marginBottom: 14,
 background: "rgba(142,68,173,0.08)",
 border: "1px solid rgba(142,68,173,0.25)",
 display: "flex",
 gap: 10,
 alignItems: "center",
 fontSize: 12,
 }}
 >
 <span style={{ fontSize: 16 }}>⏱</span>
 <span style={{ color: "var(--cat-4)", fontWeight: 700 }}>
 {mode === "prospectivo" 
 ? `Predicción simulada por ${(currentFrame * NB6_CONFIG.rrMuGlobal).toFixed(2)} segundos (${currentFrame} saltos)`
 : futureMetrics 
 ? `Señal generada: ${(futureMetrics.totalDuration / 60).toFixed(2)} mins (${futureMetrics.totalBeats} latidos)`
 : "Simulando..."}
 </span>
 </div>
 )}

 {/* ,, Beats loaded indicator */}
 {beatsLoaded > 0 && (
 <div
 style={{
 padding: "8px 14px",
 borderRadius: 8,
 marginBottom: 14,
 background: "rgba(39,174,96,0.08)",
 border: "1px solid rgba(39,174,96,0.25)",
 display: "flex",
 gap: 10,
 alignItems: "center",
 fontSize: 12,
 }}
 >
 <span style={{ fontSize: 16 }}>✓</span>
 <span style={{ color: "var(--ok)", fontWeight: 700 }}>
 {beatsLoaded} latidos cargados
 </span>
 <span style={{ color: textSec }}>
 · Paciente {demoPatient} · {patientGroup} · Preprocesamiento:{" "}
 {apiOnline
 ? "API (F_NB6 backend)"
 : "JS local (Notch+BP+Detrend+Znorm)"}
 </span>
 </div>
 )}

 {/* ,, Quick Stats Row ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, */}
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
 gap: 10,
 marginBottom: 20,
 }}
 >
 {[
 {
    label: "R² Medio LOPO",
    value: "0.6734",
    sub: "IC95: [0.624, 0.723]",
 color: "var(--ok)",
 },
 {
 label: "Horizonte",
 value: "3 latidos",
 sub: "t+1  t+2  t+3",
 color: "var(--accent)",
 },
 {
 label: "Pacientes",
 value: "123",
 sub: "48 MIT-BIH + 75 INCART",
 color: "var(--cat-4)",
 },
 {
 label: "Gap train-test",
    value: "0.0956",
    sub: "Mejor del proyecto",
 color: "var(--ok)",
 },
 {
 label: "Shape Corr",
    value: "0.8383",
 sub: "Fidelidad morfológica",
 color: "var(--ok)",
 },
 {
 label: "Forecast Score",
    value: "0.7073",
 sub: "Métrica compuesta",
 color: "var(--warn)",
 },
 ].map((s) => (
 <div
 key={s.label}
 style={{
 background: cardBg,
 border: `1px solid ${border}`,
 borderRadius: 10,
 padding: "12px 14px",
 }}
 >
 <div
 style={{
 fontSize: 10,
 color: textSec,
 textTransform: "uppercase",
 letterSpacing: "0.8px",
 marginBottom: 4,
 }}
 >
 {s.label}
 </div>
 <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
 {s.value}
 </div>
 <div style={{ fontSize: 10, color: textSec, marginTop: 2 }}>
 {s.sub}
 </div>
 </div>
 ))}
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
 {t("Selección de Paciente", "Patient Selection")} —&nbsp;
 <span
 style={{
 color: patientGroup === "MITBIH" ? "var(--accent)" : "var(--cat-4)",
 }}
 >
 {patientGroup} · {demoPatient}
 </span>
 </div>
 {patientExpanded ? (
 <ChevronUp size={16} color={textSec} />
 ) : (
 <ChevronDown size={16} color={textSec} />
 )}
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
 style={{
 padding: "6px 16px",
 borderRadius: 6,
 border: `1px solid ${g === patientGroup ? (g === "MITBIH" ? "var(--accent)" : "var(--cat-4)") : border}`,
 background:
 g === patientGroup
 ? g === "MITBIH"
 ? "var(--accent)"
 : "var(--cat-4)"
 : "transparent",
 color:
 g === patientGroup
 ? g === "MITBIH"
 ? "var(--accent)"
 : "var(--cat-4)"
 : textSec,
 cursor: "pointer",
 fontWeight: 600,
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
 INCART (demo)
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
 {isLoading ? (
 <>
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
 {t("Cargando...", "Loading...")}
 </>
 ) : (
 <>
 <Signal size={14} />
 {t("Cargar Señal", "Load Signal")}
 </>
 )}
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
 {/* Mode toggle */}
 {(["prospectivo", "futuro"] as PredictionMode[]).map((m) => (
 <button
 key={m}
 onClick={() => {
 setMode(m);
 stopPrediction();
 }}
 style={{
 padding: "7px 18px",
 borderRadius: 8,
 border: `1px solid ${mode === m ? "var(--ok)" : border}`,
 background: mode === m ? "var(--ok-tint)" : "transparent",
 color: mode === m ? "var(--ok)" : textSec,
 cursor: "pointer",
 fontWeight: 600,
 fontSize: 12,
 display: "flex",
 alignItems: "center",
 gap: 6,
 }}
 >
 {m === "prospectivo" ? (
 <>
 <TrendingUp size={13} />
 {t("Prospectivo", "Prospective")}
 </>
 ) : (
 <>
 <Zap size={13} />
 {t("Futuro", "Future")}
 </>
 )}
 </button>
 ))}

 {/* Speed (prospectivo only) */}
 {mode === "prospectivo" && (
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
 )}

 {/* Future mode status (Holter) */}
 {mode === "futuro" && (
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 fontSize: 12,
 color: textSec,
 }}
 >
 <span>{t("Estado", "Status")}:</span>
 <span style={{ 
 color: liveStatus === "predicting" ? "var(--cat-4)" : liveStatus === "real_playing" ? "var(--ok)" : textSec, 
 fontWeight: 600 
 }}>
 {liveStatus === "idle" ? t("Listo", "Ready") : 
 liveStatus === "real_playing" ? t("Señal Real", "Real Signal") : 
 t("Prediciendo", "Predicting")}
 </span>
 </div>
 )}

 {/* Play / Stop */}
 <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
 {mode === "prospectivo" ? (
 <>
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
 {isRunning ? (
 <>
 <Pause size={14} />
 {t("Detener", "Stop")}
 </>
 ) : (
 <>
 <Play size={14} />
 {t("Iniciar Predicción", "Start Prediction")}
 </>
 )}
 </button>
 <button
 onClick={() => {
 stopPrediction();
 setMetricsHistory([]);
 setR2ByStep([[], [], []]);
 setCurrentFrame(0);
 setCurrentPredBeats([]);
 }}
 style={{
 padding: "8px 14px",
 borderRadius: 8,
 border: `1px solid ${border}`,
 background: "transparent",
 color: textSec,
 cursor: "pointer",
 }}
 >
 <RotateCcw size={14} />
 </button>
 </>
 ) : (
 <>
 {liveStatus === "idle" && (
 <button
 onClick={startHolter}
 disabled={!hasSignal || isLoading}
 style={{
 padding: "8px 20px",
 borderRadius: 8,
 border: "none",
 background: !hasSignal || isLoading ? "#444" : "var(--ok)",
 color: "#fff",
 cursor: !hasSignal || isLoading ? "not-allowed" : "pointer",
 fontWeight: 700,
 fontSize: 13,
 display: "flex",
 alignItems: "center",
 gap: 8,
 }}
 >
 <Play size={14} />
 {t("Iniciar Holter", "Start Holter")}
 </button>
 )}

 {liveStatus === "real_playing" && (
 <button
 onClick={stopAndPredict}
 style={{
 padding: "8px 20px",
 borderRadius: 8,
 border: "none",
 background: "var(--crit)",
 color: "#fff",
 cursor: "pointer",
 fontWeight: 700,
 fontSize: 13,
 display: "flex",
 alignItems: "center",
 gap: 8,
 }}
 >
 <Pause size={14} />
 {t("Detener y Predecir", "Stop & Predict")}
 </button>
 )}

 {liveStatus === "predicting" && (
 <button
 onClick={() => {
 holterRef.current.predicting = false;
 holterRef.current.active = false;
 setLiveStatus("done");
 }}
 style={{
 padding: "8px 20px",
 borderRadius: 8,
 border: "none",
 background: "var(--warn)",
 color: "#fff",
 cursor: "pointer",
 fontWeight: 700,
 fontSize: 13,
 display: "flex",
 alignItems: "center",
 gap: 8,
 }}
 >
 <Pause size={14} />
 {t("Detener Generacion", "Stop Generation")}
 </button>
 )}

 {mode === "futuro" && (liveStatus === "predicting" || liveStatus === "real_playing" || liveStatus === "done") && (
 <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: textSec }}>
 <input 
 type="checkbox" 
 checked={showHolterGT} 
 onChange={e => setShowHolterGT(e.target.checked)} 
 />
 {t("Mostrar Original (GT)", "Show Original (GT)")}
 </label>
 )}

 {(liveStatus === "real_playing" || liveStatus === "predicting" || liveStatus === "done") && (
 <button
 onClick={() => {
 holterRef.current.active = false;
 setLiveStatus("idle");
 setLiveTimeSec(0);
 setLiveStopSec(null);
 setLivePredSamples([]);
 setFutureMetrics(null);
 }}
 style={{
 padding: "8px 14px",
 borderRadius: 8,
 border: `1px solid ${border}`,
 background: "transparent",
 color: textSec,
 cursor: "pointer",
 }}
 >
 <RotateCcw size={14} />
 </button>
 )}
 </>
 )}
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
 {mode === "prospectivo" && (
 <>
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
 "ECG en Vivo — Predicción Multi-Horizonte",
 "Live ECG — Multi-Horizon Prediction",
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
 {t("Cargando señal...", "Loading signal...")}
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
 name: H_LABELS[h],
 fill: "tozeroy" as const,
 fillcolor: tr.fill,
 line: { color: tr.color, width: 2 - h * 0.3 },
 hovertemplate: `t=%{x:.3f}s  v=%{y:.3f}<extra>${H_LABELS[h]}</extra>`,
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
 height: 240,
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
 const r2Ref = NB6_CONFIG.r2ByHorizon[h];
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
 "DTW — Dynamic Time Warping (Prioridad)",
 "DTW — Dynamic Time Warping (Priority)",
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
 {/* Avg session DTW */}
 <div style={{ textAlign: "center" }}>
 <div
 style={{
 fontSize: 24,
 fontWeight: 800,
 color: dtwColor(avgDtw),
 lineHeight: 1,
 }}
 >
 {avgDtw !== null ? avgDtw.toFixed(4) : "—"}
 </div>
 <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
 {t("DTW sesión promedio", "Session avg DTW")}
 </div>
 </div>
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
 ref: NB6_CONFIG.shapeCorr,
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
 ref: NB6_CONFIG.forecastScore,
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
 ref: NB6_CONFIG.r2Medio,
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
 "R² por Horizonte — Historia de Sesión",
 "R² by Horizon — Session History",
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
 const ref = NB6_CONFIG.r2ByHorizon[h];
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
 ref={ref.toFixed(3)} · sesión=
 {avg !== null ? avg.toFixed(3) : "—"}
 {avg !== null && (
 <span
 style={{
 color: avg >= ref ? "var(--ok)" : "var(--warn)",
 marginLeft: 4,
 }}
 >
 ({avg >= ref ? "✓" : "↑"})
 </span>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* ,, Beat shapes (current prediction vs real) ,,,,,,,,,,, */}
 {hasPred && (
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
 fontWeight: 700,
 fontSize: 13,
 color: textPri,
 marginBottom: 12,
 }}
 >
 {t("Morfología por Horizonte", "Beat Morphology per Horizon")}
 </div>
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
 gap: 14,
 }}
 >
 {[0, 1, 2].map((h) => {
 const pred = currentPredBeats[h] ?? [];
 const real = currentRealFuture[h] ?? [];
 const xs = Array.from(
 { length: NB6_CONFIG.beatLen },
 (_, i) => (i / 360) * 1000,
 );
 return (
 <div key={h}>
 <div
 style={{
 fontSize: 11,
 color: H_COLORS[h],
 fontWeight: 700,
 marginBottom: 6,
 }}
 >
 {H_LABELS[h]}
 </div>
 <PlotlyChart
 data={[
 ...(real.length > 0
 ? [
 {
 type: "scatter",
 mode: "lines",
 x: xs,
 y: real,
 name: t("Real", "Real"),
 line: { color: "var(--accent)", width: 1.5 },
 },
 ]
 : []),
 ...(pred.length > 0
 ? [
 {
 type: "scatter",
 mode: "lines",
 x: xs,
 y: pred,
 name: H_LABELS[h],
 line: { color: H_COLORS[h], width: 2 },
 fill: "tozeroy",
 fillcolor: H_FILL[h],
 },
 ]
 : []),
 ]}
 layout={{
 height: 130,
 paper_bgcolor: pBg,
 plot_bgcolor: pBg,
 margin: { l: 30, r: 6, t: 6, b: 24 },
 showlegend: false,
 xaxis: {
 gridcolor: pGrid,
 tickfont: { size: 8, color: pTick },
 title: {
 text: "ms",
 font: { size: 8, color: textSec },
 },
 },
 yaxis: {
 gridcolor: pGrid,
 tickfont: { size: 8, color: pTick },
 },
 }}
 config={{ displayModeBar: false, responsive: true }}
 />
 </div>
 );
 })}
 </div>
 </div>
 )}
 </>
 )}

 {/* 
 FUTURO mode
 */}
 {mode === "futuro" && (
 <>

 {/* Future holter chart */}
 <div key="future-holter-chart-wrapper">
 {holterData && (
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
 <Activity size={15} color={liveStatus === "predicting" ? "var(--cat-4)" : "var(--ok)"} />
 <span
 style={{ fontWeight: 700, fontSize: 14, color: textPri }}
 >
 {liveStatus === "predicting" ? t("Holter Vivo — Predicción IA", "Live Holter — AI Prediction") : t("Holter Vivo — Señal Paciente", "Live Holter — Patient Signal")}
 </span>
 </div>
 <PlotlyChart
 data={[
 {
 type: "scatter",
 mode: "lines",
 x: holterData.realTimes,
 y: holterData.realSamples,
 name: t("Señal Real", "Real Signal"),
 line: { color: "var(--accent)", width: 1.2 },
 hovertemplate: "t=%{x:.1f}s  v=%{y:.3f}<extra></extra>",
 },
 {
 type: "scatter",
 mode: "lines",
 x: holterData.predTimes,
 y: holterData.predSamples,
 name: t("Predicción IA", "AI Prediction"),
 line: { color: "var(--cat-4)", width: 1.2 },
 hovertemplate: "t=%{x:.1f}s  v=%{y:.3f}<extra></extra>",
 },
 ...(showHolterGT && holterData.gtSamples.length > 0 ? [{
 type: "scatter" as const,
 mode: "lines" as const,
 x: holterData.gtTimes,
 y: holterData.gtSamples,
 name: t("Original (GT)", "Original (GT)"),
 line: { color: "var(--text-muted)", width: 1, dash: "dash" as const },
 hovertemplate: "t=%{x:.1f}s  v=%{y:.3f}<extra>GT</extra>",
 }] : []),
 ]}
 layout={{
 height: 250,
 paper_bgcolor: pBg,
 plot_bgcolor: pBg,
 margin: { l: 45, r: 12, t: 10, b: 36 },
 showlegend: true,
 legend: { orientation: "h", y: -0.2 },
 xaxis: {
 title: {
 text: t("Tiempo (segundos)", "Time (seconds)"),
 font: { size: 10, color: textSec },
 },
 gridcolor: pGrid,
 zerolinecolor: pGrid,
 tickfont: { color: pTick, size: 10 },
 range: [Math.max(0, liveTimeSec - 10), Math.max(10, liveTimeSec)],
 },
 yaxis: {
 gridcolor: pGrid,
 zerolinecolor: pGrid,
 tickfont: { color: pTick, size: 10 },
 },
 }}
 config={{ responsive: true, displayModeBar: false }}
 />
 </div>
 )}
 </div>

 {/* Holter Metrics Dashboard */}
 {futureMetrics && (
 <div style={{ marginTop: 18, marginBottom: 18 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
 <TrendingUp size={16} color="var(--ok)" />
 <span style={{ fontWeight: 700, fontSize: 14, color: textPri }}>
 {t("Métricas de Desempeño Holter", "Holter Performance Metrics")}
 </span>
 </div>
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
 gap: 12,
 }}
 >
 {[
 {
 label: t("R² Morfología", "Morphology R²"),
 value: futureMetrics.morphR2.length > 0 
 ? (futureMetrics.morphR2.reduce((a,b)=>a+b)/futureMetrics.morphR2.length).toFixed(4)
 : "—",
 color: "var(--ok)",
 icon: <Target size={14} />
 },
 {
 label: "DTW (Distancia)",
 value: futureMetrics.dtw.length > 0
 ? (futureMetrics.dtw.reduce((a,b)=>a+b)/futureMetrics.dtw.length).toFixed(4)
 : "—",
 color: "var(--cat-4)",
 icon: <Activity size={14} />
 },
 {
 label: "RMSE",
 value: futureMetrics.rmse.length > 0
 ? (futureMetrics.rmse.reduce((a,b)=>a+b)/futureMetrics.rmse.length).toFixed(4)
 : "—",
 color: "var(--warn)",
 icon: <Zap size={14} />
 },
 {
 label: t("Tiempo Gen.", "Gen. Time"),
 value: `${futureMetrics.totalDuration.toFixed(1)}s`,
 color: "#3498DB",
 icon: <Info size={14} />
 }
 ].map((m) => (
 <div 
 key={m.label}
 style={{
 background: cardBg,
 border: `1px solid ${border}`,
 borderRadius: 12,
 padding: "12px 16px",
 display: "flex",
 flexDirection: "column",
 gap: 4
 }}
 >
 <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: textSec }}>
 {m.icon}
 <span>{m.label}</span>
 </div>
 <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>
 {m.value}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Alerts panel */}
 {futureAlerts.length > 0 && (
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
 <Bell size={15} color="var(--crit)" />
 <span
 style={{ fontWeight: 700, fontSize: 14, color: textPri }}
 >
 {t("Alertas Clínicas", "Clinical Alerts")} (
 {futureAlerts.length})
 </span>
 </div>
 <div style={{ maxHeight: 240, overflowY: "auto" }}>
 {futureAlerts
 .slice(-50)
 .reverse()
 .map((a, idx) => {
 const mins = Math.floor(a.timeSec / 60);
 const secs = Math.floor(a.timeSec % 60);
 const color =
 a.severity === "critical" ? "var(--crit)" : "var(--warn)";
 return (
 <div
 key={idx}
 style={{
 display: "flex",
 alignItems: "center",
 gap: 10,
 padding: "8px 12px",
 marginBottom: 4,
 borderRadius: 6,
 background: color + "11",
 borderLeft: `3px solid ${color}`,
 }}
 >
 <AlertTriangle size={12} color={color} />
 <span
 style={{
 fontSize: 10,
 color: textSec,
 minWidth: 48,
 }}
 >
 {mins}:{String(secs).padStart(2, "0")}
 </span>
 <span
 style={{
 padding: "2px 8px",
 borderRadius: 4,
 fontSize: 9,
 fontWeight: 700,
 background: color + "22",
 color,
 }}
 >
 {a.severity.toUpperCase()}
 </span>
 <span
 style={{ fontSize: 11, color: textPri, flex: 1 }}
 >
 {a.message}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Empty state */}
 {liveStatus === "idle" && (
 <div
 style={{
 textAlign: "center",
 padding: "60px 20px",
 color: textSec,
 }}
 >
 <Activity
 size={40}
 color="var(--ok)"
 style={{ marginBottom: 16, opacity: 0.5 }}
 />
 <p style={{ fontSize: 14, marginBottom: 8 }}>
 {t(
 'Presiona "Iniciar Holter" para visualizar la señal en vivo',
 'Press "Start Holter" to view the live signal',
 )}
 </p>
 <p style={{ fontSize: 12, opacity: 0.7 }}>
 {t(
 "Podrás detener la señal en cualquier momento y dejar que el modelo prevea el futuro",
 "You can stop the signal at any time and let the model predict the future",
 )}
 </p>
 </div>
 )}
 </>
 )}

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
 "Arquitectura",
 "CNN_GRU_ATTN (Conv1D dilat. + GRU + TemporalAttention + Residual)",
 ],
 [
 "Pérdida entrenamiento",
 "ECGLoss = 0.5·MSE + 0.3·MAE + 0.2·SlopeMSE",
 ],
 ["Input shape", "(1, 5, 257) — 5 latidos x 256 ECG + 1 RR"],
 ["Output shape", "(1, 3, 256) — 3 latidos x 256 muestras"],
 [
 "Dataset",
 "48 MIT-BIH (360Hz) + 75 INCART (257Hz) = 123 pacientes",
 ],
 [
 "Preprocesamiento de señal",
 "Notch 60 Hz -> Butterworth BP 0.5-40 Hz (SOS) -> Detrend lineal -> Z-score global",
 ],
 [
 "Norm. por latido",
 "Z-score per-beat: (beat - μ) / σ  +  clip(-5, 5)  — sin filtro mediana",
 ],
 [
 "Segmentación",
 "Ventana fija centrada en R-peak (PRE=92, POST=164, sin resample)",
 ],
 [
 "Gap train-test",
 `${NB6_CONFIG.gapTrainTest} (menor del proyecto)`,
 ],
 ["Tamaño modelo", "4.9 MB (desplegable en dispositivos médicos)"],
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

