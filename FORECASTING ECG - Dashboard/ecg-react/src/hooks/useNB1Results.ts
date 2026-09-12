/**
 * Hook especializado para cargar y acceder a datos de NB1
 */

import { useMemo } from 'react';
import { useECGStore } from '@/store/useECGStore';
import type { NB1ResumenA, NB1ResumenB, NB1RawA, NB1RawB, NB1RankingFiltro, NB1RankingHorizonte, IC95Row, WilcoxonRow, OverfitRow } from '@/types/ecg.types';

interface NB1ResultsReturn {
  resumenA: NB1ResumenA[];
  resumenB: NB1ResumenB[];
  rawA: NB1RawA[];
  rawB: NB1RawB[];
  ic95A: IC95Row[];
  ic95B: IC95Row[];
  wilcoxonA: WilcoxonRow[];
  wilcoxonB: WilcoxonRow[];
  rankingFiltros: NB1RankingFiltro[];
  rankingHorizontes: NB1RankingHorizonte[];
  overfitA: OverfitRow[];
  overfitB: OverfitRow[];
  loading: boolean;
  error: string | null;
  bestModelA: NB1ResumenA | null;
  bestModelB: NB1ResumenB | null;
  mejorFiltro: string | null;
  mejorFiltroR2: number | null;
  mejorFiltroLB: number | null;
  modelos: string[];
  filtros: string[];
  horizontes: number[];
  lookbacks: number[];
  sigVsPersistA: number;
  sigVsPersistB: number;
  bestRmseA: number;
  bestRmseB: number;
  gapBestA: number;
  gapBestB: number;
  positiveR2CountA: number;
  positiveR2CountB: number;
  mejorHorizonte: number | null;
  mejorHorizonteR2: number | null;
}

// Models to exclude from NB1 visualizations
const EXCLUDED_MODELS = new Set(['LinReg']);

export function useNB1Results(): NB1ResultsReturn {
  const nb1Data = useECGStore((s) => s.nb1Data);
  const loadingExperiments = useECGStore((s) => s.loadingExperiments);
  const errorsExperiments = useECGStore((s) => s.errorsExperiments);

  const resumenA = useMemo(() => (nb1Data?.resumenA ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.resumenA]);
  const resumenB = useMemo(() => (nb1Data?.resumenB ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.resumenB]);
  const rawA = useMemo(() => (nb1Data?.rawA ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.rawA]);
  const rawB = useMemo(() => (nb1Data?.rawB ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.rawB]);
  const ic95A = useMemo(() => (nb1Data?.ic95A ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.ic95A]);
  const ic95B = useMemo(() => (nb1Data?.ic95B ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.ic95B]);
  const wilcoxonA = useMemo(() => (nb1Data?.wilcoxonA ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.wilcoxonA]);
  const wilcoxonB = useMemo(() => (nb1Data?.wilcoxonB ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.wilcoxonB]);
  const rankingFiltros = useMemo(() => nb1Data?.rankingFiltros ?? [], [nb1Data?.rankingFiltros]);
  const rankingHorizontes = useMemo(() => nb1Data?.rankingHorizontes ?? [], [nb1Data?.rankingHorizontes]);
  const overfitA = useMemo(() => (nb1Data?.overfitA ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.overfitA]);
  const overfitB = useMemo(() => (nb1Data?.overfitB ?? []).filter(r => !EXCLUDED_MODELS.has(r.Modelo)), [nb1Data?.overfitB]);

  const loading = loadingExperiments.nb1;
  const error = errorsExperiments.nb1;

  const bestModelA = useMemo(() => {
    if (resumenA.length === 0) return null;
    return resumenA.reduce((best, curr) =>
      curr.R2_media > best.R2_media ? curr : best
    );
  }, [resumenA]);

  const bestModelB = useMemo(() => {
    if (resumenB.length === 0) return null;
    const valid = resumenB.filter(r => r.R2_media > -1e6);
    if (valid.length === 0) return null;
    return valid.reduce((best, curr) =>
      curr.R2_media > best.R2_media ? curr : best
    );
  }, [resumenB]);

  // Replicates Streamlit logic: filter to competitive models (DT, RF, SVR_rbf, MLP),
  // build heatmap Filtro×Lookback, find (filtro, lookback) cell with max mean R²
  const { mejorFiltro, mejorFiltroR2, mejorFiltroLB } = useMemo(() => {
    const COMP = new Set(['DT', 'RF', 'SVR_rbf', 'MLP']);
    const compRows = rawB.filter((r) => COMP.has(r.Modelo));
    if (compRows.length === 0) return { mejorFiltro: null, mejorFiltroR2: null, mejorFiltroLB: null };

    // avg R² per (Filtro, Lookback) cell
    const cellMap = new Map<string, number[]>();
    compRows.forEach((r) => {
      const key = `${r.Filtro}|||${r.Lookback}`;
      if (!cellMap.has(key)) cellMap.set(key, []);
      cellMap.get(key)!.push(r.R2);
    });

    let bestFiltro = '';
    let bestLB = 0;
    let bestR2 = -Infinity;
    cellMap.forEach((values, key) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg > bestR2) {
        bestR2 = avg;
        const [f, lb] = key.split('|||');
        bestFiltro = f;
        bestLB = Number(lb);
      }
    });
    return {
      mejorFiltro: bestFiltro || null,
      mejorFiltroR2: bestR2 === -Infinity ? null : bestR2,
      mejorFiltroLB: bestLB || null,
    };
  }, [rawB]);

  const modelos = useMemo(() => {
    const set = new Set<string>();
    resumenA.forEach((r) => set.add(r.Modelo));
    resumenB.forEach((r) => set.add(r.Modelo));
    return Array.from(set);
  }, [resumenA, resumenB]);

  const filtros = useMemo(() => {
    const set = new Set<string>();
    rawA.forEach((r) => set.add(r.Filtro));
    rawB.forEach((r) => set.add(r.Filtro));
    return Array.from(set);
  }, [rawA, rawB]);

  const horizontes = useMemo(() => {
    const set = new Set<number>();
    rawA.forEach((r) => set.add(r.Horizonte_seg));
    return Array.from(set).sort((a, b) => a - b);
  }, [rawA]);

  const lookbacks = useMemo(() => {
    const set = new Set<number>();
    rawB.forEach((r) => set.add(r.Lookback));
    return Array.from(set).sort((a, b) => a - b);
  }, [rawB]);

  const sigVsPersistA = useMemo(() => wilcoxonA.filter(r => r.Significativo === '✓').length, [wilcoxonA]);
  const sigVsPersistB = useMemo(() => wilcoxonB.filter(r => r.Significativo === '✓').length, [wilcoxonB]);

  const bestRmseA = useMemo(() => {
    if (resumenA.length === 0) return 0;
    return Math.min(...resumenA.map(r => r.RMSE_media));
  }, [resumenA]);

  const bestRmseB = useMemo(() => {
    const valid = resumenB.filter(r => r.R2_media > -1e6);
    if (valid.length === 0) return 0;
    return Math.min(...valid.map(r => r.RMSE_media));
  }, [resumenB]);

  const gapBestA = useMemo(() => {
    if (!bestModelA) return 0;
    const row = overfitA.find(r => r.Modelo === bestModelA.Modelo);
    return row?.Diferencia ?? 0;
  }, [bestModelA, overfitA]);

  const gapBestB = useMemo(() => {
    if (!bestModelB) return 0;
    const row = overfitB.find(r => r.Modelo === bestModelB.Modelo);
    return row?.Diferencia ?? 0;
  }, [bestModelB, overfitB]);

  const positiveR2CountA = useMemo(() => resumenA.filter(r => r.R2_media > 0).length, [resumenA]);
  const positiveR2CountB = useMemo(() => resumenB.filter(r => r.R2_media > 0 && r.R2_media > -1e6).length, [resumenB]);

  const mejorHorizonte = useMemo(() => {
    if (rankingHorizontes.length === 0) return null;
    const best = rankingHorizontes.reduce((a, b) => a.R2_media > b.R2_media ? a : b);
    return best.Horizonte_seg;
  }, [rankingHorizontes]);

  const mejorHorizonteR2 = useMemo(() => {
    if (rankingHorizontes.length === 0) return null;
    const best = rankingHorizontes.reduce((a, b) => a.R2_media > b.R2_media ? a : b);
    return best.R2_media;
  }, [rankingHorizontes]);

  return {
    resumenA, resumenB, rawA, rawB,
    ic95A, ic95B, wilcoxonA, wilcoxonB,
    rankingFiltros, rankingHorizontes, overfitA, overfitB,
    loading, error, bestModelA, bestModelB,
    mejorFiltro, mejorFiltroR2, mejorFiltroLB,
    modelos, filtros, horizontes, lookbacks,
    sigVsPersistA, sigVsPersistB, bestRmseA, bestRmseB,
    gapBestA, gapBestB, positiveR2CountA, positiveR2CountB,
    mejorHorizonte, mejorHorizonteR2,
  };
}
