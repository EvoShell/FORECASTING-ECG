/**
 * Hook especializado para cargar y acceder a datos de NB3 (Evaluación Comparativa)
 */

import { useMemo } from 'react';
import { useECGStore } from '@/store/useECGStore';
import type { NB3Data } from '@/types/ecg.types';

interface NB3ResultsReturn {
  expA: NB3Data['expA'];
  expBResumen: NB3Data['expBResumen'];
  expBTransferencia: NB3Data['expBTransferencia'];
  expC: NB3Data['expC'];
  loading: boolean;
  error: string | null;
}

export function useNB3Results(): NB3ResultsReturn {
  const nb3Data = useECGStore((s) => s.nb3Data);
  const loadingExperiments = useECGStore((s) => s.loadingExperiments);
  const errorsExperiments = useECGStore((s) => s.errorsExperiments);

  const expA = useMemo(() => nb3Data?.expA ?? [], [nb3Data?.expA]);
  const expBResumen = useMemo(() => nb3Data?.expBResumen ?? [], [nb3Data?.expBResumen]);
  const expBTransferencia = useMemo(() => nb3Data?.expBTransferencia ?? [], [nb3Data?.expBTransferencia]);
  const expC = useMemo(() => nb3Data?.expC ?? [], [nb3Data?.expC]);

  const loading = loadingExperiments.nb3;
  const error = errorsExperiments.nb3;

  return {
    expA,
    expBResumen,
    expBTransferencia,
    expC,
    loading,
    error,
  };
}
