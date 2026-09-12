/**
 * Hook especializado para cargar y acceder a datos de NB4B
 */

import { useMemo } from 'react';
import { useECGStore } from '@/store/useECGStore';
import type { NB4BGlobal, NB4BPorPaciente, NB4BResumen, NB4BIC95, NB4BWilcoxon, NB4BOverfit } from '@/types/ecg.types';

interface NB4BResultsReturn {
  global: NB4BGlobal[];
  porPaciente: NB4BPorPaciente[];
  resumen: NB4BResumen[];
  ic95: NB4BIC95[];
  wilcoxon: NB4BWilcoxon[];
  overfit: NB4BOverfit[];
  tdCnnGlobal: NB4BGlobal[];
  tdCnnPorPaciente: NB4BPorPaciente[];
  loading: boolean;
  error: string | null;
  bestGlobal: NB4BGlobal | null;
  mejorModelo: NB4BResumen | null;
  modelos: string[];
  filtros: string[];
  r2PorPaciente: Record<string, Record<string, number>>;
}

export function useNB4BResults(): NB4BResultsReturn {
  const nb4bData = useECGStore((s) => s.nb4bData);
  const loadingExperiments = useECGStore((s) => s.loadingExperiments);
  const errorsExperiments = useECGStore((s) => s.errorsExperiments);

  const global = useMemo(() => nb4bData?.global ?? [], [nb4bData?.global]);
  const porPaciente = useMemo(() => nb4bData?.porPaciente ?? [], [nb4bData?.porPaciente]);
  const resumen = useMemo(() => nb4bData?.resumen ?? [], [nb4bData?.resumen]);
  const ic95 = useMemo(() => nb4bData?.ic95 ?? [], [nb4bData?.ic95]);
  const wilcoxon = useMemo(() => nb4bData?.wilcoxon ?? [], [nb4bData?.wilcoxon]);
  const overfit = useMemo(() => nb4bData?.overfit ?? [], [nb4bData?.overfit]);
  const tdCnnGlobal = useMemo(() => nb4bData?.tdCnnGlobal ?? [], [nb4bData?.tdCnnGlobal]);
  const tdCnnPorPaciente = useMemo(() => nb4bData?.tdCnnPorPaciente ?? [], [nb4bData?.tdCnnPorPaciente]);

  const loading = loadingExperiments.nb4b;
  const error = errorsExperiments.nb4b;

  const bestGlobal = useMemo(() => {
    if (global.length === 0) return null;
    return global.reduce((best, curr) => curr.R2 > best.R2 ? curr : best);
  }, [global]);

  const mejorModelo = useMemo(() => {
    if (resumen.length === 0) return null;
    return resumen.reduce((best, curr) => curr.mu_R2 > best.mu_R2 ? curr : best);
  }, [resumen]);

  const modelos = useMemo(() => {
    const set = new Set<string>();
    global.forEach((r) => set.add(r.Modelo));
    resumen.forEach((r) => set.add(r.Modelo));
    return Array.from(set);
  }, [global, resumen]);

  const filtros = useMemo(() => {
    const set = new Set<string>();
    global.forEach((r) => set.add(r.Filtro));
    porPaciente.forEach((r) => set.add(r.Filtro));
    return Array.from(set);
  }, [global, porPaciente]);

  const r2PorPaciente = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    porPaciente.forEach((row) => {
      if (!result[row.Paciente]) result[row.Paciente] = {};
      result[row.Paciente][row.Modelo] = row.R2;
    });
    return result;
  }, [porPaciente]);

  return {
    global,
    porPaciente,
    resumen,
    ic95,
    wilcoxon,
    overfit,
    tdCnnGlobal,
    tdCnnPorPaciente,
    loading,
    error,
    bestGlobal,
    mejorModelo,
    modelos,
    filtros,
    r2PorPaciente,
  };
}
