import { useMemo } from 'react';
import { useECGStore } from '@/store/useECGStore';
import type { NB5Resumen, NB5Raw } from '@/types/ecg.types';

export interface FTEffectRow5 {
  modeloBase: string;
  r2Base: number;
  r2FT: number;
  deltaR2: number;
  mejoraPct: number;
  pacientesMejorados: number;
  pacientesTotal: number;
}

export interface TemporalDegRow {
  horizonte: string;
  r2Base: number;
  r2FT: number;
  deltaVsPrev: number;
}

interface NB5ResultsReturn {
  resumen: NB5Resumen[];
  raw: NB5Raw[];
  loading: boolean;
  error: string | null;
  baseModel: NB5Resumen | null;
  ftModel: NB5Resumen | null;
  pacientesOrdenados: { paciente: string; r2: number; modelo: string }[];
  modelos: string[];
  ftEffect: FTEffectRow5;
  temporalDeg: TemporalDegRow[];
  ic95Data: { Modelo: string; Media: number; IC95_inf: number; IC95_sup: number }[];
  r2Distribution: { rango: string; base: number; ft: number }[];
  gapData: { Modelo: string; R2_train: number; R2_test: number; GAP: number }[];
  dtwMean: number;
  totalEvals: number;
}

export function useNB5Results(): NB5ResultsReturn {
  const nb5Data = useECGStore((s) => s.nb5Data);
  const loadingExperiments = useECGStore((s) => s.loadingExperiments);
  const errorsExperiments = useECGStore((s) => s.errorsExperiments);

  const resumen = useMemo(() => nb5Data?.resumen ?? [], [nb5Data?.resumen]);
  const raw = useMemo(() => nb5Data?.raw ?? [], [nb5Data?.raw]);

  const loading = loadingExperiments.nb5;
  const error = errorsExperiments.nb5;

  const baseModel = useMemo(() => resumen.find(r => r.Modelo === 'CNN_GRU_ATTN') ?? null, [resumen]);
  const ftModel = useMemo((): NB5Resumen | null => {
    const fromResumen = resumen.find(r => r.Modelo === 'CNN_GRU_ATTN_FT');
    if (fromResumen) return fromResumen;
    const ftRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN_FT');
    if (ftRows.length === 0) return null;
    const avg = (key: keyof Pick<NB5Raw, 'R2_total' | 'R2_mean' | 'RMSE_total' | 'Shape_Corr' | 'Slope_MSE' | 'Amp_Error' | 'Forecast_Score'>) =>
      ftRows.reduce((s, r) => s + (r[key] as number), 0) / ftRows.length;
    const std = (vals: number[]) => {
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length);
    };
    return {
      Modelo: 'CNN_GRU_ATTN_FT',
      N_pacientes: ftRows.length,
      R2_total_mean: avg('R2_total'),
      R2_total_std: std(ftRows.map(r => r.R2_total)),
      R2_mean_mean: avg('R2_mean'),
      R2_mean_std: std(ftRows.map(r => r.R2_mean)),
      RMSE_total_mean: avg('RMSE_total'),
      RMSE_total_std: std(ftRows.map(r => r.RMSE_total)),
      Shape_Corr_mean: avg('Shape_Corr'),
      Slope_MSE_mean: avg('Slope_MSE'),
      Amp_Error_mean: avg('Amp_Error'),
      Forecast_Score_mean: avg('Forecast_Score'),
    };
  }, [resumen, raw]);

  const modelos = useMemo(() => {
    const set = new Set<string>();
    resumen.forEach(r => set.add(r.Modelo));
    raw.forEach(r => set.add(r.Modelo));
    return Array.from(set);
  }, [resumen, raw]);

  const totalEvals = useMemo(() => raw.length, [raw]);

  const pacientesOrdenados = useMemo(() => {
    const grouped = new Map<string, { values: number[]; modelo: string }>();
    raw.forEach(row => {
      const key = String(row.paciente_test);
      if (!grouped.has(key)) grouped.set(key, { values: [], modelo: row.Modelo });
      grouped.get(key)!.values.push(row.R2_total);
    });
    return Array.from(grouped.entries())
      .map(([paciente, { values, modelo }]) => ({
        paciente,
        r2: values.reduce((a, b) => a + b, 0) / values.length,
        modelo,
      }))
      .sort((a, b) => b.r2 - a.r2);
  }, [raw]);

  const ftEffect = useMemo((): FTEffectRow5 => {
    const baseRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN');
    const ftRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN_FT');
    const r2Base = baseModel?.R2_total_mean ?? 0;
    const r2FT = ftModel?.R2_total_mean ?? 0;
    const deltaR2 = r2FT - r2Base;
    const mejoraPct = r2Base !== 0 ? (deltaR2 / Math.abs(r2Base)) * 100 : 0;
    let pacientesMejorados = 0;
    const ftMap = new Map(ftRows.map(r => [String(r.paciente_test), r.R2_total]));
    baseRows.forEach(r => {
      const ftR2 = ftMap.get(String(r.paciente_test));
      if (ftR2 !== undefined && ftR2 > r.R2_total) pacientesMejorados++;
    });
    return {
      modeloBase: 'CNN_GRU_ATTN',
      r2Base,
      r2FT,
      deltaR2,
      mejoraPct,
      pacientesMejorados,
      pacientesTotal: baseRows.length,
    };
  }, [raw, baseModel, ftModel]);

  const temporalDeg = useMemo((): TemporalDegRow[] => {
    const baseRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN');
    const ftRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN_FT');
    if (baseRows.length === 0) return [];
    const avg = (rows: NB5Raw[], key: keyof Pick<NB5Raw, 'R2_t1' | 'R2_t2' | 'R2_t3'>) =>
      rows.length > 0 ? rows.reduce((s, r) => s + r[key], 0) / rows.length : 0;
    const baseT1 = avg(baseRows, 'R2_t1');
    const baseT2 = avg(baseRows, 'R2_t2');
    const baseT3 = avg(baseRows, 'R2_t3');
    const ftT1 = avg(ftRows, 'R2_t1');
    const ftT2 = avg(ftRows, 'R2_t2');
    const ftT3 = avg(ftRows, 'R2_t3');
    return [
      { horizonte: 't+1', r2Base: baseT1, r2FT: ftT1, deltaVsPrev: 0 },
      { horizonte: 't+2', r2Base: baseT2, r2FT: ftT2, deltaVsPrev: baseT2 - baseT1 },
      { horizonte: 't+3', r2Base: baseT3, r2FT: ftT3, deltaVsPrev: baseT3 - baseT2 },
    ];
  }, [raw]);

  const ic95Data = useMemo(() => {
    return resumen
      .map(r => {
        const n = r.N_pacientes;
        const se = r.R2_total_std / Math.sqrt(n);
        return {
          Modelo: r.Modelo,
          Media: r.R2_total_mean,
          IC95_inf: r.R2_total_mean - 1.96 * se,
          IC95_sup: r.R2_total_mean + 1.96 * se,
        };
      })
      .sort((a, b) => a.Media - b.Media);
  }, [resumen]);

  const r2Distribution = useMemo(() => {
    const ranges = [
      { rango: 'R² ≥ 0.80', min: 0.80, max: Infinity },
      { rango: '0.60 ≤ R² < 0.80', min: 0.60, max: 0.80 },
      // Los cortes son los de la TABLA XXIX del documento. Antes eran 0.30 y
      // 0.00-0.30, y no cuadraban con la tabla impresa.
      { rango: '0.40 ≤ R² < 0.60', min: 0.40, max: 0.60 },
      { rango: '0.00 ≤ R² < 0.40', min: 0.00, max: 0.40 },
      { rango: 'R² < 0.00', min: -Infinity, max: 0.00 },
    ];
    const baseRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN');
    const ftRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN_FT');
    const ftMap = new Map(ftRows.map(r => [String(r.paciente_test), r.R2_total]));
    return ranges.map(({ rango, min, max }) => {
      const base = baseRows.filter(r => r.R2_total >= min && r.R2_total < max).length;
      const ft = ftRows.filter(r => r.R2_total >= min && r.R2_total < max).length;
      return { rango, base, ft };
    });
  }, [raw]);

  const gapData = useMemo(() => {
    const baseRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN' && r.R2_train != null);
    if (baseRows.length === 0) return [];
    const avgTrain = baseRows.reduce((s, r) => s + (r.R2_train ?? 0), 0) / baseRows.length;
    const avgTest = baseRows.reduce((s, r) => s + r.R2_total, 0) / baseRows.length;
    return [{ Modelo: 'CNN_GRU_ATTN', R2_train: avgTrain, R2_test: avgTest, GAP: avgTrain - avgTest }];
  }, [raw]);

  const dtwMean = useMemo(() => {
    const baseRows = raw.filter(r => r.Modelo === 'CNN_GRU_ATTN' && r.DTW_mean != null);
    if (baseRows.length === 0) return 0;
    return baseRows.reduce((s, r) => s + r.DTW_mean, 0) / baseRows.length;
  }, [raw]);

  return {
    resumen,
    raw,
    loading,
    error,
    baseModel,
    ftModel,
    pacientesOrdenados,
    modelos,
    ftEffect,
    temporalDeg,
    ic95Data,
    r2Distribution,
    gapData,
    dtwMean,
    totalEvals,
  };
}
