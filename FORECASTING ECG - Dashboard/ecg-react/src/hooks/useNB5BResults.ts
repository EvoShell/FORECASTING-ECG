/**
 * Hook especializado para cargar y acceder a datos de NB5B
 */

import { useMemo } from 'react';
import { useECGStore } from '@/store/useECGStore';
import type { NB5BResumen, NB5BRaw } from '@/types/ecg.types';

export interface FTEffectRow {
  modeloBase: string;
  r2Base: number;
  r2FT: number;
  deltaR2: number;
  mejoraPct: number;
}

export interface GapRow5B {
  Modelo: string;
  R2_train: number;
  R2_test: number;
  GAP: number;
}

interface NB5BResultsReturn {
  resumen: NB5BResumen[];
  raw: NB5BRaw[];
  loading: boolean;
  error: string | null;
  mejoresModelos: NB5BResumen[];
  bestIndividual: NB5BResumen | null;
  pacientesOrdenados: { paciente: string; r2: number }[];
  modelos: string[];
  metricas: string[];
  r2PorPaciente: Record<string, Record<string, number>>;
  totalEvals: number;
  gapMinimo: GapRow5B | null;
  gapData: GapRow5B[];
  ftEffect: FTEffectRow[];
  ic95Data: { Modelo: string; Media: number; IC95_inf: number; IC95_sup: number }[];
  comprehensiveTable: Record<string, Record<string, number>>; // modelo -> metrica -> valor
}

export function useNB5BResults(): NB5BResultsReturn {
  const nb5bData = useECGStore((s) => s.nb5bData);
  const loadingExperiments = useECGStore((s) => s.loadingExperiments);
  const errorsExperiments = useECGStore((s) => s.errorsExperiments);

  const resumen = useMemo(() => nb5bData?.resumen ?? [], [nb5bData?.resumen]);
  const raw = useMemo(() => nb5bData?.raw ?? [], [nb5bData?.raw]);

  const loading = loadingExperiments.nb5b;
  const error = errorsExperiments.nb5b;

  const mejoresModelos = useMemo(() => {
    const r2Rows = resumen.filter((r) => r.Metrica === 'R2');
    return r2Rows.sort((a, b) => b.Media - a.Media);
  }, [resumen]);

  // Best individual (non-Ensemble)
  const bestIndividual = useMemo(() => {
    const r2Rows = resumen.filter((r) => r.Metrica === 'R2' && !r.Modelo.startsWith('Ensemble'));
    if (r2Rows.length === 0) return null;
    return r2Rows.reduce((best, curr) => curr.Media > best.Media ? curr : best);
  }, [resumen]);

  // Total evaluations from raw
  const totalEvals = useMemo(() => raw.length, [raw]);

  // Gap train-test per base model (GRU_base, CNN_GRU, BiGRU_MHA)
  const BASE_MODELS = ['GRU_base', 'CNN_GRU', 'BiGRU_MHA'];
  const gapData = useMemo((): GapRow5B[] => {
    const grouped = new Map<string, { train: number[]; test: number[] }>();
    raw
      .filter((r) => BASE_MODELS.includes(r.Modelo))
      .forEach((r) => {
        if (!grouped.has(r.Modelo)) grouped.set(r.Modelo, { train: [], test: [] });
        grouped.get(r.Modelo)!.train.push(r.R2_train);
        grouped.get(r.Modelo)!.test.push(r.R2);
      });
    return Array.from(grouped.entries())
      .map(([modelo, { train, test }]) => {
        const R2_train = train.reduce((a, b) => a + b, 0) / train.length;
        const R2_test = test.reduce((a, b) => a + b, 0) / test.length;
        return { Modelo: modelo, R2_train, R2_test, GAP: R2_train - R2_test };
      })
      .sort((a, b) => a.GAP - b.GAP);
  }, [raw]);

  const gapMinimo = useMemo(() => gapData[0] ?? null, [gapData]);

  // Fine-tuning effect: compare base vs FT pairs
  const FT_PAIRS: [string, string][] = [
    ['GRU_base', 'GRU_base_FT'],
    ['CNN_GRU', 'CNN_GRU_FT'],
    ['BiGRU_MHA', 'BiGRU_MHA_FT'],
    ['Ensemble', 'Ensemble_FT'],
  ];
  const ftEffect = useMemo((): FTEffectRow[] => {
    const r2Map = new Map<string, number>();
    resumen.filter((r) => r.Metrica === 'R2').forEach((r) => r2Map.set(r.Modelo, r.Media));
    return FT_PAIRS.map(([base, ft]) => {
      const r2Base = r2Map.get(base) ?? 0;
      const r2FT = r2Map.get(ft) ?? 0;
      const deltaR2 = r2FT - r2Base;
      const mejoraPct = r2Base !== 0 ? (deltaR2 / Math.abs(r2Base)) * 100 : 0;
      return { modeloBase: base, r2Base, r2FT, deltaR2, mejoraPct };
    });
  }, [resumen]);

  // IC95 data sorted ascending for forest plot
  const ic95Data = useMemo(() => {
    return resumen
      .filter((r) => r.Metrica === 'R2')
      .map((r) => ({ Modelo: r.Modelo, Media: r.Media, IC95_inf: r.IC95_inf, IC95_sup: r.IC95_sup }))
      .sort((a, b) => a.Media - b.Media);
  }, [resumen]);

  // Pivot: modelo -> metrica -> Media
  const comprehensiveTable = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    resumen.forEach((r) => {
      if (!result[r.Modelo]) result[r.Modelo] = {};
      result[r.Modelo][r.Metrica] = r.Media;
      if (r.Metrica === 'R2') {
        result[r.Modelo]['R2_std'] = r.Std;
        result[r.Modelo]['IC95_inf'] = r.IC95_inf;
        result[r.Modelo]['IC95_sup'] = r.IC95_sup;
      }
    });
    return result;
  }, [resumen]);

  const pacientesOrdenados = useMemo(() => {
    const grouped = new Map<string, number[]>();
    raw.forEach((row) => {
      const key = String(row.paciente_test);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row.R2);
    });
    return Array.from(grouped.entries())
      .map(([paciente, values]) => ({
        paciente,
        r2: values.reduce((a, b) => a + b, 0) / values.length,
      }))
      .sort((a, b) => b.r2 - a.r2);
  }, [raw]);

  const modelos = useMemo(() => {
    const set = new Set<string>();
    resumen.forEach((r) => set.add(r.Modelo));
    raw.forEach((r) => set.add(r.Modelo));
    return Array.from(set);
  }, [resumen, raw]);

  const metricas = useMemo(() => {
    const set = new Set<string>();
    resumen.forEach((r) => set.add(r.Metrica));
    return Array.from(set);
  }, [resumen]);

  const r2PorPaciente = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    raw.forEach((row) => {
      const key = String(row.paciente_test);
      if (!result[key]) result[key] = {};
      result[key][row.Modelo] = row.R2;
    });
    return result;
  }, [raw]);

  return {
    resumen,
    raw,
    loading,
    error,
    mejoresModelos,
    bestIndividual,
    pacientesOrdenados,
    modelos,
    metricas,
    r2PorPaciente,
    totalEvals,
    gapMinimo,
    gapData,
    ftEffect,
    ic95Data,
    comprehensiveTable,
  };
}
