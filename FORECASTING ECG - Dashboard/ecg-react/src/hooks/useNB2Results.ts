/**
 * Hook especializado para cargar y acceder a datos de NB2
 */

import { useMemo } from 'react';
import { useECGStore } from '@/store/useECGStore';
import type { NB2ResumenA, NB2ResumenB, NB2RawA, NB2RawB, NB2Comparativa, IC95Row, WilcoxonRow, OverfitRow } from '@/types/ecg.types';

interface NB2ResultsReturn {
  resumenA: NB2ResumenA[];
  resumenB: NB2ResumenB[];
  rawA: NB2RawA[];
  rawB: NB2RawB[];
  comparativa: NB2Comparativa[];
  ic95A: IC95Row[];
  ic95B: IC95Row[];
  wilcoxonA: WilcoxonRow[];
  wilcoxonB: WilcoxonRow[];
  overfitA: OverfitRow[];
  overfitB: OverfitRow[];
  loading: boolean;
  error: string | null;
  bestModelA: NB2ResumenA | null;
  bestModelB: NB2ResumenB | null;
  modelos: string[];
  filtros: string[];
}

export function useNB2Results(): NB2ResultsReturn {
  const nb2Data = useECGStore((s) => s.nb2Data);
  const loadingExperiments = useECGStore((s) => s.loadingExperiments);
  const errorsExperiments = useECGStore((s) => s.errorsExperiments);

  const resumenA = useMemo(() => nb2Data?.resumenA ?? [], [nb2Data?.resumenA]);
  const resumenB = useMemo(() => nb2Data?.resumenB ?? [], [nb2Data?.resumenB]);
  const rawA = useMemo(() => nb2Data?.rawA ?? [], [nb2Data?.rawA]);
  const rawB = useMemo(() => nb2Data?.rawB ?? [], [nb2Data?.rawB]);
  const comparativa = useMemo(() => nb2Data?.comparativa ?? [], [nb2Data?.comparativa]);
  const ic95A = useMemo(() => nb2Data?.ic95A ?? [], [nb2Data?.ic95A]);
  const ic95B = useMemo(() => nb2Data?.ic95B ?? [], [nb2Data?.ic95B]);
  const wilcoxonA = useMemo(() => nb2Data?.wilcoxonA ?? [], [nb2Data?.wilcoxonA]);
  const wilcoxonB = useMemo(() => nb2Data?.wilcoxonB ?? [], [nb2Data?.wilcoxonB]);
  const overfitA = useMemo(() => nb2Data?.overfitA ?? [], [nb2Data?.overfitA]);
  const overfitB = useMemo(() => nb2Data?.overfitB ?? [], [nb2Data?.overfitB]);

  const loading = loadingExperiments.nb2;
  const error = errorsExperiments.nb2;

  const bestModelA = useMemo(() => {
    if (resumenA.length === 0) return null;
    return resumenA.reduce((best, curr) =>
      curr.R2_media > best.R2_media ? curr : best
    );
  }, [resumenA]);

  const bestModelB = useMemo(() => {
    if (resumenB.length === 0) return null;
    return resumenB.reduce((best, curr) =>
      curr.R2_media > best.R2_media ? curr : best
    );
  }, [resumenB]);

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

  return {
    resumenA,
    resumenB,
    rawA,
    rawB,
    comparativa,
    ic95A,
    ic95B,
    wilcoxonA,
    wilcoxonB,
    overfitA,
    overfitB,
    loading,
    error,
    bestModelA,
    bestModelB,
    modelos,
    filtros,
  };
}
