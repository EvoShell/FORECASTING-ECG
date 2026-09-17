/**
 * ECGPredictionChart
 * Canvas-based chart that overlays real ECG signal with ML model prediction.
 * Shows:
 *  - Real signal (green)
 *  - Predicted signal (orange/yellow, dashed)
 *  - R-peak markers (vertical dotted lines)
 *  - "Now" cursor (blue vertical line)
 *  - Confidence band (semi-transparent fill)
 *  - Scrolling window so the chart advances with the prediction
 */
import { useRef, useEffect, useCallback } from 'react';
import { useECGStore } from '@/store/useECGStore';

interface ECGPredictionChartProps {
  /** Full real ECG signal (raw samples) */
  realSignal: number[];
  /** Predicted segment — starts at `predStartIdx` in sample-space */
  predictedSignal?: number[];
  /** Sample index where prediction window begins */
  predStartIdx?: number;
  /** Sample index of the "now" cursor (right edge of context window) */
  nowIdx?: number;
  /** All R-peak indices in `realSignal` */
  rPeaks?: number[];
  /** Sampling frequency (Hz) */
  fs?: number;
  height?: number;
  /** Show confidence band around prediction */
  showConfidence?: boolean;
  /** R² of this prediction window (0-1) */
  r2?: number | null;
  /** Mode label shown in top-left */
  modeLabel?: string;
  /** Running state badge */
  isRunning?: boolean;
  /** Current frame / beat */
  frameLabel?: string;
}

const DOWNSAMPLE_MAX = 3000;

function downsample(sig: number[], maxPts: number): { idx: number; val: number }[] {
  const step = Math.max(1, Math.ceil(sig.length / maxPts));
  const out: { idx: number; val: number }[] = [];
  for (let i = 0; i < sig.length; i += step) {
    out.push({ idx: i, val: sig[i] });
  }
  return out;
}

export function ECGPredictionChart({
  realSignal,
  predictedSignal,
  predStartIdx,
  nowIdx,
  rPeaks = [],
  fs = 360,
  height = 300,
  showConfidence = true,
  r2,
  modeLabel,
  isRunning,
  frameLabel,
}: ECGPredictionChartProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';

  const COLORS = {
    bg: isDark ? 'transparent' : 'transparent',
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    real: isDark ? '#3b82f6' : '#2563eb',
    pred: '#fbbf24',
    predFill: 'rgba(251,191,36,0.15)',
    now: '#1d4ed8',
    rpeak: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
    axis: isDark ? '#475569' : '#9ca3af',
    text: isDark ? '#94a3b8' : '#6b7280',
    textStrong: 'var(--text)',
    cardBg: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.9)',
  };

  const draw = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth || 800;
    const H = height;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    if (realSignal.length === 0) {
      ctx.fillStyle = COLORS.text;
      ctx.font = `12px DM Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('Cargando señal…', W / 2, H / 2);
      return;
    }

    // ── Determine visible window ──────────────────────────────────────────
    // Show a window of ~6 seconds centered around nowIdx
    const windowSamples = Math.round(6 * fs); // 6 s
    const center = nowIdx ?? Math.floor(realSignal.length / 2);
    let wStart = Math.max(0, center - Math.floor(windowSamples * 0.4));
    const wEnd = Math.min(realSignal.length - 1, wStart + windowSamples);
    wStart = Math.max(0, wEnd - windowSamples);

    const slice = realSignal.slice(wStart, wEnd + 1);
    const M_LEFT = 46, M_RIGHT = 16, M_TOP = 20, M_BOTTOM = 28;
    const cw = W - M_LEFT - M_RIGHT;
    const ch = H - M_TOP - M_BOTTOM;

    // ── Y bounds from visible real signal ─────────────────────────────────
    let minY = Infinity, maxY = -Infinity;
    for (const v of slice) { if (v < minY) minY = v; if (v > maxY) maxY = v; }
    if (predictedSignal) {
      for (const v of predictedSignal) { if (v < minY) minY = v; if (v > maxY) maxY = v; }
    }
    const rangeY = (maxY - minY) || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;
    const newRange = maxY - minY;

    const sx = (sampleIdx: number) => M_LEFT + ((sampleIdx - wStart) / (wEnd - wStart)) * cw;
    const sy = (val: number) => M_TOP + ch - ((val - minY) / newRange) * ch;

    // ── Grid ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.8;
    const nYLines = 4;
    for (let i = 0; i <= nYLines; i++) {
      const y = M_TOP + (ch / nYLines) * i;
      ctx.beginPath(); ctx.moveTo(M_LEFT, y); ctx.lineTo(M_LEFT + cw, y); ctx.stroke();
    }
    // 1-second vertical grid lines
    const secStep = fs;
    for (let s = wStart - (wStart % secStep); s <= wEnd; s += secStep) {
      if (s < wStart) continue;
      const x = sx(s);
      ctx.beginPath(); ctx.moveTo(x, M_TOP); ctx.lineTo(x, M_TOP + ch); ctx.stroke();
    }

    // ── R-peak markers ────────────────────────────────────────────────────
    ctx.strokeStyle = COLORS.rpeak;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    for (const rp of rPeaks) {
      if (rp >= wStart && rp <= wEnd) {
        const x = sx(rp);
        ctx.beginPath(); ctx.moveTo(x, M_TOP); ctx.lineTo(x, M_TOP + ch); ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // ── Prediction confidence band ─────────────────────────────────────────
    if (predictedSignal && predictedSignal.length > 0 && predStartIdx !== undefined && showConfidence) {
      const r2val = r2 ?? 0.5;
      const uncertainty = Math.max(0.05, (1 - r2val) * 0.3) * newRange;
      ctx.fillStyle = COLORS.predFill;
      ctx.beginPath();
      // Upper band
      for (let i = 0; i < predictedSignal.length; i++) {
        const sIdx = predStartIdx + i;
        if (sIdx < wStart || sIdx > wEnd) continue;
        const x = sx(sIdx);
        const y = sy(predictedSignal[i] + uncertainty);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      // Lower band (reverse)
      for (let i = predictedSignal.length - 1; i >= 0; i--) {
        const sIdx = predStartIdx + i;
        if (sIdx < wStart || sIdx > wEnd) continue;
        const x = sx(sIdx);
        const y = sy(predictedSignal[i] - uncertainty);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // ── Real signal ──────────────────────────────────────────────────────
    ctx.strokeStyle = COLORS.real;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let firstPt = true;
    const stepR = Math.max(1, Math.ceil(slice.length / DOWNSAMPLE_MAX));
    for (let i = 0; i < slice.length; i += stepR) {
      const x = sx(wStart + i);
      const y = sy(slice[i]);
      if (firstPt) { ctx.moveTo(x, y); firstPt = false; } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();

    // ── Predicted signal ─────────────────────────────────────────────────
    if (predictedSignal && predictedSignal.length > 0 && predStartIdx !== undefined) {
      ctx.strokeStyle = COLORS.pred;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      let firstP = true;
      for (let i = 0; i < predictedSignal.length; i++) {
        const sIdx = predStartIdx + i;
        if (sIdx < wStart) continue;
        if (sIdx > wEnd) break;
        const x = sx(sIdx);
        const y = sy(predictedSignal[i]);
        if (firstP) { ctx.moveTo(x, y); firstP = false; } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── "Now" cursor ─────────────────────────────────────────────────────
    if (nowIdx !== undefined && nowIdx >= wStart && nowIdx <= wEnd) {
      const x = sx(nowIdx);
      ctx.strokeStyle = COLORS.now;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, M_TOP); ctx.lineTo(x, M_TOP + ch); ctx.stroke();
      ctx.fillStyle = COLORS.now;
      ctx.font = '9px DM Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ahora', x, M_TOP - 4);
    }

    // ── Y axis labels ─────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.text;
    ctx.font = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= nYLines; i++) {
      const y = M_TOP + (ch / nYLines) * i;
      const val = maxY - (i / nYLines) * newRange;
      ctx.fillText(val.toFixed(2), M_LEFT - 4, y + 3);
    }

    // ── X axis labels (seconds) ────────────────────────────────────────────
    ctx.textAlign = 'center';
    for (let s = wStart - (wStart % secStep); s <= wEnd; s += secStep) {
      if (s < wStart) continue;
      const x = sx(s);
      ctx.fillText(`${(s / fs).toFixed(0)}s`, x, M_TOP + ch + 14);
    }

    // ── Legend cards ──────────────────────────────────────────────────────
    const legendItems = [
      { color: COLORS.real, label: 'ECG real', dash: false },
      ...(predictedSignal && predictedSignal.length > 0
        ? [{ color: COLORS.pred, label: 'Predicción', dash: true }]
        : []),
    ];
    let lx = M_LEFT + 8;
    const ly = M_TOP + 8;
    for (const item of legendItems) {
      ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.roundRect(lx - 4, ly - 9, 110, 18, 4);
      ctx.fill();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      if (item.dash) ctx.setLineDash([5, 2]); else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 20, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.textStrong;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, lx + 26, ly + 4);
      lx += 118;
    }

    // ── R² badge (top-right) ──────────────────────────────────────────────
    if (r2 !== null && r2 !== undefined) {
      const r2Color = r2 >= 0.5 ? '#3b82f6' : r2 >= 0.2 ? '#eab308' : '#ef4444';
      const badgeW = 80, badgeH = 22;
      const bx = W - M_RIGHT - badgeW;
      const by = M_TOP + 4;
      ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.roundRect(bx, by, badgeW, badgeH, 4); ctx.fill();
      ctx.fillStyle = r2Color;
      ctx.font = 'bold 11px DM Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`R²=${r2.toFixed(3)}`, bx + badgeW / 2, by + 15);
    }

    // ── Status badge (bottom-right) ──────────────────────────────────────
    if (isRunning || frameLabel) {
      const label = frameLabel ?? '▶';
      ctx.fillStyle = isRunning ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.15)';
      ctx.beginPath(); ctx.roundRect(W - M_RIGHT - 60, M_TOP + ch - 6, 56, 16, 4); ctx.fill();
      ctx.fillStyle = isRunning ? '#3b82f6' : COLORS.text;
      ctx.font = '9px DM Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, W - M_RIGHT - 32, M_TOP + ch + 6);
    }

    // ── Mode label ────────────────────────────────────────────────────────
    if (modeLabel) {
      ctx.fillStyle = COLORS.text;
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(modeLabel, W - M_RIGHT, M_TOP + ch + 14);
    }
  }, [realSignal, predictedSignal, predStartIdx, nowIdx, rPeaks, fs, height, showConfidence, r2, modeLabel, isRunning, frameLabel, COLORS, isDark]);

  // Redraw on any prop change
  useEffect(() => {
    draw();
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div
      ref={canvasRef}
      style={{ width: '100%', height, position: 'relative', borderRadius: '8px', overflow: 'hidden' }}
    >
      <canvas style={{ display: 'block' }} />
    </div>
  );
}

export default ECGPredictionChart;
