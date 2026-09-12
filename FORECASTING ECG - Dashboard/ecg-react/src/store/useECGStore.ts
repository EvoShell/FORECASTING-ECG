import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseCSV } from '@/hooks/useCSV';
import type {
  ModelName,
  ECGSignal,
  PredictionResult,
  ModelMetrics,
  ExperimentType,
  NB1Data,
  NB2Data,
  NB3Data,
  NB4BData,
  NB5Data,
  NB5BData,
} from '@/types/ecg.types';

export type ThemeMode = 'light' | 'dark';

interface ECGStore {
  activeModel: ModelName;
  activePatient: string;
  theme: ThemeMode;
  lang: 'es' | 'en';
  isSidebarOpen: boolean;
  signal: ECGSignal | null;
  prediction: PredictionResult | null;
  metrics: ModelMetrics[];
  isLoading: boolean;

  activeExperiment: ExperimentType;
  activeFiltro: string | null;
  activeHorizonte: number | null;
  activeLookback: number | null;
  activeTabNB1: 'A' | 'B';

  nb1Data: NB1Data | null;
  nb2Data: NB2Data | null;
  nb3Data: NB3Data | null;
  nb4bData: NB4BData | null;
  nb5Data: NB5Data | null;
  nb5bData: NB5BData | null;

  loadingExperiments: { nb1: boolean; nb2: boolean; nb3: boolean; nb4b: boolean; nb5: boolean; nb5b: boolean };
  errorsExperiments: { nb1: string | null; nb2: string | null; nb3: string | null; nb4b: string | null; nb5: string | null; nb5b: string | null };

  setActiveModel: (model: ModelName) => void;
  setActivePatient: (id: string) => void;
  toggleTheme: () => void;
  setLang: (lang: 'es' | 'en') => void;
  toggleSidebar: () => void;
  setSignal: (signal: ECGSignal) => void;
  setPrediction: (result: PredictionResult) => void;
  setMetrics: (metrics: ModelMetrics[]) => void;
  setLoading: (loading: boolean) => void;

  setActiveExperiment: (experiment: ExperimentType) => void;
  setActiveFiltro: (filtro: string | null) => void;
  setActiveHorizonte: (horizonte: number | null) => void;
  setActiveLookback: (lookback: number | null) => void;
  setActiveTabNB1: (tab: 'A' | 'B') => void;

  setNB1Data: (data: NB1Data) => void;
  setNB2Data: (data: NB2Data) => void;
  setNB3Data: (data: NB3Data) => void;
  setNB4BData: (data: NB4BData) => void;
  setNB5Data: (data: NB5Data) => void;
  setNB5BData: (data: NB5BData) => void;

  setLoadingExperiment: (experiment: ExperimentType, loading: boolean) => void;
  setErrorExperiment: (experiment: ExperimentType, error: string | null) => void;
}

const BASE_URL = '/data';

// Remap columnas con Unicode mal decodificado (UTF-8 interpretado como Latin-1/Win-1252)
// Î"RÂ²_vs_Persistencia → ΔR²_vs_Persistencia
// Î"RÂ²_media → ΔR²_media
// Î¼_R2 → mu_R2
// EstadÃstico → Estadistico
function remapUnicode(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  // Los CSVs están en UTF-8; fetch().text() SIEMPRE decodifica como UTF-8.
  // Solo remapeamos columnas cuyos nombres en CSV difieren del campo en la interfaz TS.
  // (ΔR²_vs_Persistencia y ΔR²_media se usan tal cual en las interfaces → no remap)
  const REMAP: [string, string][] = [
    ['μ_R2', 'mu_R2'],
    ['σ_R2', 'sigma_R2'],
    ['Estadístico', 'Estadistico'],
    ['Métrica', 'Metrica'],
  ];
  return rows.map(r => {
    const entry = { ...r };
    for (const [bad, good] of REMAP) {
      if (bad in entry) {
        entry[good] = entry[bad];
        delete entry[bad];
      }
    }
    return entry;
  });
}

/**
 * Descarga un CSV de /data.
 *
 * Cuidado con el caso que antes pasaba desapercibido: si el archivo no existe, la
 * regla de reescritura del SPA (vercel.json, nginx.conf) devuelve index.html con
 * codigo 200. La comprobacion de response.ok pasa y parseCSV produce filas de
 * basura sin senalar error. Por eso aqui se rechaza explicitamente el HTML.
 */
async function fetchCSV<T extends Record<string, unknown>>(url: string): Promise<T[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} al pedir ${url}`);

  const text = await response.text();
  const inicio = text.slice(0, 400).toLowerCase();
  if (inicio.includes('<!doctype html') || inicio.includes('<html')) {
    throw new Error(
      `El archivo ${url} no existe: el servidor devolvio la pagina de la aplicacion. ` +
      `Comprueba que este publicado en public/data.`,
    );
  }
  if (text.trim().length === 0) throw new Error(`El archivo ${url} esta vacio.`);

  return parseCSV<T>(text);
}

export const useECGStore = create<ECGStore>()(
  persist(
    (set, get) => ({
      activeModel: 'GRU',
      activePatient: '100',
      theme: 'dark',
      lang: 'es',
      isSidebarOpen: true,
      signal: null,
      prediction: null,
      metrics: [],
      isLoading: false,

      activeExperiment: 'nb1',
      activeFiltro: null,
      activeHorizonte: null,
      activeLookback: null,
      activeTabNB1: 'A',

      nb1Data: null,
      nb2Data: null,
      nb3Data: null,
    nb4bData: null,
    nb5Data: null,
    nb5bData: null,

    loadingExperiments: { nb1: false, nb2: false, nb3: false, nb4b: false, nb5: false, nb5b: false },
    errorsExperiments: { nb1: null, nb2: null, nb3: null, nb4b: null, nb5: null, nb5b: null },

      setActiveModel: (model) => set({ activeModel: model }),
      setActivePatient: (id) => set({ activePatient: id }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setLang: (lang) => set({ lang }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSignal: (signal) => set({ signal }),
      setPrediction: (prediction) => set({ prediction }),
      setMetrics: (metrics) => set({ metrics }),
      setLoading: (isLoading) => set({ isLoading }),

      setActiveExperiment: (experiment) => set({ activeExperiment: experiment }),
      setActiveFiltro: (filtro) => set({ activeFiltro: filtro }),
      setActiveHorizonte: (horizonte) => set({ activeHorizonte: horizonte }),
      setActiveLookback: (lookback) => set({ activeLookback: lookback }),
      setActiveTabNB1: (tab) => set({ activeTabNB1: tab }),

      setNB1Data: (data) => set({ nb1Data: data }),
      setNB2Data: (data) => set({ nb2Data: data }),
      setNB3Data: (data) => set({ nb3Data: data }),
    setNB4BData: (data) => set({ nb4bData: data }),
    setNB5Data: (data) => set({ nb5Data: data }),
    setNB5BData: (data) => set({ nb5bData: data }),

      setLoadingExperiment: (experiment, loading) =>
        set((state) => ({
          loadingExperiments: { ...state.loadingExperiments, [experiment]: loading },
        })),
      setErrorExperiment: (experiment, error) =>
        set((state) => ({
          errorsExperiments: { ...state.errorsExperiments, [experiment]: error },
        })),
    }),
    {
      name: 'ecg-storage',
      partialize: (state) => ({
        activeModel: state.activeModel,
        activePatient: state.activePatient,
        theme: state.theme,
        isSidebarOpen: state.isSidebarOpen,
        activeExperiment: state.activeExperiment,
        activeFiltro: state.activeFiltro,
        activeTabNB1: state.activeTabNB1,
        lang: state.lang,
      }),
    }
  )
);

async function loadNB1Data(): Promise<void> {
  console.log('[Store] loadNB1Data() called');
  const store = useECGStore.getState();
  store.setLoadingExperiment('nb1', true);
  store.setErrorExperiment('nb1', null);
  try {
    const [resumenA, resumenB, rawA, rawB, ic95A, ic95B, _wilcoxonA, _wilcoxonB, rankingFiltros, rankingHorizontes, overfitA, overfitB] =
      await Promise.all([
        fetchCSV(`${BASE_URL}/nb1/resumen_ExpA.csv`),
        fetchCSV(`${BASE_URL}/nb1/resumen_ExpB.csv`),
        fetchCSV(`${BASE_URL}/nb1/resultados_A.csv`),
        fetchCSV(`${BASE_URL}/nb1/resultados_B.csv`),
        fetchCSV(`${BASE_URL}/nb1/ic95_r2_ExpA.csv`),
        fetchCSV(`${BASE_URL}/nb1/ic95_r2_ExpB.csv`),
        fetchCSV(`${BASE_URL}/nb1/wilcoxon_vs_persistencia_ExpA.csv`),
        fetchCSV(`${BASE_URL}/nb1/wilcoxon_vs_persistencia_ExpB.csv`),
        fetchCSV(`${BASE_URL}/nb1/ranking_filtros.csv`),
        fetchCSV(`${BASE_URL}/nb1/ranking_horizontes.csv`),
        fetchCSV(`${BASE_URL}/nb1/tabla_r2_train_test_ExpA.csv`),
        fetchCSV(`${BASE_URL}/nb1/tabla_r2_train_test_ExpB.csv`),
      ]);
    const wilcoxonA = remapUnicode(_wilcoxonA);
    const wilcoxonB = remapUnicode(_wilcoxonB);
    store.setNB1Data({
      resumenA: resumenA as unknown as NB1Data['resumenA'],
      resumenB: resumenB as unknown as NB1Data['resumenB'],
      rawA: rawA as unknown as NB1Data['rawA'],
      rawB: rawB as unknown as NB1Data['rawB'],
      ic95A: ic95A as unknown as NB1Data['ic95A'],
      ic95B: ic95B as unknown as NB1Data['ic95B'],
      wilcoxonA: wilcoxonA as unknown as NB1Data['wilcoxonA'],
      wilcoxonB: wilcoxonB as unknown as NB1Data['wilcoxonB'],
      rankingFiltros: rankingFiltros as unknown as NB1Data['rankingFiltros'],
      rankingHorizontes: rankingHorizontes as unknown as NB1Data['rankingHorizontes'],
      overfitA: overfitA as unknown as NB1Data['overfitA'],
      overfitB: overfitB as unknown as NB1Data['overfitB'],
    });
    console.log('[Store] NB1 data loaded successfully');
  } catch (error) {
    console.error('[Store] Error loading NB1:', error);
    store.setErrorExperiment('nb1', error instanceof Error ? error.message : 'Error loading NB1 data');
  } finally {
    store.setLoadingExperiment('nb1', false);
  }
}

async function loadNB2Data(): Promise<void> {
  const store = useECGStore.getState();
  store.setLoadingExperiment('nb2', true);
  store.setErrorExperiment('nb2', null);
  try {
    const [resumenA, resumenB, rawA, rawB, ic95A, ic95B, _wilcoxonA, _wilcoxonB, comparativa, overfitA, overfitB] = await Promise.all([
      fetchCSV(`${BASE_URL}/nb2/resumen_Exp A.csv`),
      fetchCSV(`${BASE_URL}/nb2/resumen_Exp B.csv`),
      fetchCSV(`${BASE_URL}/nb2/resultados_ExpA.csv`),
      fetchCSV(`${BASE_URL}/nb2/resultados_ExpB.csv`),
      fetchCSV(`${BASE_URL}/nb2/ic95_Exp A.csv`),
      fetchCSV(`${BASE_URL}/nb2/ic95_Exp B.csv`),
      fetchCSV(`${BASE_URL}/nb2/wilcoxon_vs_persistencia_Exp A.csv`),
      fetchCSV(`${BASE_URL}/nb2/wilcoxon_vs_persistencia_Exp B.csv`),
      fetchCSV(`${BASE_URL}/nb2/tabla_comparativa_NB1_NB2.csv`),
      fetchCSV(`${BASE_URL}/nb2/r2_train_test_Exp A.csv`),
      fetchCSV(`${BASE_URL}/nb2/r2_train_test_Exp B.csv`),
    ]);
    const wilcoxonA = remapUnicode(_wilcoxonA);
    const wilcoxonB = remapUnicode(_wilcoxonB);
    store.setNB2Data({
      resumenA: resumenA as unknown as NB2Data['resumenA'],
      resumenB: resumenB as unknown as NB2Data['resumenB'],
      rawA: rawA as unknown as NB2Data['rawA'],
      rawB: rawB as unknown as NB2Data['rawB'],
      ic95A: ic95A as unknown as NB2Data['ic95A'],
      ic95B: ic95B as unknown as NB2Data['ic95B'],
      wilcoxonA: wilcoxonA as unknown as NB2Data['wilcoxonA'],
      wilcoxonB: wilcoxonB as unknown as NB2Data['wilcoxonB'],
      comparativa: comparativa as unknown as NB2Data['comparativa'],
      overfitA: overfitA as unknown as NB2Data['overfitA'],
      overfitB: overfitB as unknown as NB2Data['overfitB'],
    });
  } catch (error) {
    store.setErrorExperiment('nb2', error instanceof Error ? error.message : 'Error loading NB2 data');
  } finally {
    store.setLoadingExperiment('nb2', false);
  }
}

async function loadNB4BData(): Promise<void> {
  const store = useECGStore.getState();
  store.setLoadingExperiment('nb4b', true);
  store.setErrorExperiment('nb4b', null);
  try {
    const [global, porPaciente, _resumen, _ic95, wilcoxon, overfit, tdCnnGlobal, tdCnnPorPaciente] = await Promise.all([
      fetchCSV(`${BASE_URL}/nb4b/resultados_nb4b_global.csv`),
      fetchCSV(`${BASE_URL}/nb4b/resultados_nb4b_por_paciente.csv`),
      fetchCSV(`${BASE_URL}/nb4b/resumen_nb4b.csv`),
      fetchCSV(`${BASE_URL}/nb4b/ic95_nb4b.csv`),
      fetchCSV(`${BASE_URL}/nb4b/wilcoxon_nb4b.csv`),
      fetchCSV(`${BASE_URL}/nb4b/tabla_r2_train_test_nb4b.csv`),
      fetchCSV(`${BASE_URL}/nb4b/resultados_td_cnn_global.csv`),
      fetchCSV(`${BASE_URL}/nb4b/resultados_td_cnn_por_paciente.csv`),
    ]);
    // Normaliza columnas con Unicode mal decodificado (μ_R2→mu_R2, σ_R2→sigma_R2)
    const remappedResumen = remapUnicode(_resumen as Record<string, unknown>[]);
    const ic95 = remapUnicode(_ic95 as Record<string, unknown>[]);

    store.setNB4BData({
      global: global as unknown as NB4BData['global'],
      porPaciente: porPaciente as unknown as NB4BData['porPaciente'],
      resumen: remappedResumen as unknown as NB4BData['resumen'],
      ic95: ic95 as unknown as NB4BData['ic95'],
      wilcoxon: wilcoxon as unknown as NB4BData['wilcoxon'],
      overfit: overfit as unknown as NB4BData['overfit'],
      tdCnnGlobal: tdCnnGlobal as unknown as NB4BData['tdCnnGlobal'],
      tdCnnPorPaciente: tdCnnPorPaciente as unknown as NB4BData['tdCnnPorPaciente'],
    });
  } catch (error) {
    store.setErrorExperiment('nb4b', error instanceof Error ? error.message : 'Error loading NB4B data');
  } finally {
    store.setLoadingExperiment('nb4b', false);
  }
}

function remapNB5BResumen(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return remapUnicode(rows);
}

async function loadNB5Data(): Promise<void> {
  const store = useECGStore.getState();
  store.setLoadingExperiment('nb5', true);
  store.setErrorExperiment('nb5', null);
  try {
    const [resumen, raw] = await Promise.all([
      fetchCSV(`${BASE_URL}/nb5/tabla_resumen.csv`),
      fetchCSV(`${BASE_URL}/nb5/resultados_lopo.csv`),
    ]);
    store.setNB5Data({
      resumen: resumen as unknown as NB5Data['resumen'],
      raw: raw as unknown as NB5Data['raw'],
    });
  } catch (error) {
    store.setErrorExperiment('nb5', error instanceof Error ? error.message : 'Error loading NB5 data');
  } finally {
    store.setLoadingExperiment('nb5', false);
  }
}

async function loadNB5BData(): Promise<void> {
  const store = useECGStore.getState();
  store.setLoadingExperiment('nb5b', true);
  store.setErrorExperiment('nb5b', null);
  try {
    const [resumen, raw, incart] = await Promise.all([
      fetchCSV(`${BASE_URL}/nb5b/tabla_resumen_v2.csv`).then(remapNB5BResumen),
      fetchCSV(`${BASE_URL}/nb5b/resultados_lopo_v2.csv`),
      fetchCSV(`${BASE_URL}/nb5b/validacion_incart.csv`),
    ]);
    store.setNB5BData({
      resumen: resumen as unknown as NB5BData['resumen'],
      raw: raw as unknown as NB5BData['raw'],
      incart: incart as unknown as NB5BData['incart'],
    });
  } catch (error) {
    store.setErrorExperiment('nb5b', error instanceof Error ? error.message : 'Error loading NB5B data');
  } finally {
    store.setLoadingExperiment('nb5b', false);
  }
}

async function loadNB3Data(): Promise<void> {
  const store = useECGStore.getState();
  store.setLoadingExperiment('nb3', true);
  store.setErrorExperiment('nb3', null);
  try {
    const [expA, expBResumen, expBTransferencia, expC] = await Promise.all([
      fetchCSV(`${BASE_URL}/nb3/expA_evaluacion_estandar.csv`),
      fetchCSV(`${BASE_URL}/nb3/expB_resumen.csv`),
      fetchCSV(`${BASE_URL}/nb3/expB_transferencia_cruzada.csv`),
      fetchCSV(`${BASE_URL}/nb3/expC_escenario_clinico.csv`),
    ]);
    store.setNB3Data({
      expA: expA as unknown as NB3Data['expA'],
      expBResumen: expBResumen as unknown as NB3Data['expBResumen'],
      expBTransferencia: expBTransferencia as unknown as NB3Data['expBTransferencia'],
      expC: expC as unknown as NB3Data['expC'],
    });
  } catch (error) {
    store.setErrorExperiment('nb3', error instanceof Error ? error.message : 'Error loading NB3 data');
  } finally {
    store.setLoadingExperiment('nb3', false);
  }
}

/**
 * Peticion en vuelo, compartida.
 *
 * Experimentos y Explorador leen los mismos 40 CSV y ambos disparan la carga al
 * montarse. Sin este testigo, navegar de una a otra mientras la primera aun descarga
 * lanzaba las 40 peticiones por segunda vez. Quien llegue durante la descarga se
 * engancha a la promesa que ya existe.
 */
let cargaEnCurso: Promise<void> | null = null;

export function loadAllExperimentsData(): Promise<void> {
  if (cargaEnCurso) return cargaEnCurso;
  cargaEnCurso = Promise.all([
    loadNB1Data(),
    loadNB2Data(),
    loadNB3Data(),
    loadNB4BData(),
    loadNB5Data(),
    loadNB5BData(),
  ])
    .then(() => undefined)
    .finally(() => { cargaEnCurso = null; });
  return cargaEnCurso;
}

export { loadNB1Data, loadNB2Data, loadNB3Data, loadNB4BData, loadNB5Data, loadNB5BData };
