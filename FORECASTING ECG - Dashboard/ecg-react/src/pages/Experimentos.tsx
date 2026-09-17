/**
 * Página de Experimentos
 * Muestra los resultados de todos los notebooks experimentales
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, Activity, Users, Zap, Filter, TrendingUp, BarChart3, RotateCcw } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { DataTable } from '@/components/data/DataTable';
import { MetricStat } from '@/components/metrics/MetricStat';
import { PlotlyBarChart, PlotlyGroupedBarChart } from '@/components/charts/PlotlyBarChart';
import { PlotlyChart } from '@/components/charts/PlotlyChart';
import { BoxPlot } from '@/components/charts/BoxPlot';
import { Heatmap } from '@/components/charts/Heatmap';
import { ForestPlot } from '@/components/charts/ForestPlot';
import { useECGStore, loadAllExperimentsData } from '@/store/useECGStore';
import { useNB1Results } from '@/hooks/useNB1Results';
import { useNB2Results } from '@/hooks/useNB2Results';
import { useNB4BResults } from '@/hooks/useNB4BResults';
import { useNB5Results } from '@/hooks/useNB5Results';
import { useNB5BResults } from '@/hooks/useNB5BResults';
import { useNB3Results } from '@/hooks/useNB3Results';
import { MODEL_COLORS } from '@/types/ecg.types';
import type { NB1ResumenA, NB1ResumenB, NB2ResumenA, NB2ResumenB, NB2RawA, NB2RawB, NB2Comparativa, NB4BGlobal, NB4BPorPaciente, NB4BResumen, NB4BIC95, NB5BResumen, NB1RawA, NB1RawB, NB1RankingFiltro, NB1RankingHorizonte, IC95Row, WilcoxonRow, OverfitRow, NB4BWilcoxon, NB4BOverfit } from '@/types/ecg.types';
import { Callout } from '@/components/ui/Callout';
import { FindingCard, FindingsSection } from '@/components/ui/FindingCard';
import { ImageGallery } from '@/components/ui/ImageGallery';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '@/i18n';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useNB7HPResults } from '@/hooks/useNB7HPResults';
import { NB7HPContent } from '@/components/experimentos/NB7HPContent';
import { NB8Content } from '@/components/experimentos/NB8Content';
import { Boton } from '@/components/ui/Boton';
import type { TFn } from '@/i18n';

type ExperimentTab = 'nb1' | 'nb2' | 'nb3' | 'nb4b' | 'nb5' | 'nb5b'
  | 'nb7' | 'nb8';

const getTabs = (t: TFn): { id: ExperimentTab; label: string; icon: React.ReactNode }[] => [
  { id: 'nb1', label: 'Exp. 1', icon: <Brain size={16} /> },
  { id: 'nb2', label: 'Exp. 2', icon: <Activity size={16} /> },
  { id: 'nb3', label: 'Exp. 3', icon: <BarChart3 size={16} /> },
  { id: 'nb4b', label: 'Exp. 4', icon: <Users size={16} /> },
  { id: 'nb5b', label: 'Exp. 5', icon: <Zap size={16} /> },
  { id: 'nb5', label: 'Exp. 6', icon: <Zap size={16} /> },
  { id: 'nb7', label: 'Exp. 7', icon: <Filter size={16} /> },
  { id: 'nb8', label: 'Exp. 8', icon: <TrendingUp size={16} /> },
];

const getExperimentMeta = (t: TFn) => ({
  nb1: {
    title: t('Modelos Tradicionales de ML para Predicción de Señales ECG', 'Traditional ML Models for ECG Signal Prediction'),
    notebook: '01_tradicionales.ipynb',
    datos: '/data/nb1/',
    description: t('Modelos clásicos: LinReg, DT, RF, SVR, MLP, ARIMA, Persistencia', 'Classic models: LinReg, DT, RF, SVR, MLP, ARIMA, Persistence'),
    dataset: t('MIT-BIH Arrhythmia Database · 48 pacientes · 360 Hz · MLII', 'MIT-BIH Arrhythmia Database · 48 patients · 360 Hz · MLII'),
    partition: t('80% entrenamiento / 20% prueba · estrictamente temporal', '80% training / 20% test · strictly temporal'),
    filters: 'F_SIN, F_N, F_PB, F_N+PB, F_MED, F_N+MED, F_N+PB+MED',
  },
  nb2: {
    title: t('Deep Learning para Predicción de Señales ECG', 'Deep Learning for ECG Signal Prediction'),
    notebook: '02_deep_learning.ipynb',
    datos: '/data/nb2/',
    description: t('Modelos DL: LSTM, GRU, CNN-LSTM, CNN-GRU', 'DL models: LSTM, GRU, CNN-LSTM, CNN-GRU'),
    dataset: t('MIT-BIH Arrhythmia Database · 48 pacientes · 360 Hz · MLII', 'MIT-BIH Arrhythmia Database · 48 patients · 360 Hz · MLII'),
    partition: t('80% entrenamiento / 20% prueba · estrictamente temporal', '80% training / 20% test · strictly temporal'),
    filters: 'F_N, F_MED, F_N+MED, F_N+PB+MED',
  },
  nb3: {
    title: t('Evaluación del Paradigma de Entrenamiento y Transferencia entre Pacientes', 'Evaluation of the Training Paradigm and Cross-Patient Transfer'),
    notebook: '03_evaluation.ipynb',
    datos: '/data/nb3/',
    description: t('Evalúa el paradigma de entrenamiento y la transferencia entre pacientes', 'Evaluates the training paradigm and transfer between patients'),
    dataset: t('MIT-BIH Arrhythmia Database · 10 pacientes', 'MIT-BIH Arrhythmia Database · 10 patients'),
    partition: '',
    filters: '',
  },
  nb4b: {
    title: t('Paradigma Multi-sujeto para Predicción de Señales ECG', 'Multi-subject Paradigm for ECG Signal Prediction'),
    notebook: '04_compuesta multi-sujeto.ipynb',
    datos: '/data/nb4b/',
    description: t('Modelo global único entrenado con el conjunto agregado de los 48 pacientes', 'Single global model trained on the aggregated set of the 48 patients'),
    dataset: t('MIT-BIH Arrhythmia Database · 48 pacientes · un segmento continuo de 60 segundos por paciente', 'MIT-BIH Arrhythmia Database · 48 patients · one continuous 60-second segment per patient'),
    partition: t('Conjunto agregado multi-sujeto', 'Aggregated multi-subject set'),
    filters: 'F_N, F_MED, F_N+PB+MED',
  },
  nb5b: {
    title: t('Protocolo Cross-patient Leave-One-Patient-Out', 'Cross-patient Leave-One-Patient-Out Protocol'),
    notebook: '05_cross_patient.ipynb',
    datos: '/data/nb5b/',
    description: t('Modelos GRU_base, CNN_GRU, BiGRU_MHA y sus versiones calibradas, más dos conjuntos. Calibración con 15 latidos del paciente objetivo.', 'Models GRU_base, CNN_GRU, BiGRU_MHA and their calibrated versions, plus two ensembles. Calibration with 15 beats from the target patient.'),
    dataset: t('MIT-BIH Arrhythmia Database · 48 pacientes', 'MIT-BIH Arrhythmia Database · 48 patients'),
    partition: t('Leave-One-Patient-Out · 48 pliegues', 'Leave-One-Patient-Out · 48 folds'),
    filters: 'F_N+PB+MED',
  },
  nb5: {
    title: t('Protocolo Multi-step Leave-One-Patient-Out · Arquitectura Final', 'Multi-step Leave-One-Patient-Out Protocol · Final Architecture'),
    notebook: '06_Cross_patient_MultiStep.ipynb',
    datos: '/data/nb5/',
    description: t('Arquitectura final CNN-GRU-ATTN. Predicción simultánea de 3 latidos con 5 de contexto. Calibración con 30 latidos.', 'Final CNN-GRU-ATTN architecture. Simultaneous prediction of 3 beats with 5 of context. Calibration with 30 beats.'),
    dataset: t('MIT-BIH (48) e INCART (75) · 123 pacientes', 'MIT-BIH (48) and INCART (75) · 123 patients'),
    partition: t('Leave-One-Patient-Out · 123 pliegues', 'Leave-One-Patient-Out · 123 folds'),
    filters: t('F_NB6: notch a 60 Hz, paso banda Butterworth de 0.5 a 40 Hz, eliminación de tendencia lineal y normalización z', 'F_NB6: 60 Hz notch, Butterworth band-pass from 0.5 to 40 Hz, linear detrending and z-normalization'),
  },
  nb7: {
    title: t('B\u00fasqueda sistem\u00e1tica de hiperpar\u00e1metros',
      'Systematic Hyperparameter Search'),
    notebook: '07_hiperparametros.ipynb',
    datos: '/data/nb7/',
    description: t(
      'B\u00fasqueda aleatoria de 20 configuraciones por arquitectura sobre CNN-GRU-ATTN y GRU, con an\u00e1lisis de sensibilidad marginal; b\u00fasqueda equivalente sobre RF, DT y MLP',
      'Random search of 20 configurations per architecture over CNN-GRU-ATTN and GRU, with marginal sensitivity analysis; equivalent search over RF, DT and MLP'),
    dataset: t('Cohorte reducida de 50 pacientes \u00b7 10 pliegues LOPO evaluados',
      'Reduced cohort of 50 patients \u00b7 10 LOPO folds evaluated'),
    partition: t('LOPO \u00b7 entrenamiento con los 49 pacientes restantes \u00b7 20 \u00e9pocas fijas \u00b7 semilla 42',
      'LOPO \u00b7 training on the remaining 49 patients \u00b7 20 fixed epochs \u00b7 seed 42'),
    filters: t('F_NB6 en las arquitecturas profundas \u00b7 F_N+MED en los modelos tradicionales',
      'F_NB6 for the deep architectures \u00b7 F_N+MED for the traditional models'),
  },
  nb8: {
    title: t('Error por clase de latido y detecci\u00f3n de evento',
      'Per-class Beat Error and Event Detection'),
    notebook: '08_deteccion_evento.ipynb',
    datos: '/data/nb8/',
    description: t(
      'Distribuci\u00f3n del error de predicci\u00f3n por clase AAMI y evaluaci\u00f3n del residuo como indicador de latido an\u00f3malo',
      'Prediction error distribution by AAMI class and evaluation of the residual as an indicator of anomalous beats'),
    dataset: t('Cohorte reducida de 50 pacientes \u00b7 20 de MIT-BIH y 30 de INCART',
      'Reduced cohort of 50 patients \u00b7 20 from MIT-BIH and 30 from INCART'),
    partition: t('LOPO \u00b7 cada pliegue entrena con los 122 pacientes restantes',
      'LOPO \u00b7 each fold trains on the remaining 122 patients'),
    filters: 'F_NB6',
  },
});

/** Identificadores validos de pestaña, para no fiarse de lo que venga en la URL. */
const TABS_VALIDAS: ExperimentTab[] = ['nb1', 'nb2', 'nb3', 'nb4b', 'nb5b', 'nb5', 'nb7', 'nb8'];

export function ExperimentosPage() {
  // La pestaña vive en la direccion: `/experimentos?exp=nb7`. Asi el enlace se
  // puede compartir, sobrevive a una recarga y el boton Atras del navegador
  // recorre las pestañas visitadas. Un valor desconocido cae en la primera.
  const [searchParams, setSearchParams] = useSearchParams();
  const solicitada = searchParams.get('exp') as ExperimentTab | null;
  const activeTab: ExperimentTab =
    solicitada && TABS_VALIDAS.includes(solicitada) ? solicitada : 'nb1';

  const setActiveTab = (id: ExperimentTab) => {
    // `replace: false` deja rastro en el historial, que es lo que hace util al
    // boton Atras. La primera pestaña no ensucia la direccion.
    setSearchParams(id === 'nb1' ? {} : { exp: id });
  };
  const nb1Data = useECGStore((s) => s.nb1Data);
  const nb2Data = useECGStore((s) => s.nb2Data);
  const nb4bData = useECGStore((s) => s.nb4bData);
  const nb5Data = useECGStore((s) => s.nb5Data);
  const nb5bData = useECGStore((s) => s.nb5bData);
  const loadingExperiments = useECGStore((s) => s.loadingExperiments);
  const { t } = useLang();
  const TABS = getTabs(t);
  const EXPERIMENT_META = getExperimentMeta(t);

  useEffect(() => {
    if (!nb1Data && !nb2Data && !nb4bData && !nb5Data && !nb5bData) {
      loadAllExperimentsData().catch(err => console.error('[Experimentos] Error:', err));
    }
  }, []);

  const nb1 = useNB1Results();
  const nb2 = useNB2Results();
  const nb3 = useNB3Results();
  const nb4b = useNB4BResults();
  const nb5 = useNB5Results();
  const nb5b = useNB5BResults();
  const nb7 = useNB7HPResults();

  // `!nb1Data` estaba dentro de esta condicion: si la carga de NB1 fallaba, la bandera
  // volvia a `false` pero `nb1Data` seguia nulo, con lo que `isLoading` se quedaba en
  // `true` para siempre y el error nunca llegaba a mostrarse. Ahora la espera depende
  // solo de que haya peticiones en vuelo.
  const cargando = loadingExperiments.nb1 || loadingExperiments.nb2 || loadingExperiments.nb3
    || loadingExperiments.nb4b || loadingExperiments.nb5 || loadingExperiments.nb5b;

  // Terminada la carga sin datos y sin error declarado, tambien es un fallo: el CSV
  // pudo llegar vacio o con otra cabecera. Callar seria peor que avisar.
  const erroresExp = useECGStore((s) => s.errorsExperiments);
  const fallo = erroresExp.nb1 || erroresExp.nb2 || erroresExp.nb3
    || erroresExp.nb4b || erroresExp.nb5 || erroresExp.nb5b
    || (!cargando && !nb1Data ? t('No se han podido leer los datos de los experimentos.',
                                  'Experiment data could not be read.') : null);
  // El aviso de error va primero: si algo ha fallado, mostrarlo importa mas que
  // seguir esperando.
  if (fallo) {
    return (
      <PageWrapper>
        <div
          role="alert"
          style={{
            padding: '28px',
            background: 'var(--crit-tint)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--crit)',
            color: 'var(--text)',
          }}
        >
          <strong style={{ color: 'var(--crit)' }}>
            {t('No se han podido cargar los datos', 'Data could not be loaded')}
          </strong>
          <p style={{ marginTop: '8px', color: 'var(--text-sub)' }}>{fallo}</p>
          <p style={{ marginTop: '8px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            {t('Los archivos se leen de /data/. Comprueba la conexion y vuelve a intentarlo.',
               'Files are read from /data/. Check the connection and try again.')}
          </p>
          <Boton
            onClick={() => { void loadAllExperimentsData(); }}
            variante="primario"
            icono={<RotateCcw size={15} aria-hidden />}
            style={{ marginTop: 16 }}
          >
            {t('Reintentar', 'Retry')}
          </Boton>
        </div>
      </PageWrapper>
    );
  }

  if (cargando) {
    return (
      <PageWrapper>
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: '16px' }}>{t('Cargando datos...', 'Loading data...')}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const meta = EXPERIMENT_META[activeTab as keyof typeof EXPERIMENT_META];

  return (
    <PageWrapper>
      <div style={{ marginBottom: '24px' }}>
        <p className="eyebrow">{t('Resultados Experimentales', 'Experimental Results')}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: 0 }}>
          {t('Experimentos', 'Experiments')}
        </h1>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Experimentos" style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px', width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, icon }) => (
          <Boton
            key={id}
            onClick={() => setActiveTab(id)}
            variante="sutil"
            tamano="sm"
            activo={activeTab === id}
            icono={icon}
            role="tab"
            aria-selected={activeTab === id}
            style={{ fontFamily: 'var(--font-data)' }}
          >
            {label}
          </Boton>
        ))}
      </div>

      {/* Ficha del experimento activo. Da uso a EXPERIMENT_META, que antes se
          calculaba sin leerse, y expone la cadena de preprocesamiento, que no
          figuraba en ninguna cabecera. */}
      {meta && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px 24px',
          marginBottom: '24px',
          padding: '14px 18px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}>
          {([
            [t('Cuaderno', 'Notebook'), meta.notebook],
            [t('Base de datos', 'Dataset'), meta.dataset],
            [t('Partici\u00f3n', 'Partition'), meta.partition],
            [t('Preprocesamiento', 'Preprocessing'), meta.filters],
            [t('Procedencia de los datos', 'Data source'), meta.datos],
          ] as [string, string][])
            .filter(([, v]) => Boolean(v))
            .map(([k, v]) => (
              <div key={k}>
                <div style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 'var(--fs-3xs)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '3px',
                }}>{k}</div>
                <div style={{
                  fontSize: 'var(--fs-2xs)',
                  color: 'var(--text-sub)',
                  lineHeight: 1.45,
                }}>{v}</div>
              </div>
            ))}
        </div>
      )}

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'nb1' && <NB1Content {...nb1} />}
        {activeTab === 'nb2' && <NB2Content 
          resumenA={nb2.resumenA} 
          resumenB={nb2.resumenB}
          rawA={nb2.rawA}
          rawB={nb2.rawB}
          ic95A={nb2.ic95A}
          ic95B={nb2.ic95B}
          wilcoxonA={nb2.wilcoxonA}
          wilcoxonB={nb2.wilcoxonB}
          overfitA={nb2.overfitA}
          overfitB={nb2.overfitB}
          comparativa={nb2.comparativa}
          loading={nb2.loading}
          error={nb2.error}
          bestModelA={nb2.bestModelA}
          bestModelB={nb2.bestModelB}
        />}
        {activeTab === 'nb3' && <NB3Content {...nb3} />}
      {activeTab === 'nb4b' && <NB4BContent {...nb4b} />}
      {activeTab === 'nb5b' && <NB5BContent {...nb5b} />}
      {activeTab === 'nb5' && (
        <ErrorBoundary ambito="el experimento NB6">
          <NB5Content {...nb5} />
        </ErrorBoundary>
      )}
      {activeTab === 'nb7' && (
        <ErrorBoundary ambito="el experimento NB7">
          <NB7HPContent {...nb7} />
        </ErrorBoundary>
      )}
      {activeTab === 'nb8' && (
        <ErrorBoundary ambito="el experimento NB8">
          <NB8Content />
        </ErrorBoundary>
      )}
      </motion.div>
    </PageWrapper>
  );
}

// ============================================================================
// NB1 Content - Modelos Tradicionales
// ============================================================================
interface NB1ContentProps {
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

function NB1Content(props: NB1ContentProps) {
  const {
    resumenA, resumenB, rawA, rawB,
    ic95A, ic95B, wilcoxonA, wilcoxonB,
    rankingFiltros, rankingHorizontes, overfitA, overfitB,
    bestModelA, bestModelB, mejorFiltro, mejorFiltroR2, mejorFiltroLB, horizontes, lookbacks,
    sigVsPersistA, sigVsPersistB, bestRmseA, bestRmseB,
    gapBestA, gapBestB, positiveR2CountA, positiveR2CountB,
    mejorHorizonte, mejorHorizonteR2,
    loading, error
  } = props;

  const theme = useECGStore((s) => s.theme);
  const { t } = useLang();
  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'expA' | 'expB' | 'estadisticas' | 'filtros_hallazgos'>('resumen');

  // ── Todos los hooks ANTES de cualquier return condicional ─────────────────
  const modelosComp = ['DT', 'RF', 'SVR_rbf', 'MLP'];

  const heatmapA = useMemo(() => {
    const filtered = rawA.filter(r => modelosComp.includes(r.Modelo));
    const groups: Record<string, Record<string, number[]>> = {};
    filtered.forEach(r => {
      if (!groups[r.Filtro]) groups[r.Filtro] = {};
      if (!groups[r.Filtro][`H=${r.Horizonte_seg}s`]) groups[r.Filtro][`H=${r.Horizonte_seg}s`] = [];
      groups[r.Filtro][`H=${r.Horizonte_seg}s`].push(r.R2);
    });
    const x = [...new Set(filtered.map(r => `H=${r.Horizonte_seg}s`))].sort((a, b) => {
      const ha = parseFloat(a.replace('H=', '').replace('s', ''));
      const hb = parseFloat(b.replace('H=', '').replace('s', ''));
      return ha - hb;
    });
    const y = Object.keys(groups).sort((a, b) => {
      const avgA = Object.values(groups[a]).flat().reduce((s, v) => s + v, 0) / Object.values(groups[a]).flat().length;
      const avgB = Object.values(groups[b]).flat().reduce((s, v) => s + v, 0) / Object.values(groups[b]).flat().length;
      return avgB - avgA;
    });
    const z = y.map(filtro => x.map(h => groups[filtro][h] ? groups[filtro][h].reduce((a, b) => a + b, 0) / groups[filtro][h].length : NaN));
    return { x, y, z };
  }, [rawA]);

  const heatmapB = useMemo(() => {
    const filtered = rawB.filter(r => modelosComp.includes(r.Modelo));
    const groups: Record<string, Record<string, number[]>> = {};
    filtered.forEach(r => {
      if (!groups[r.Filtro]) groups[r.Filtro] = {};
      if (!groups[r.Filtro][`LB=${r.Lookback}`]) groups[r.Filtro][`LB=${r.Lookback}`] = [];
      groups[r.Filtro][`LB=${r.Lookback}`].push(r.R2);
    });
    const x = [...new Set(filtered.map(r => `LB=${r.Lookback}`))].sort((a, b) => {
      const ha = parseInt(a.replace('LB=', ''));
      const hb = parseInt(b.replace('LB=', ''));
      return ha - hb;
    });
    const y = Object.keys(groups).sort((a, b) => {
      const avgA = Object.values(groups[a]).flat().reduce((s, v) => s + v, 0) / Object.values(groups[a]).flat().length;
      const avgB = Object.values(groups[b]).flat().reduce((s, v) => s + v, 0) / Object.values(groups[b]).flat().length;
      return avgB - avgA;
    });
    const z = y.map(filtro => x.map(lb => groups[filtro][lb] ? groups[filtro][lb].reduce((a, b) => a + b, 0) / groups[filtro][lb].length : NaN));
    return { x, y, z };
  }, [rawB]);

  // ── Returns condicionales DESPUÉS de todos los hooks ─────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>{t('Cargando datos de NB1...', 'Loading NB1 data...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alert)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>Error: {error}</div>
      </div>
    );
  }

  // Calcular mejoras y estadísticas
  const bestA_r2 = bestModelA?.R2_media ?? 0;
  const bestB_r2 = bestModelB?.R2_media ?? 0;
  const mejoraPct = bestA_r2 !== 0 ? Math.round(((bestB_r2 - bestA_r2) / Math.abs(bestA_r2)) * 100) : 0;
  const nEvalTotal = (resumenA[0]?.N ?? 0) + (resumenB[0]?.N ?? 0);

  // Bar chart data con colores
  const barDataA = resumenA.map((r: any) => ({
    name: r.Modelo,
    value: r.R2_media,
    color: MODEL_COLORS[r.Modelo] || '#6b7280',
    error: r.R2_std,
  }));

  const barDataB = resumenB.filter(r => r.R2_media > -1e6).map(r => ({
    name: r.Modelo,
    value: r.R2_media,
    color: MODEL_COLORS[r.Modelo] || '#6b7280',
    error: r.R2_std,
  }));

  // Forest plot data
  const forestDataA = ic95A.map(r => ({
    modelo: r.Modelo,
    media: r.R2_media,
    icInf: r.IC_95_inf,
    icSup: r.IC_95_sup,
    color: MODEL_COLORS[r.Modelo],
  }));

  const forestDataB = ic95B.map(r => ({
    modelo: r.Modelo,
    media: r.R2_media,
    icInf: r.IC_95_inf,
    icSup: r.IC_95_sup,
    color: MODEL_COLORS[r.Modelo],
  }));

  const subTabs = [
    { id: 'resumen' as const, label: t('Resumen', 'Summary'), icon: <TrendingUp size={14} /> },
    { id: 'expA' as const, label: t('Exp A: Multi-step', 'Exp A: Multi-step'), icon: <Activity size={14} /> },
    { id: 'expB' as const, label: t('Exp B: Latidos', 'Exp B: Beat-based'), icon: <Zap size={14} /> },
    { id: 'estadisticas' as const, label: t('Estadísticas', 'Statistics'), icon: <BarChart3 size={14} /> },
    { id: 'filtros_hallazgos' as const, label: t('Filtros / Hallazgos', 'Filters / Findings'), icon: <Filter size={14} /> },
  ];

  return (
    <div>
      {/* Above the Fold Summary Panel */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: '24px',
        marginBottom: '24px',
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {/* Left: Metadata */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ letterSpacing: '2px', fontSize: 'var(--fs-xs)' }}>Experimento 1 · NB1</span>
              <span style={{ fontSize: 'var(--fs-xs)', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-data)', color: 'var(--signal)' }}>01_tradicionales.ipynb</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>
              {t('Modelos Tradicionales de ML para Predicción de Señales ECG', 'Traditional ML Models for ECG Signal Prediction')}
            </h2>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', margin: 0 }}>
              {t('Modelos clásicos: LinReg, DT, RF, SVR, MLP, ARIMA, Persistencia', 'Classic models: LinReg, DT, RF, SVR, MLP, ARIMA, Persistence')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            <span><strong>Dataset:</strong> MIT-BIH Arrhythmia Database · 48 pacientes · 360 Hz · MLII</span>
            <span><strong>Partición:</strong> 80% entrenamiento / 20% prueba · temporal</span>
          </div>
        </div>

        {/* Right: Key KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: '10px', flex: '1 1 320px', alignContent: 'center' }}>
          <MetricStat
            densa
            fase="E1"
            etiqueta={<>{t('Mejor R² Exp A', 'Best R² Exp A')}</>}
            valor={<>{bestA_r2.toFixed(4)}</>}
            nota={<>{bestModelA?.Modelo}</>}
          />
          <MetricStat
            densa
            fase="E1"
            etiqueta={<>{t('Mejor R² Exp B', 'Best R² Exp B')}</>}
            valor={<>{bestB_r2.toFixed(4)}</>}
            nota={<>{bestModelB?.Modelo}</>}
          />
          <MetricStat
            densa
            fase="E1"
            etiqueta={<>{t('Mejora A→B', 'Improvement A→B')}</>}
            valor={<>+{mejoraPct}%</>}
            nota={<>{t('Latido-a-latido', 'Beat-to-beat')}</>}
          />
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        width: 'fit-content',
        flexWrap: 'wrap',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {subTabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeSubTab === id ? 'var(--accent-bg, rgba(6, 182, 212, 0.15))' : 'transparent',
              color: activeSubTab === id ? 'var(--signal, #06b6d4)' : 'var(--text-sub)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-xs)',
              fontWeight: activeSubTab === id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeSubTab === 'resumen' && (
          <div>
            {/* KPI Cards (8) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))', gap: '10px', marginBottom: '28px' }}>
              <MetricStat
                densa
                fase="E1"
                etiqueta={<>{t('Mejor R² · Exp A', 'Best R² · Exp A')}</>}
                valor={<>{bestA_r2.toFixed(4)}</>}
                nota={<>{bestModelA?.Modelo} · σ={bestModelA?.R2_std?.toFixed(3)}</>}
              />
              <MetricStat
                densa
                fase="E1"
                etiqueta={<>{t('Mejor R² · Exp B', 'Best R² · Exp B')}</>}
                valor={<>{bestB_r2.toFixed(4)}</>}
                nota={<>{bestModelB?.Modelo} · σ={bestModelB?.R2_std?.toFixed(3)}</>}
              />
              <MetricStat
                densa
                fase="E1"
                etiqueta={<>{t('Mejora A→B', 'Improvement A→B')}</>}
                valor={<>+{mejoraPct}%</>}
                nota={<>{t('Reformulación latido-a-latido', 'Beat-to-beat reformulation')}</>}
              />
              <MetricStat
                densa
                fase="E1"
                etiqueta={<>{t('Sig. vs Persist.', 'Sig. vs Persist.')}</>}
                valor={<>{sigVsPersistA}/{sigVsPersistB}</>}
                nota={<>{t('Wilcoxon Exp A / Exp B', 'Wilcoxon Exp A / Exp B')}</>}
              />
              <MetricStat
                densa
                fase="E1"
                etiqueta={<>{t('Gap Train-Test', 'Train-Test Gap')}</>}
                valor={<>{gapBestB.toFixed(3)}</>}
                nota={<>{bestModelB?.Modelo} · Exp B</>}
              />
              <MetricStat
                densa
                fase="E1"
                etiqueta={<>{t('Mejor RMSE · B', 'Best RMSE · B')}</>}
                valor={<>{bestRmseB.toFixed(4)}</>}
                nota={<>Exp B · one-beat-ahead</>}
              />
              <MetricStat
                densa
                fase="E1"
                etiqueta={<>{t('R² Positivos', 'Positive R²')}</>}
                valor={<>{positiveR2CountA}/{positiveR2CountB}</>}
                nota={<>{t('de 5 modelos (A / B)', 'of 5 models (A / B)')}</>}
              />
              <MetricStat
                densa
                fase="E1"
                etiqueta={<>{t('Filtro / H óptimo', 'Optimal Filter / H')}</>}
                valor={<>{mejorFiltro ?? '—'}</>}
                nota={<>{mejorFiltroR2 != null ? `R²=${mejorFiltroR2.toFixed(3)} · LB=${mejorFiltroLB}` : (mejorHorizonte != null ? `H=${mejorHorizonte}s · R²=${mejorHorizonteR2?.toFixed(3)}` : '—')}</>}
              />
            </div>

            {/* Interpretación */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)' }}>
                {t('Interpretación de Resultados en el Contexto del Problema', 'Interpretation of Results in Context')}
              </h3>
              <div style={{
                padding: '16px 18px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--fs-sm)',
                lineHeight: 1.65,
                color: 'var(--text-sub)',
                maxWidth: '92ch',
              }}>
                  <p style={{ marginBottom: '12px' }}>
                    {t('Los resultados del NB1 establecen una línea base cuantitativa rigurosa para la predicción de señales ECG mediante modelos tradicionales de aprendizaje automático. La principal conclusión es que los modelos clásicos de ML presentan limitaciones fundamentales para la tarea de forecasting de ECG, particularmente en la formulación multi-step directo.', 'The NB1 results establish a rigorous quantitative baseline for ECG signal prediction using traditional machine learning models. The main conclusion is that classical ML models have fundamental limitations for the ECG forecasting task, particularly in the direct multi-step formulation.')}
                  </p>
                  <p style={{ marginBottom: '12px' }}>
                    {t('El contraste entre los Experimentos A y B constituye el hallazgo más significativo: el paso de una formulación temporal continua (5 s de entrada → 1–5 s de salida) a una formulación basada en latidos (3–10 latidos → 1 latido) elevó el R² máximo de 0.16 a 0.65. Este incremento de 4× no se atribuye a una mejora algorítmica, sino a la ', 'The contrast between Experiments A and B constitutes the most significant finding: the shift from a continuous temporal formulation (5 s input → 1–5 s output) to a beat-based formulation (3–10 beats → 1 beat) raised the maximum R² from 0.16 to 0.65. This 4× increase is not attributed to an algorithmic improvement, but to the ')}
                    <strong>{t('reformulación del espacio de características', 'feature space reformulation')}</strong>
                    {t(': la segmentación por latidos impone una estructura cuasiperiódica que regulariza implícitamente la tarea de predicción. Cada latido, al estar normalizado a 256 muestras, opera como una representación compacta que reduce la dimensionalidad efectiva del problema.', ': beat segmentation imposes a quasi-periodic structure that implicitly regularizes the prediction task. Each beat, being normalized to 256 samples, operates as a compact representation that reduces the effective dimensionality of the problem.')}
                  </p>
                  <p>
                    {t('Sin embargo, incluso el mejor resultado en Exp B (R² = 0.6454) debe interpretarse con cautela. En el contexto de señales ECG, un R² de 0.65 implica que el 35% de la varianza de la morfología del siguiente latido permanece inexplicada. En zonas de transición de ritmo normal a arritmia, precisamente el escenario de mayor relevancia clínica, este margen de error puede ser crítico, ya que las alteraciones morfológicas que distinguen latidos normales de ectópicos operan en rangos de amplitud que pueden quedar enmascarados por el error residual.', 'However, even the best result in Exp B (R² = 0.6454) should be interpreted with caution. In the context of ECG signals, an R² of 0.65 implies that 35% of the variance in the next beat morphology remains unexplained. In transition zones from normal rhythm to arrhythmia, precisely the most clinically relevant scenario, this margin of error can be critical, as the morphological alterations that distinguish normal from ectopic beats operate in amplitude ranges that may be masked by the residual error.')}
                  </p>
              </div>
            </div>

            {/* CONSIDERACIONES METODOLÓGICAS */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                {t('Consideraciones Metodológicas', 'Methodological Considerations')}
              </h2>
              <Callout type="warning" title={t('Advertencia · Comparabilidad SVR_rbf en Exp B', 'Warning · SVR_rbf Comparability in Exp B')}>
                {t('SVR_rbf predice un valor escalar (el primer valor del R-peak del siguiente latido), no el vector completo de 256 muestras que predicen RF, MLP y DT. Sus métricas de MSE y MAE no son directamente comparables con los demás modelos en Exp B.', 'SVR_rbf predicts a scalar value (the first R-peak value of the next beat), not the full 256-sample vector predicted by RF, MLP, and DT. Its MSE and MAE metrics are not directly comparable with the other models in Exp B.')}
              </Callout>
              <Callout type="warning" title={t('Advertencia · Escala LinReg en Exp B', 'Warning · LinReg Scale in Exp B')}>
                {t('El colapso de LinReg se debe a multicolinealidad en la matriz de características latido-a-latido. Excluir de gráficas comparativas de escala normal.', 'LinReg collapse is due to multicollinearity in the beat-to-beat feature matrix. Exclude from normal-scale comparative charts.')}
              </Callout>
              <Callout type="note" title={t('Nota · Partición temporal', 'Note · Temporal Split')}>
                {t('La partición 80/20 es estrictamente temporal sin aleatorizar para preservar la estructura secuencial de la señal ECG y prevenir data leakage.', 'The 80/20 split is strictly temporal without randomization to preserve the sequential structure of the ECG signal and prevent data leakage.')}
              </Callout>
              <Callout type="note" title={t('Nota · Evaluación intra-paciente', 'Note · Intra-patient Evaluation')}>
                {t('Todos los modelos fueron entrenados y evaluados dentro del mismo paciente. La generalización inter-paciente se evaluará en NB5B.', 'All models were trained and evaluated within the same patient. Inter-patient generalization will be evaluated in NB5B.')}
              </Callout>
            </div>
          </div>
        )}

        {activeSubTab === 'expA' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                {t('Experimento A · Multi-step Directo', 'Experiment A · Direct Multi-step')}
              </h2>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', background: 'var(--elevated)', padding: '4px 8px', borderRadius: '4px' }}>
                {(resumenA[0]?.N ?? 0).toLocaleString()} {t('evaluaciones', 'evaluations')}
              </span>
            </div>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '20px' }}>
              {t('Predicción de ventanas de 1, 3 y 5 s a partir de 5 s de contexto.', 'Prediction of 1, 3, and 5 s windows from 5 s of context.')}
            </p>

            {/* Tabla Resumen A */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                {t('Tabla de Resultados - Experimento A', 'Results Table - Experiment A')}
              </h3>
              <DataTable
                data={resumenA as unknown as Record<string, unknown>[]}
                title=""
                columns={[
                  { key: 'Modelo', label: t('Modelo', 'Model') },
                  { key: 'N', label: 'N' },
                  { key: 'R2_media', label: t('R² Media', 'R² Mean') },
                  { key: 'R2_std', label: 'R² Std' },
                  { key: 'MSE_media', label: 'MSE' },
                  { key: 'RMSE_media', label: 'RMSE' },
                  { key: 'MAE_media', label: 'MAE' },
                ]}
              />
            </div>

            {/* Bar Chart A */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                {t('R² por Modelo - Experimento A', 'R² by Model - Experiment A')}
              </h3>
              <PlotlyBarChart
                data={barDataA}
                title=""
                xAxisLabel="R²"
                horizontal
                showErrorBars
                xRange={[-2.3, 0.35]}
                referenceLine={0}
              />
            </div>

            {/* IC95 Forest Plot A */}
            {forestDataA.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                  {t('Intervalos de Confianza al 95% - Experimento A', '95% Confidence Intervals - Experiment A')}
                </h3>
                <ForestPlot
                  data={forestDataA}
                  height={350}
                  referenceLine={0}
                />
              </div>
            )}

            {/* Heatmap A */}
            {heatmapA.x.length > 0 && heatmapA.y.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                  {t('R² Promedio · Filtro × Horizonte (modelos: DT, RF, SVR, MLP)', 'Average R² · Filter × Horizon (models: DT, RF, SVR, MLP)')}
                </h3>
                <Heatmap
                  x={heatmapA.x}
                  y={heatmapA.y}
                  z={heatmapA.z}
                  title=""
                  height={350}
                />
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'expB' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                Experimento B, One-Beat-Ahead
              </h2>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', background: 'var(--elevated)', padding: '4px 8px', borderRadius: '4px' }}>
                {(resumenB[0]?.N ?? 0).toLocaleString()} {t('evaluaciones', 'evaluations')}
              </span>
            </div>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '20px' }}>
              {t('Predicción del siguiente latido completo (256 muestras). ARIMA excluido.', 'Prediction of the next complete beat (256 samples). ARIMA excluded.')}
            </p>

            {/* Tabla Resumen B */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                {t('Tabla de Resultados - Experimento B', 'Results Table - Experiment B')}
              </h3>
              <DataTable
                data={resumenB as unknown as Record<string, unknown>[]}
                title=""
                columns={[
                  { key: 'Modelo', label: t('Modelo', 'Model') },
                  { key: 'N', label: 'N' },
                  { key: 'R2_media', label: t('R² Media', 'R² Mean') },
                  { key: 'R2_std', label: 'R² Std' },
                  { key: 'MSE_media', label: 'MSE' },
                  { key: 'RMSE_media', label: 'RMSE' },
                  { key: 'MAE_media', label: 'MAE' },
                ]}
              />
            </div>

            {/* Bar Chart B */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                {t('R² por Modelo - Experimento B', 'R² by Model - Experiment B')}
              </h3>
              <PlotlyBarChart
                data={barDataB}
                title=""
                xAxisLabel="R²"
                horizontal
                showErrorBars
                referenceLine={0}
              />
            </div>

            {/* Heatmap B */}
            {heatmapB.x.length > 0 && heatmapB.y.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                  {t('R² Promedio · Filtro × Lookback (modelos: DT, RF, SVR, MLP)', 'Average R² · Filter × Lookback (models: DT, RF, SVR, MLP)')}
                </h3>
                <Heatmap
                  x={heatmapB.x}
                  y={heatmapB.y}
                  z={heatmapB.z}
                  title=""
                  height={350}
                />
              </div>
            )}

            {/* IC95 Forest Plot B */}
            {forestDataB.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                  {t('Intervalos de Confianza al 95% - Experimento B', '95% Confidence Intervals - Experiment B')}
                </h3>
                <ForestPlot
                  data={forestDataB}
                  height={350}
                  referenceLine={0}
                />
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'estadisticas' && (
          <div>
            {/* ANÁLISIS DE SOBREAJUSTE */}
            {overfitA.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                  {t('Análisis de Sobreajuste (Train vs Test)', 'Overfitting Analysis (Train vs Test)')}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                      {t('Experimento A', 'Experiment A')}
                    </h3>
                    <DataTable
                      data={overfitA as unknown as Record<string, unknown>[]}
                      title=""
                      columns={[
                        { key: 'Modelo', label: t('Modelo', 'Model') },
                        { key: 'R2_train_media', label: 'R² Train' },
                        { key: 'R2_test_media', label: 'R² Test' },
                        { key: 'Diferencia', label: 'Gap' },
                      ]}
                    />
                  </div>
                  <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                      {t('Experimento B', 'Experiment B')}
                    </h3>
                    <DataTable
                      data={overfitB as unknown as Record<string, unknown>[]}
                      title=""
                      columns={[
                        { key: 'Modelo', label: t('Modelo', 'Model') },
                        { key: 'R2_train_media', label: 'R² Train' },
                        { key: 'R2_test_media', label: 'R² Test' },
                        { key: 'Diferencia', label: 'Gap' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TEST DE WILCOXON */}
            {wilcoxonA.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                  {t('Test de Wilcoxon vs Persistencia', 'Wilcoxon Test vs Persistence')}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                      {t('Experimento A', 'Experiment A')}
                    </h3>
                    <DataTable
                      data={wilcoxonA as unknown as Record<string, unknown>[]}
                      title=""
                      columns={[
                        { key: 'Modelo', label: t('Modelo', 'Model') },
                        { key: 'W_stat', label: 'W' },
                        { key: 'p_valor', label: t('p-valor', 'p-value') },
                        { key: 'ΔR²_vs_Persistencia', label: 'Δ R²' },
                      ]}
                    />
                  </div>
                  <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                      {t('Experimento B', 'Experiment B')}
                    </h3>
                    <DataTable
                      data={wilcoxonB as unknown as Record<string, unknown>[]}
                      title=""
                      columns={[
                        { key: 'Modelo', label: t('Modelo', 'Model') },
                        { key: 'W_stat', label: 'W' },
                        { key: 'p_valor', label: t('p-valor', 'p-value') },
                        { key: 'ΔR²_vs_Persistencia', label: 'Δ R²' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'filtros_hallazgos' && (
          <div>
            {/* RANKING DE FILTROS */}
            {rankingFiltros.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                  {t('Ranking de Pipelines de Preprocesamiento · Experimento A', 'Preprocessing Pipeline Ranking · Experiment A')}
                </h2>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <PlotlyBarChart
                    data={rankingFiltros.map((r, i) => {
                      const colors = ['#1d4ed8', '#2563eb', '#60a5fa', '#60a5fa', '#fbbf24', '#f59e0b', '#ef4444'];
                      return {
                        name: r.Filtro,
                        value: r.R2_media,
                        color: colors[i % colors.length] || '#6b7280',
                      };
                    })}
                    title=""
                    horizontal
                    height={340}
                  />
                </div>
                <Callout type="note" title={t('Análisis de Filtros', 'Filter Analysis')}>
                  {t('Los filtros basados en mediana (posiciones superiores) superan consistentemente a los filtros sin mediana. El filtro de paso banda solo (F_PB, F_N+PB) obtiene los peores resultados porque elimina información de baja frecuencia predictivamente relevante.', 'Median-based filters (top positions) consistently outperform non-median filters. The bandpass filter alone (F_PB, F_N+PB) yields the worst results because it removes predictively relevant low-frequency information.')}
                </Callout>
              </div>
            )}

            {/* HALLAZGOS PRINCIPALES */}
            <FindingsSection title={t('Hallazgos Principales', 'Key Findings')}>
              <FindingCard
                number={1}
                title={t('La formulación experimental es el factor determinante', 'The experimental formulation is the determining factor')}
                description={t(`El paso de Exp A (multi-step) a Exp B (latido-a-latido) produjo un incremento del ${mejoraPct}% en el mejor R² (de ${bestA_r2.toFixed(4)} a ${bestB_r2.toFixed(4)}), sin cambio algorítmico.`, `The shift from Exp A (multi-step) to Exp B (beat-to-beat) produced a ${mejoraPct}% increase in the best R² (from ${bestA_r2.toFixed(4)} to ${bestB_r2.toFixed(4)}), with no algorithmic change.`)}
                significance="high"
              />
              <FindingCard
                number={2}
                title={t(`${bestModelA?.Modelo} domina Exp A; ${bestModelB?.Modelo} domina Exp B`, `${bestModelA?.Modelo} dominates Exp A; ${bestModelB?.Modelo} dominates Exp B`)}
                description={t(`${bestModelA?.Modelo} fue el más robusto al sobreajuste en la formulación multi-step. ${bestModelB?.Modelo} lideró en Exp B gracias a su kernel RBF, aunque su ventaja se explica parcialmente por predicción escalar.`, `${bestModelA?.Modelo} was the most robust to overfitting in the multi-step formulation. ${bestModelB?.Modelo} led in Exp B thanks to its RBF kernel, although its advantage is partially explained by scalar prediction.`)}
                significance="high"
              />
              <FindingCard
                number={3}
                title={t('Los filtros de mediana son sistemáticamente superiores', 'Median filters are systematically superior')}
                description={t('F_MED y F_N+MED ocuparon los primeros puestos en ambos experimentos. Ahora bien, ese primer puesto es un artefacto de aplanamiento: la medición del NB7 demuestra que el filtro de mediana atenúa el pico R un 76.5 % de media, y con él hasta la línea base de persistencia sube de R² = −0.2020 a +0.0854. Aplana la señal e infla el R² de todo lo que se mida sobre ella. Por eso el modelo final no lo usa.', 'F_MED and F_N+MED ranked first in both experiments. That first place is, however, a flattening artifact: the NB7 measurement shows the median filter attenuates the R peak by 76.5 % on average, and with it even the persistence baseline rises from R² = −0.2020 to +0.0854. It flattens the signal and inflates the R² of anything measured on it. That is why the final model does not use it.')}
                significance="medium"
              />
              <FindingCard
                number={4}
                title={t('Los modelos tradicionales son insuficientes para Exp A', 'Traditional models are insufficient for Exp A')}
                description={t(`Un R²=${bestA_r2.toFixed(4)} está por debajo del umbral mínimo de utilidad clínica estimado en R²≥0.5. Esto justifica el avance a deep learning (NB2).`, `An R²=${bestA_r2.toFixed(4)} is below the estimated minimum clinical utility threshold of R²≥0.5. This justifies the advance to deep learning (NB2).`)}
                significance="medium"
              />
              <FindingCard
                number={5}
                title={t('LinReg y ARIMA colapsan numéricamente', 'LinReg and ARIMA collapse numerically')}
                description={t(`LinReg: R²=${resumenA.find(m => m.Modelo === 'LinReg')?.R2_media.toFixed(2) ?? 'N/A'} (sobreajuste total). ARIMA: R²=${resumenA.find(m => m.Modelo === 'ARIMA')?.R2_media.toFixed(2) ?? 'N/A'} con std=${resumenA.find(m => m.Modelo === 'ARIMA')?.R2_std.toFixed(2) ?? 'N/A'} (inestabilidad extrema). ARIMA es el único modelo que no supera estadísticamente a la Persistencia.`, `LinReg: R²=${resumenA.find(m => m.Modelo === 'LinReg')?.R2_media.toFixed(2) ?? 'N/A'} (total overfitting). ARIMA: R²=${resumenA.find(m => m.Modelo === 'ARIMA')?.R2_media.toFixed(2) ?? 'N/A'} with std=${resumenA.find(m => m.Modelo === 'ARIMA')?.R2_std.toFixed(2) ?? 'N/A'} (extreme instability). ARIMA is the only model that does not statistically surpass Persistence.`)}
                significance="low"
              />
              <FindingCard
                number={6}
                title={t('El horizonte de predicción tiene efecto adverso monotónico', 'Prediction horizon has a monotonic adverse effect')}
                description={t(`La pérdida de R² entre H=1 s y H=5 s es significativa en los modelos competitivos. Sin memoria temporal explícita, los modelos fallan a horizontes crecientes.`, `The R² loss between H=1 s and H=5 s is significant in competitive models. Without explicit temporal memory, models fail at increasing horizons.`)}
                significance="medium"
              />
              <FindingCard
                number={7}
                title={t('El lookback óptimo en Exp B es el mínimo (3 latidos)', 'The optimal lookback in Exp B is the minimum (3 beats)')}
                description={t('Lookbacks mayores (5, 10) introducen más ruido que señal. La información predictiva relevante es local al latido previo inmediato.', 'Larger lookbacks (5, 10) introduce more noise than signal. The relevant predictive information is local to the immediately preceding beat.')}
                significance="low"
              />
            </FindingsSection>

            {/* GALERÍA DE IMÁGENES */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                {t('Galería de Visualizaciones · NB1', 'Visualization Gallery · NB1')}
              </h2>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '16px' }}>
                {t('Imágenes generadas directamente en el notebook 01_tradicionales.ipynb', 'Images generated directly in notebook 01_tradicionales.ipynb')}
              </p>
              <ImageGallery
                images={[
                  { src: '/data/nb1/img/boxplot_ExpA.png', title: 'Boxplots R² · Exp A' },
                  { src: '/data/nb1/img/boxplot_ExpB.png', title: 'Boxplots R² · Exp B' },
                  { src: '/data/nb1/img/boxplot_mse_ExpA.png', title: 'Boxplots MSE · Exp A' },
                  { src: '/data/nb1/img/boxplot_mse_ExpB.png', title: 'Boxplots MSE · Exp B' },
                  { src: '/data/nb1/img/boxplot_A_vs_B.png', title: t('Comparativa Exp A vs Exp B', 'Comparison Exp A vs Exp B') },
                  { src: '/data/nb1/img/heatmap_filtro_horizonte.png', title: t('Heatmap Filtro × Horizonte', 'Heatmap Filter × Horizon') },
                  { src: '/data/nb1/img/heatmap_filtro_lookback.png', title: t('Heatmap Filtro × Lookback', 'Heatmap Filter × Lookback') },
                  { src: '/data/nb1/img/ic95_ExpA.png', title: 'IC 95% R² · Exp A' },
                  { src: '/data/nb1/img/ic95_ExpB.png', title: 'IC 95% R² · Exp B' },
                  { src: '/data/nb1/img/prediccion_vs_real.png', title: t('Predicción vs Real', 'Prediction vs Actual') },
                  { src: '/data/nb1/img/prediccion_multistep_todos.png', title: t('Predicción Multi-step (todos)', 'Multi-step Prediction (all)') },
                  { src: '/data/nb1/img/prediccion_consistencia.png', title: t('Consistencia de Predicción', 'Prediction Consistency') },
                  { src: '/data/nb1/img/ecg_train_test_100.png', title: t('ECG Train/Test · Pac. 100', 'ECG Train/Test · Pat. 100') },
                  { src: '/data/nb1/img/ecg_train_test_200.png', title: t('ECG Train/Test · Pac. 200', 'ECG Train/Test · Pat. 200') },
                  { src: '/data/nb1/img/ecg_train_test_217.png', title: t('ECG Train/Test · Pac. 217', 'ECG Train/Test · Pat. 217') },
                ]}
                columns={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface NB2ContentProps {
  resumenA: NB2ResumenA[];
  resumenB: NB2ResumenB[];
  rawA: NB2RawA[];
  rawB: NB2RawB[];
  ic95A: IC95Row[];
  ic95B: IC95Row[];
  wilcoxonA: WilcoxonRow[];
  wilcoxonB: WilcoxonRow[];
  overfitA: OverfitRow[];
  overfitB: OverfitRow[];
  comparativa: NB2Comparativa[];
  loading: boolean;
  error: string | null;
  bestModelA: NB2ResumenA | null;
  bestModelB: NB2ResumenB | null;
}

function NB2Content(props: NB2ContentProps) {
  const { resumenA, resumenB, rawA, rawB, ic95A, ic95B, wilcoxonA, wilcoxonB, overfitA, overfitB, comparativa, bestModelA, bestModelB, loading, error } = props;
  const theme = useECGStore((s) => s.theme);
  const { t } = useLang();
  const [selectedICExp, setSelectedICExp] = useState<'Exp A' | 'Exp B'>('Exp B');
  const [selectedRankExp, setSelectedRankExp] = useState<'Todos' | 'A: Tiempo' | 'B: Latidos'>('Todos');
  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'expA' | 'expB' | 'estadisticas' | 'filtros_hallazgos'>('resumen');

  // ── Todos los hooks ANTES de cualquier return condicional ─────────────────
  const DL_MODELS = ['GRU', 'LSTM', 'CNN-LSTM', 'CNN-GRU'];

  const r2ByHorizon = useMemo(() => {
    const dlRaw = rawA.filter((r: any) => DL_MODELS.includes(r.Modelo));
    const grouped: Record<number, Record<string, number>> = {};
    dlRaw.forEach((r: any) => {
      if (!grouped[r.Horizonte_seg]) grouped[r.Horizonte_seg] = {};
      grouped[r.Horizonte_seg][r.Modelo] = r.R2;
    });
    return grouped;
  }, [rawA]);

  const r2ByLookback = useMemo(() => {
    const dlRaw = rawB.filter((r: any) => DL_MODELS.includes(r.Modelo));
    const grouped: Record<number, Record<string, number>> = {};
    dlRaw.forEach((r: any) => {
      if (!grouped[r.Lookback]) grouped[r.Lookback] = {};
      grouped[r.Lookback][r.Modelo] = r.R2;
    });
    return grouped;
  }, [rawB]);

  // ── Heatmap: Modelo × Horizonte → R² medio (Exp A) ──────────────────────
  const heatmapModelHorizonA = useMemo(() => {
    const groups: Record<string, Record<string, number[]>> = {};
    rawA.filter((r: any) => DL_MODELS.includes(r.Modelo)).forEach((r: any) => {
      if (!groups[r.Modelo]) groups[r.Modelo] = {};
      const key = `H=${r.Horizonte_seg}s`;
      if (!groups[r.Modelo][key]) groups[r.Modelo][key] = [];
      groups[r.Modelo][key].push(r.R2);
    });
    const x = [...new Set(rawA.map((r: any) => `H=${r.Horizonte_seg}s`))].sort((a: any, b: any) =>
      parseFloat(a.replace('H=', '')) - parseFloat(b.replace('H=', ''))) as string[];
    const y = DL_MODELS as string[];
    const z = y.map((m: any) => x.map((h: any) => {
      const vals = groups[m]?.[h] ?? [];
      return vals.length ? vals.reduce((a: any, b: any) => a + b, 0) / vals.length : 0;
    }));
    return { x, y, z };
  }, [rawA]);

  // ── Heatmap: Modelo × Lookback → R² medio (Exp B) ───────────────────────
  const heatmapModelLookbackB = useMemo(() => {
    const groups: Record<string, Record<string, number[]>> = {};
    rawB.filter((r: any) => DL_MODELS.includes(r.Modelo)).forEach((r: any) => {
      if (!groups[r.Modelo]) groups[r.Modelo] = {};
      const key = `LB=${r.Lookback}`;
      if (!groups[r.Modelo][key]) groups[r.Modelo][key] = [];
      groups[r.Modelo][key].push(r.R2);
    });
    const x = [...new Set(rawB.map((r: any) => `LB=${r.Lookback}`))].sort((a: any, b: any) =>
      parseInt(a.replace('LB=', '')) - parseInt(b.replace('LB=', ''))) as string[];
    const y = DL_MODELS as string[];
    const z = y.map((m: any) => x.map((lb: any) => {
      const vals = groups[m]?.[lb] ?? [];
      return vals.length ? vals.reduce((a: any, b: any) => a + b, 0) / vals.length : 0;
    }));
    return { x, y, z };
  }, [rawB]);

  // ── Heatmap: Modelo × Horizonte → RMSE medio (Exp A) ────────────────────
  const heatmapRMSE_A = useMemo(() => {
    const groups: Record<string, Record<string, number[]>> = {};
    rawA.filter((r: any) => DL_MODELS.includes(r.Modelo)).forEach((r: any) => {
      if (!groups[r.Modelo]) groups[r.Modelo] = {};
      const key = `H=${r.Horizonte_seg}s`;
      if (!groups[r.Modelo][key]) groups[r.Modelo][key] = [];
      groups[r.Modelo][key].push(r.RMSE);
    });
    const x = [...new Set(rawA.map((r: any) => `H=${r.Horizonte_seg}s`))].sort((a: any, b: any) =>
      parseFloat(a.replace('H=', '')) - parseFloat(b.replace('H=', ''))) as string[];
    const y = DL_MODELS as string[];
    const z = y.map((m: any) => x.map((h: any) => {
      const vals = groups[m]?.[h] ?? [];
      return vals.length ? vals.reduce((a: any, b: any) => a + b, 0) / vals.length : 0;
    }));
    return { x, y, z };
  }, [rawA]);

  // ── Heatmap: Modelo × Lookback → RMSE medio (Exp B) ─────────────────────
  const heatmapRMSE_B = useMemo(() => {
    const groups: Record<string, Record<string, number[]>> = {};
    rawB.filter((r: any) => DL_MODELS.includes(r.Modelo)).forEach((r: any) => {
      if (!groups[r.Modelo]) groups[r.Modelo] = {};
      const key = `LB=${r.Lookback}`;
      if (!groups[r.Modelo][key]) groups[r.Modelo][key] = [];
      groups[r.Modelo][key].push(r.RMSE);
    });
    const x = [...new Set(rawB.map((r: any) => `LB=${r.Lookback}`))].sort((a: any, b: any) =>
      parseInt(a.replace('LB=', '')) - parseInt(b.replace('LB=', ''))) as string[];
    const y = DL_MODELS as string[];
    const z = y.map((m: any) => x.map((lb: any) => {
      const vals = groups[m]?.[lb] ?? [];
      return vals.length ? vals.reduce((a: any, b: any) => a + b, 0) / vals.length : 0;
    }));
    return { x, y, z };
  }, [rawB]);

  // ── Scatter: R² vs Latencia por modelo (ambos Exp) ───────────────────────
  const scatterR2Latency = useMemo(() => {
    const traces: { name: string; x: number[]; y: number[]; exp: string; color: string }[] = [];
    DL_MODELS.forEach((model: any) => {
      const dataA = rawA.filter((r: any) => r.Modelo === model);
      if (dataA.length) {
        const avgR2 = dataA.reduce((s: any, r: any) => s + r.R2, 0) / dataA.length;
        const avgLat = dataA.reduce((s: any, r: any) => s + r.Latencia_ms, 0) / dataA.length;
        traces.push({ name: `${model} (A)`, x: [avgLat], y: [avgR2], exp: 'A', color: MODEL_COLORS[model] || '#6b7280' });
      }
      const dataB = rawB.filter((r: any) => r.Modelo === model);
      if (dataB.length) {
        const avgR2 = dataB.reduce((s: any, r: any) => s + r.R2, 0) / dataB.length;
        const avgLat = dataB.reduce((s: any, r: any) => s + r.Latencia_ms, 0) / dataB.length;
        traces.push({ name: `${model} (B)`, x: [avgLat], y: [avgR2], exp: 'B', color: MODEL_COLORS[model] || '#6b7280' });
      }
    });
    return traces;
  }, [rawA, rawB]);

  // ── Returns condicionales DESPUÉS de todos los hooks ─────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>{t('Cargando datos de NB2...', 'Loading NB2 data...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alert)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>Error: {error}</div>
      </div>
    );
  }

  const bestA_r2 = bestModelA?.R2_media ?? 0;
  const bestB_r2 = bestModelB?.R2_media ?? 0;
  const mejoraPct = bestA_r2 !== 0 ? Math.round(((bestB_r2 - bestA_r2) / Math.abs(bestA_r2)) * 100) : 0;
  const mejor_nb1_a_r2 = 0.1603;
  const mejora_dl_vs_trad = Math.round(((bestA_r2 - mejor_nb1_a_r2) / Math.abs(mejor_nb1_a_r2)) * 100);

  const safeMax = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > max) max = arr[i];
    }
    return max;
  };

  const gap_max = overfitA.length > 0 ? safeMax(overfitA.map((o: any) => o.Diferencia ?? 0)) : 0;
  const gap_max_mod = overfitA.length > 0 ? overfitA.reduce((best: any, curr: any) => (curr.Diferencia ?? 0) > (best.Diferencia ?? 0) ? curr : best).Modelo : '';

  const barDataA = resumenA.map((r: any) => ({
    name: r.Modelo,
    value: r.R2_media,
    color: MODEL_COLORS[r.Modelo] || '#6b7280',
    error: r.R2_std,
  }));

  const barDataB = resumenB.map((r: any) => ({
    name: r.Modelo,
    value: r.R2_media,
    color: MODEL_COLORS[r.Modelo] || '#6b7280',
    error: r.R2_std,
  }));

  const groupedBarData = DL_MODELS.map((mod: any) => {
    const expA = resumenA.find((r: any) => r.Modelo === mod);
    const expB = resumenB.find((r: any) => r.Modelo === mod);
    return {
      name: mod,
      'Exp A (Multi-step)': expA?.R2_media ?? 0,
      'Exp B (One-beat-ahead)': expB?.R2_media ?? 0,
    };
  });

  const forestData = selectedICExp === 'Exp A' ? ic95A : ic95B;
  const forestPlotData = forestData.map((r: any) => ({
    modelo: r.Modelo,
    media: r.R2_media,
    icInf: r.IC_95_inf,
    icSup: r.IC_95_sup,
    color: MODEL_COLORS[r.Modelo],
  }));

  const filteredComparativa = selectedRankExp === 'Todos'
    ? comparativa
    : comparativa.filter((c: any) => c.Experimento === selectedRankExp);

  const subTabs = [
    { id: 'resumen' as const, label: t('Resumen', 'Summary'), icon: <TrendingUp size={14} /> },
    { id: 'expA' as const, label: t('Exp A: Multi-step', 'Exp A: Multi-step'), icon: <Activity size={14} /> },
    { id: 'expB' as const, label: t('Exp B: Latidos', 'Exp B: Beat-based'), icon: <Zap size={14} /> },
    { id: 'estadisticas' as const, label: t('Estadísticas', 'Statistics'), icon: <BarChart3 size={14} /> },
    { id: 'filtros_hallazgos' as const, label: t('Filtros / Hallazgos', 'Filters / Findings'), icon: <Filter size={14} /> },
  ];

  return (
    <div>
      {/* Above the Fold Summary Panel */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: '24px',
        marginBottom: '24px',
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {/* Left: Metadata */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ letterSpacing: '2px', fontSize: 'var(--fs-xs)' }}>Experimento 2 · NB2</span>
              <span style={{ fontSize: 'var(--fs-xs)', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-data)', color: 'var(--signal)' }}>02_deep_learning.ipynb</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>
              {t('Deep Learning para Predicción de Señales ECG', 'Deep Learning for ECG Signal Prediction')}
            </h2>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', margin: 0 }}>
              {t('Modelos DL: LSTM, GRU, CNN-LSTM, CNN-GRU', 'DL models: LSTM, GRU, CNN-LSTM, CNN-GRU')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            <span><strong>Dataset:</strong> MIT-BIH Arrhythmia Database · 48 pacientes · 360 Hz · MLII</span>
            <span><strong>Partición:</strong> 80% entrenamiento / 20% prueba · temporal</span>
          </div>
        </div>

        {/* Right: Key KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: '10px', flex: '1 1 320px', alignContent: 'center' }}>
          <MetricStat
            densa
            fase="E2"
            etiqueta={<>{t('Mejor R² Exp A', 'Best R² Exp A')}</>}
            valor={<>{bestA_r2.toFixed(4)}</>}
            nota={<>{bestModelA?.Modelo}</>}
          />
          <MetricStat
            densa
            fase="E2"
            etiqueta={<>{t('Mejor R² Exp B', 'Best R² Exp B')}</>}
            valor={<>{bestB_r2.toFixed(4)}</>}
            nota={<>{bestModelB?.Modelo}</>}
          />
          <MetricStat
            densa
            fase="E2"
            etiqueta={<>{t('Mejora vs ML', 'DL vs ML Improvement')}</>}
            valor={<>+{mejora_dl_vs_trad}%</>}
            nota={<>{bestModelA?.Modelo} vs RF</>}
          />
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        width: 'fit-content',
        flexWrap: 'wrap',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {subTabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeSubTab === id ? 'var(--accent-bg, rgba(6, 182, 212, 0.15))' : 'transparent',
              color: activeSubTab === id ? 'var(--signal, #06b6d4)' : 'var(--text-sub)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-xs)',
              fontWeight: activeSubTab === id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeSubTab === 'resumen' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))', gap: '10px', marginBottom: '28px' }}>
              <MetricStat
                densa
                fase="E2"
                etiqueta={<>{t('Mejor R² · Exp A (DL)', 'Best R² · Exp A (DL)')}</>}
                valor={<>{bestA_r2.toFixed(4)}</>}
                nota={<>{bestModelA?.Modelo}</>}
              />
              <MetricStat
                densa
                fase="E2"
                etiqueta={<>{t('Mejor R² · Exp B (DL)', 'Best R² · Exp B (DL)')}</>}
                valor={<>{bestB_r2.toFixed(4)}</>}
                nota={<>{bestModelB?.Modelo}</>}
              />
              <MetricStat
                densa
                fase="E2"
                etiqueta={<>{t('Mejora DL vs Tradicional', 'DL vs Traditional Improvement')}</>}
                valor={<>+{mejora_dl_vs_trad}%</>}
                nota={<>{bestModelA?.Modelo} vs RF (NB1)</>}
              />
              <MetricStat
                densa
                fase="E2"
                etiqueta={<>{t('Mejora A→B', 'A→B Improvement')}</>}
                valor={<>+{mejoraPct}%</>}
                nota={<>{t('Latido-a-latido vs multi-step', 'Beat-by-beat vs multi-step')}</>}
              />
              <MetricStat
                densa
                fase="E2"
                etiqueta={<>{t('Gap sobreajuste máx', 'Max overfitting gap')}</>}
                valor={<>{gap_max.toFixed(4)}</>}
                nota={<>{gap_max_mod} · {t('Controlado', 'Controlled')}</>}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)' }}>
                {t('Interpretación de Resultados en el Contexto del Problema', 'Interpretation of Results in Problem Context')}
              </h3>
              <div style={{
                padding: '16px 18px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--fs-sm)',
                lineHeight: 1.65,
                color: 'var(--text-sub)',
                maxWidth: '92ch',
              }}>
                  <p style={{ marginBottom: '12px' }}>
                    {t(
                      `Los resultados del NB2 confirman la hipótesis central de la segunda fase experimental: las arquitecturas de deep learning con memoria temporal explícita superan a los modelos tradicionales de ML para la predicción de señales ECG. Sin embargo, la magnitud y naturaleza de esta superioridad difieren significativamente entre las dos formulaciones experimentales, revelando matices importantes sobre la interacción entre la complejidad del modelo y la estructura del problema.`,
                      `NB2 results confirm the central hypothesis of the second experimental phase: deep learning architectures with explicit temporal memory outperform traditional ML models for ECG signal prediction. However, the magnitude and nature of this superiority differ significantly between the two experimental formulations, revealing important nuances about the interaction between model complexity and problem structure.`
                    )}
                  </p>
                  <p style={{ marginBottom: '12px' }}>
                    {t(
                      `En el Experimento A (multi-step directo), la mejora del ${mejora_dl_vs_trad}% de GRU sobre RF es sustancial y estadísticamente significativa. Este incremento se atribuye a la capacidad de las compuertas recurrentes para modelar dependencias temporales a mediana escala (decenas a cientos de muestras) que los modelos sin memoria no pueden capturar. No obstante, el R² absoluto de 0.2371 permanece por debajo del umbral de utilidad clínica, lo que indica que la predicción multi-step de señales ECG crudas sigue siendo un problema abierto que probablemente requiere representaciones latentes más ricas (e.g., autoencoders variacionales, modelos de atención) o reformulaciones del espacio de salida.`,
                      `In Experiment A (direct multi-step), the ${mejora_dl_vs_trad}% improvement of GRU over RF is substantial and statistically significant. This increase is attributed to the ability of recurrent gates to model medium-scale temporal dependencies (tens to hundreds of samples) that memoryless models cannot capture. Nevertheless, the absolute R² of 0.2371 remains below the clinical utility threshold, indicating that multi-step prediction of raw ECG signals remains an open problem likely requiring richer latent representations (e.g., variational autoencoders, attention models) or output space reformulations.`
                    )}
                  </p>
                  <p>
                    {t(
                      `En el Experimento B (one-beat-ahead), la mejora marginal (2–5%) revela un fenómeno de saturación: cuando la estructura del problema es favorable (segmentación cuasiperiódica, normalización dimensional), la capacidad del modelo deja de ser el factor limitante. En este régimen, las variaciones inter-latido impredecibles (ectopía, cambios abruptos de ritmo) dominan el error residual, y los modelos DL no pueden superarlos con las señales de entrada disponibles. Este hallazgo tiene implicaciones directas para la dirección de la investigación: para avanzar más allá de R² ≈ 0.65 en la formulación por latidos, será necesario incorporar información contextual adicional (frecuencia cardíaca instantánea, variabilidad RR, clasificación del latido previo) o explorar paradigmas de predicción que condicionen sobre el tipo de latido.`,
                      `In Experiment B (one-beat-ahead), the marginal improvement (2–5%) reveals a saturation phenomenon: when the problem structure is favorable (quasi-periodic segmentation, dimensional normalization), model capacity ceases to be the limiting factor. In this regime, unpredictable inter-beat variations (ectopy, abrupt rhythm changes) dominate the residual error, and DL models cannot overcome them with available input signals. This finding has direct implications for research direction: to advance beyond R² ≈ 0.65 in beat formulation, additional contextual information (instantaneous heart rate, RR variability, previous beat classification) or prediction paradigms conditioned on beat type will be needed.`
                    )}
                  </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'expA' && (
          <div>
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                {t('Experimento A · Deep Learning', 'Experiment A · Deep Learning')}
              </h3>
              <DataTable
                data={resumenA as unknown as Record<string, unknown>[]}
                title=""
                columns={[
                  { key: 'Modelo', label: t('Modelo', 'Model') },
                  { key: 'N', label: 'N' },
                  { key: 'R2_media', label: 'R²' },
                  { key: 'R2_std', label: 'σ R²' },
                  { key: 'MSE_media', label: 'MSE' },
                  { key: 'RMSE_media', label: 'RMSE' },
                  { key: 'MAE_media', label: 'MAE' },
                ]}
              />
              <div style={{ marginTop: '20px' }}>
                <PlotlyBarChart data={barDataA} title="" horizontal showErrorBars referenceLine={0} />
              </div>
            </div>

            {rawA.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                  {t('Distribución Global R² · Exp A (todos los horizontes)', 'Global R² Distribution · Exp A (all horizons)')}
                </h3>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <BoxPlot
                    data={DL_MODELS.map(model => ({
                      name: model,
                      values: rawA.filter((r: any) => r.Modelo === model).map((r: any) => r.R2),
                    }))}
                    title=""
                    height={400}
                  />
                </div>
              </div>
            )}

            {heatmapModelHorizonA.x.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="card" style={{ padding: '16px' }}>
                    <Heatmap
                      x={heatmapModelHorizonA.x}
                      y={heatmapModelHorizonA.y}
                      z={heatmapModelHorizonA.z}
                      title={t('R² Medio · Modelo × Horizonte (Exp A)', 'Mean R² · Model × Horizon (Exp A)')}
                      zAxisLabel="R²"
                      colorscale="thermal"
                      height={300}
                      zMin={0}
                      zMax={0.5}
                    />
                  </div>
                  <div className="card" style={{ padding: '16px' }}>
                    <Heatmap
                      x={heatmapRMSE_A.x}
                      y={heatmapRMSE_A.y}
                      z={heatmapRMSE_A.z}
                      title={t('RMSE Medio · Modelo × Horizonte (Exp A)', 'Mean RMSE · Model × Horizon (Exp A)')}
                      zAxisLabel="RMSE"
                      colorscale="thermal"
                      height={300}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'expB' && (
          <div>
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                {t('Experimento B · One-Beat-Ahead (DL)', 'Experiment B · One-Beat-Ahead (DL)')}
              </h3>
              <DataTable
                data={resumenB as unknown as Record<string, unknown>[]}
                title=""
                columns={[
                  { key: 'Modelo', label: t('Modelo', 'Model') },
                  { key: 'N', label: 'N' },
                  { key: 'R2_media', label: 'R²' },
                  { key: 'R2_std', label: 'σ R²' },
                  { key: 'MSE_media', label: 'MSE' },
                  { key: 'RMSE_media', label: 'RMSE' },
                  { key: 'MAE_media', label: 'MAE' },
                ]}
              />
              <div style={{ marginTop: '20px' }}>
                <PlotlyBarChart data={barDataB} title="" horizontal showErrorBars referenceLine={0} />
              </div>
            </div>

            {rawB.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                  {t('Distribución Global R² · Exp B (todos los lookbacks)', 'Global R² Distribution · Exp B (all lookbacks)')}
                </h3>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <BoxPlot
                    data={DL_MODELS.map(model => ({
                      name: model,
                      values: rawB.filter((r: any) => r.Modelo === model).map((r: any) => r.R2),
                    }))}
                    title=""
                    height={400}
                  />
                </div>
              </div>
            )}

            {heatmapModelLookbackB.x.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="card" style={{ padding: '16px' }}>
                    <Heatmap
                      x={heatmapModelLookbackB.x}
                      y={heatmapModelLookbackB.y}
                      z={heatmapModelLookbackB.z}
                      title={t('R² Medio · Modelo × Lookback (Exp B)', 'Mean R² · Model × Lookback (Exp B)')}
                      zAxisLabel="R²"
                      colorscale="thermal"
                      height={300}
                      zMin={0.4}
                      zMax={0.8}
                    />
                  </div>
                  <div className="card" style={{ padding: '16px' }}>
                    <Heatmap
                      x={heatmapRMSE_B.x}
                      y={heatmapRMSE_B.y}
                      z={heatmapRMSE_B.z}
                      title={t('RMSE Medio · Modelo × Lookback (Exp B)', 'Mean RMSE · Model × Lookback (Exp B)')}
                      zAxisLabel="RMSE"
                      colorscale="thermal"
                      height={300}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'estadisticas' && (
          <div>
            {/* COMPARATIVA GLOBAL */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                {t('Comparativa R² · Exp A vs Exp B por Modelo DL', 'R² Comparison · Exp A vs Exp B by DL Model')}
              </h3>
              <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <PlotlyGroupedBarChart
                  data={groupedBarData}
                  categories={['Exp A (Multi-step)', 'Exp B (One-beat-ahead)']}
                  title=""
                  yAxisLabel="R²"
                  height={400}
                  referenceLine={0}
                />
              </div>
            </div>

            {/* TEST DE WILCOXON */}
            {wilcoxonA.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                  {t('Test de Wilcoxon vs Persistencia', 'Wilcoxon Test vs Persistence')}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                      {t('Experimento A', 'Experiment A')}
                    </h3>
                    <DataTable
                      data={wilcoxonA as unknown as Record<string, unknown>[]}
                      title=""
                      columns={[
                        { key: 'Modelo', label: t('Modelo', 'Model') },
                        { key: 'W_stat', label: 'W' },
                        { key: 'p_valor', label: t('p-valor', 'p-value') },
                        { key: 'ΔR²_vs_Persistencia', label: 'Δ R²' },
                      ]}
                    />
                  </div>
                  <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                      {t('Experimento B', 'Experiment B')}
                    </h3>
                    <DataTable
                      data={wilcoxonB as unknown as Record<string, unknown>[]}
                      title=""
                      columns={[
                        { key: 'Modelo', label: t('Modelo', 'Model') },
                        { key: 'W_stat', label: 'W' },
                        { key: 'p_valor', label: t('p-valor', 'p-value') },
                        { key: 'ΔR²_vs_Persistencia', label: 'Δ R²' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* OVERFITTING GAP */}
            {overfitA.length > 0 && overfitB.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                  {t('Sobreajuste Comparado · NB1 vs NB2', 'Overfitting Comparison · NB1 vs NB2')}
                </h3>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <DataTable
                    data={overfitA as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Modelo', label: t('Modelo', 'Model') },
                      { key: 'R2_train', label: 'R² Train' },
                      { key: 'R2_test', label: 'R² Test' },
                      { key: 'Diferencia', label: 'Gap' },
                    ]}
                  />
                </div>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <PlotlyGroupedBarChart
                    data={DL_MODELS.map((mod: any) => {
                      const oA = overfitA.find((o: any) => o.Modelo === mod);
                      const oB = overfitB.find((o: any) => o.Modelo === mod);
                      return {
                        name: mod,
                        'Gap Exp A': oA?.Diferencia ?? 0,
                        'Gap Exp B': oB?.Diferencia ?? 0,
                      };
                    })}
                    categories={['Gap Exp A', 'Gap Exp B']}
                    title=""
                    yAxisLabel={t('Gap R² (Train - Test)', 'R² Gap (Train - Test)')}
                    height={380}
                    referenceLine={0}
                  />
                </div>
              </div>
            )}

            {/* SCATTER R2 VS LATENCY */}
            {scatterR2Latency.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                  {t('Compromiso R² vs Latencia de Inferencia', 'R² vs Inference Latency Tradeoff')}
                </h3>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <PlotlyChart
                    data={scatterR2Latency.map(tr => ({
                      x: tr.x,
                      y: tr.y,
                      mode: 'markers+text' as const,
                      type: 'scatter' as const,
                      name: tr.name,
                      text: [tr.name],
                      textposition: 'top center' as const,
                      marker: {
                        color: tr.color,
                        size: 14,
                        symbol: tr.exp === 'A' ? 'circle' : 'diamond',
                        line: { width: 2, color: '#fff' },
                      },
                      textfont: { size: 10 },
                    }))}
                    layout={{
                      height: 420,
                      xaxis: { title: { text: t('Latencia media (ms)', 'Mean Latency (ms)') } },
                      yaxis: { title: { text: 'R²' } },
                      showlegend: true,
                      legend: { orientation: 'h' as const, y: -0.2 },
                    }}
                  />
                </div>
              </div>
            )}

            {/* IC95 FOREST PLOT */}
            {forestPlotData.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)' }}>
                    {t('Intervalos de Confianza 95% ·', 'Confidence Intervals 95% ·')} {selectedICExp}
                  </h3>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setSelectedICExp('Exp A')}
                      style={{
                        padding: '6px 16px',
                        background: selectedICExp === 'Exp A' ? '#3b82f6' : 'transparent',
                        color: selectedICExp === 'Exp A' ? '#fff' : 'var(--text-muted)',
                        border: `1px solid ${selectedICExp === 'Exp A' ? '#3b82f6' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 'var(--fs-xs)',
                      }}
                    >
                      Exp A
                    </button>
                    <button
                      onClick={() => setSelectedICExp('Exp B')}
                      style={{
                        padding: '6px 16px',
                        background: selectedICExp === 'Exp B' ? '#3b82f6' : 'transparent',
                        color: selectedICExp === 'Exp B' ? '#fff' : 'var(--text-muted)',
                        border: `1px solid ${selectedICExp === 'Exp B' ? '#3b82f6' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 'var(--fs-xs)',
                      }}
                    >
                      Exp B
                    </button>
                  </div>
                </div>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <ForestPlot data={forestPlotData} title="" height={300} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'filtros_hallazgos' && (
          <div>
            {/* RANKING CONSOLIDADO */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                {t('Ranking Consolidado · NB1 vs NB2', 'Consolidated Ranking · NB1 vs NB2')}
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['Todos', 'A: Tiempo', 'B: Latidos'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSelectedRankExp(opt)}
                      style={{
                        padding: '6px 16px',
                        background: selectedRankExp === opt ? '#3b82f6' : 'transparent',
                        color: selectedRankExp === opt ? '#fff' : 'var(--text-muted)',
                        border: `1px solid ${selectedRankExp === opt ? '#3b82f6' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 'var(--fs-xs)',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <DataTable
                  data={filteredComparativa as unknown as Record<string, unknown>[]}
                  title=""
                  columns={[
                    { key: 'Notebook', label: 'Notebook' },
                    { key: 'Experimento', label: t('Experimento', 'Experiment') },
                    { key: 'Modelo', label: t('Modelo', 'Model') },
                    { key: 'R2_media', label: 'R²' },
                    { key: 'R2_train', label: 'R² Train' },
                  ]}
                />
              </div>
            </div>

            {/* KEY FINDINGS */}
            <FindingsSection title={t('Hallazgos Principales · NB2', 'Key Findings · NB2')}>
              <FindingCard
                number={1}
                title={t('Supremacía del DL sobre ML tradicional', 'DL Supremacy over Traditional ML')}
                description={t(`GRU alcanza R²=${bestA_r2.toFixed(4)} vs R²=0.1603 de RF (NB1), representando una mejora del ${mejora_dl_vs_trad}%.`, `GRU achieves R²=${bestA_r2.toFixed(4)} vs R²=0.1603 for RF (NB1), representing a ${mejora_dl_vs_trad}% improvement.`)}
                significance="high"
              />
              <FindingCard
                number={2}
                title={t('Dominancia de la formulación del problema', 'Problem Formulation Dominance')}
                description={t('La diferencia entre Exp A y Exp B (178%) supera ampliamente las diferencias entre arquitecturas DL (<2%).', 'The difference between Exp A and Exp B (178%) far exceeds the differences between DL architectures (<2%).')}
                significance="high"
              />
              <FindingCard
                number={3}
                title={t('Sobreajuste controlado', 'Controlled Overfitting')}
                description={t(`El gap train-test máximo de ${gap_max.toFixed(4)} en ${gap_max_mod} es manejable con early stopping.`, `The maximum train-test gap of ${gap_max.toFixed(4)} in ${gap_max_mod} is manageable with early stopping.`)}
                significance="medium"
              />
              <FindingCard
                number={4}
                title={t('Convergencia arquitectónica', 'Architectural Convergence')}
                description={t('Las 4 arquitecturas DL (GRU, LSTM, CNN-GRU, CNN-LSTM) convergen a R² similares en Exp B, sugiriendo que el cuello de botella es la variabilidad intrínseca del ECG, no la capacidad del modelo.', 'All 4 DL architectures (GRU, LSTM, CNN-GRU, CNN-LSTM) converge to similar R² in Exp B, suggesting the bottleneck is the intrinsic ECG variability, not the model capacity.')}
                significance="medium"
              />
            </FindingsSection>

            {/* GALLERY */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                {t('Galería de Visualizaciones · NB2', 'Visualization Gallery · NB2')}
              </h3>
              <ImageGallery
                images={[
                  { src: '/data/nb2/img/prediccion_DL_Exp A_ganador.png', title: t('Predicción Visual: Ganador Exp A', 'Visual Prediction: Exp A Winner') },
                  { src: '/data/nb2/img/prediccion_DL_Exp B_ganador.png', title: t('Predicción Visual: Ganador Exp B', 'Visual Prediction: Exp B Winner') },
                  { src: '/data/nb2/img/boxplot_DL_A_vs_B.png', title: t('Comparativa Exp A vs Exp B', 'Exp A vs Exp B Comparison') },
                  { src: '/data/nb2/img/boxplot_DL_Exp A_global.png', title: t('Boxplot Global · Exp A', 'Global Boxplot · Exp A') },
                  { src: '/data/nb2/img/boxplot_DL_Exp B_global.png', title: t('Boxplot Global · Exp B', 'Global Boxplot · Exp B') },
                  { src: '/data/nb2/img/boxplot_DL_Exp A_desglose.png', title: t('Desglose por Modelo · Exp A', 'Breakdown by Model · Exp A') },
                  { src: '/data/nb2/img/boxplot_DL_Exp B_desglose.png', title: t('Desglose por Modelo · Exp B', 'Breakdown by Model · Exp B') },
                  { src: '/data/nb2/img/boxplot_global_trad_vs_dl.png', title: t('Tradicional vs Deep Learning', 'Traditional vs Deep Learning') },
                ]}
                columns={2}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface NB4BContentProps {
  global: NB4BGlobal[];
  resumen: NB4BResumen[];
  bestGlobal: { Modelo: string; Filtro: string; R2: number; MSE: number; RMSE: number; MAE: number; DTW: number; Latencia_ms: number; R2_train: number; n_pacientes: number; n_ventanas_train: number; n_ventanas_test: number } | null;
  mejorModelo: { Modelo: string; mu_R2: number; sigma_R2: number; min: number; max: number; n: number } | null;
  loading: boolean;
  error: string | null;
  r2PorPaciente: Record<string, Record<string, number>>;
  overfit?: NB4BOverfit[];
  wilcoxon?: NB4BWilcoxon[];
  ic95?: NB4BIC95[];
  tdCnnGlobal?: NB4BGlobal[];
  tdCnnPorPaciente?: NB4BPorPaciente[];
}

function NB4BContent(props: NB4BContentProps) {
  const { global, resumen, bestGlobal, mejorModelo, overfit, wilcoxon, ic95, loading, error } = props;
  const theme = useECGStore((s) => s.theme);
  const { t } = useLang();
  const [selectedFiltro, setSelectedFiltro] = useState('F_MED');
  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'expA' | 'expB' | 'estadisticas' | 'filtros_hallazgos'>('resumen');

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>{t('Cargando datos de NB4B...', 'Loading NB4B data...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alert)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>Error: {error}</div>
      </div>
    );
  }

  const filtros = ['F_MED', 'F_N+MED', 'F_N+PB+MED'];
  const modelos = ['GRU', 'LSTM', 'CNN-LSTM', 'CNN-GRU', 'RF', 'MLP'];

  const filteredGlobal = global.filter((g: any) => g.Filtro === selectedFiltro);

  const minGap = overfit && overfit.length > 0 ? overfit.reduce((best: any, curr: any) => curr.GAP < best.GAP ? curr : best) : null;
  const bestIc95 = ic95 && ic95.length > 0 ? ic95.reduce((best: any, curr: any) => curr.mu_R2 > best.mu_R2 ? curr : best) : null;
  const sigPairs = wilcoxon ? wilcoxon.filter((w: any) => w.Sig === '***' || w.Sig === '**').length : 0;

  const barData = filteredGlobal.map((r: any) => ({
    name: r.Modelo,
    value: r.R2,
    color: MODEL_COLORS[r.Modelo] || '#6b7280',
  }));

  const subTabs = [
    { id: 'resumen' as const, label: t('Resumen', 'Summary'), icon: <TrendingUp size={14} /> },
    { id: 'expA' as const, label: t('Exp A: Global', 'Exp A: Global'), icon: <Activity size={14} /> },
    { id: 'expB' as const, label: t('Exp B: TD-CNN', 'Exp B: TD-CNN'), icon: <Zap size={14} /> },
    { id: 'estadisticas' as const, label: t('Estadísticas', 'Statistics'), icon: <BarChart3 size={14} /> },
    { id: 'filtros_hallazgos' as const, label: t('Filtros / Hallazgos', 'Filters / Findings'), icon: <Filter size={14} /> },
  ];

  return (
    <div>
      {/* Above the Fold Summary Panel */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: '24px',
        marginBottom: '24px',
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {/* Left: Metadata */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ letterSpacing: '2px', fontSize: 'var(--fs-xs)' }}>Experimento 4 · NB4B</span>
              <span style={{ fontSize: 'var(--fs-xs)', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-data)', color: 'var(--signal)' }}>04_compuesta multi-sujeto.ipynb</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>
              {t('Modelo Multi-sujeto para Predicción ECG', 'Multi-subject Model for ECG Prediction')}
            </h2>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', margin: 0 }}>
              {t('Modelo global entrenado en pool de múltiples pacientes para capturar morfologías generales.', 'Global model trained on a pool of multiple patients to capture general morphologies.')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            <span><strong>Dataset:</strong> MIT-BIH · 48 pacientes · 360 Hz · MLII</span>
            <span><strong>Partición:</strong> Conjunta multi-sujeto (80/20)</span>
          </div>
        </div>

        {/* Right: Key KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: '10px', flex: '1 1 320px', alignContent: 'center' }}>
          <MetricStat
            densa
            fase="E4"
            etiqueta={<>{t('Mejor R² Global', 'Best Global R²')}</>}
            valor={<>{bestGlobal?.R2?.toFixed(4) ?? '—'}</>}
            nota={<>{bestGlobal?.Modelo} · {bestGlobal?.Filtro}</>}
          />
          <MetricStat
            densa
            fase="E4"
            etiqueta={<>{t('Mejor Modelo (μ)', 'Best Model (μ)')}</>}
            valor={<>{mejorModelo?.mu_R2?.toFixed(4) ?? '—'}</>}
            nota={<>{mejorModelo?.Modelo}</>}
          />
          <MetricStat
            densa
            fase="E4"
            etiqueta={<>{t('Min Train-Test Gap', 'Min Train-Test Gap')}</>}
            valor={<>{minGap?.GAP?.toFixed(4) ?? '—'}</>}
            nota={<>{minGap?.Modelo}</>}
          />
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        width: 'fit-content',
        flexWrap: 'wrap',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {subTabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeSubTab === id ? 'var(--accent-bg, rgba(6, 182, 212, 0.15))' : 'transparent',
              color: activeSubTab === id ? 'var(--signal, #06b6d4)' : 'var(--text-sub)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-xs)',
              fontWeight: activeSubTab === id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeSubTab === 'resumen' && (
          <div>
            {/* KPI Cards NB4B */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))', gap: '10px', marginBottom: '28px' }}>
              <MetricStat
                densa
                fase="E4"
                etiqueta={<>{t('Mejor R² Global', 'Best Global R²')}</>}
                valor={<>{bestGlobal?.R2?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{bestGlobal?.Modelo} · {bestGlobal?.Filtro}</>}
              />
              <MetricStat
                densa
                fase="E4"
                etiqueta={<>{t('Mejor Modelo (μ R²)', 'Best Model (μ R²)')}</>}
                valor={<>{mejorModelo?.Modelo ?? 'N/A'}</>}
                nota={<>μ R² = {mejorModelo?.mu_R2?.toFixed(4) ?? 'N/A'} · σ = {mejorModelo?.sigma_R2?.toFixed(4) ?? 'N/A'}</>}
              />
              <MetricStat
                densa
                fase="E4"
                etiqueta={<>{t('RMSE Mínimo', 'Min RMSE')}</>}
                valor={<>{bestGlobal?.RMSE?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{bestGlobal?.Modelo} · {bestGlobal?.Filtro}</>}
              />
              <MetricStat
                densa
                fase="E4"
                etiqueta={<>{t('Gap Train-Test Mín', 'Min Train-Test Gap')}</>}
                valor={<>{minGap?.GAP?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{minGap?.Modelo} · {minGap?.Filtro}</>}
              />
              <MetricStat
                densa
                fase="E4"
                etiqueta={<>{t('IC95 R²', '95% CI R²')}</>}
                valor={<>{bestIc95 ? `[${bestIc95.IC95_inf.toFixed(3)}, ${bestIc95.IC95_sup.toFixed(3)}]` : 'N/A'}</>}
                nota={<>{bestIc95?.Modelo ?? 'N/A'} · μ={bestIc95?.mu_R2?.toFixed(4) ?? 'N/A'}</>}
              />
              <MetricStat
                densa
                fase="E4"
                etiqueta={<>{t('Pares Significativos', 'Significant Pairs')}</>}
                valor={<>{sigPairs}</>}
                nota={<>{t('Wilcoxon p<0.01', 'Wilcoxon p<0.01')}</>}
              />
              <MetricStat
                densa
                fase="E4"
                etiqueta={<>{t('Pacientes', 'Patients')}</>}
                valor={<>{global[0]?.n_pacientes ?? 'N/A'}</>}
                nota={<>{t('Entrenamiento conjunto', 'Joint training')}</>}
              />
              <MetricStat
                densa
                fase="E4"
                etiqueta={<>{t('Ventanas Train/Test', 'Train/Test Windows')}</>}
                valor={<>{global[0]?.n_ventanas_train ?? 'N/A'} / {global[0]?.n_ventanas_test ?? 'N/A'}</>}
                nota={<>{t('Partición temporal 80/20', 'Temporal split 80/20')}</>}
              />
            </div>

            {/* Interpretación NB4B */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)' }}>
                {t('Interpretación de Resultados en el Contexto del Problema', 'Interpretation of Results in Problem Context')}
              </h3>
              <div style={{
                padding: '16px 18px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--fs-sm)',
                lineHeight: 1.65,
                color: 'var(--text-sub)',
                maxWidth: '92ch',
              }}>
                  <p style={{ marginBottom: '12px' }}>
                    {t(
                      'Los resultados del NB4B confirman que el paradigma de entrenamiento multi-sujeto constituye un avance significativo respecto al entrenamiento intra-paciente evaluado en NB1 y NB2. El R² máximo de 0.7295 (RF) y 0.7237 (GRU), ambos obtenidos con el filtro F_MED, establecen nuevos máximos del proyecto y demuestran que la agregación de datos de múltiples pacientes proporciona una base de entrenamiento más rica que beneficia la capacidad predictiva general.',
                      'NB4B results confirm that the multi-subject training paradigm constitutes a significant advance over intra-patient training evaluated in NB1 and NB2. The maximum R² of 0.7295 (RF) and 0.7237 (GRU), both obtained with the F_MED filter, establish new project highs and demonstrate that aggregating data from multiple patients provides a richer training base that benefits general predictive capacity.'
                    )}
                  </p>
                  <p style={{ marginBottom: '12px' }}>
                    {t(
                      'La mejora del 9.8% de GRU multi-sujeto sobre GRU intra-paciente (NB2 Exp B) es particularmente reveladora. En el paradigma intra-paciente, cada modelo dispone de un máximo de ~90 latidos de entrenamiento. En el paradigma multi-sujeto, el modelo global dispone de 3 086 ventanas de entrenamiento distribuidas entre los 48 pacientes, un incremento de ~34× que permite aprender patrones universales de la dinámica latido-a-latido.',
                      'The 9.8% improvement of multi-subject GRU over intra-patient GRU (NB2 Exp B) is particularly revealing. In the intra-patient paradigm, each model has a maximum of ~90 training beats. In the multi-subject paradigm, the global model has 3,086 training windows distributed across 48 patients, a ~34× increase that enables learning universal beat-to-beat dynamics patterns.'
                    )}
                  </p>
                  <p>
                    {t(
                      'Sin embargo, esta ventaja no es uniforme: CNN-GRU y CNN-LSTM experimentaron una degradación del 12% al pasar del paradigma intra-paciente al multi-sujeto. La capa convolucional, al aprender filtros fijos que deben aplicarse a todas las morfologías del pool, se convierte en un cuello de botella de generalización cuando la heterogeneidad del dataset aumenta. Los mecanismos recurrentes puros (GRU, LSTM) generalizan mejor entre pacientes.',
                      'However, this advantage is not uniform: CNN-GRU and CNN-LSTM experienced a 12% degradation when transitioning from intra-patient to multi-subject paradigm. The convolutional layer, learning fixed filters that must apply to all pool morphologies, becomes a generalization bottleneck when dataset heterogeneity increases. Pure recurrent mechanisms (GRU, LSTM) generalize better across patients.'
                    )}
                  </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'expA' && (
          <div>
            {/* Tabla Global */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                {t('Resultados Globales - NB4B', 'Global Results - NB4B')}
              </h3>
              <DataTable
                data={global as unknown as Record<string, unknown>[]}
                title=""
                columns={[
                  { key: 'Modelo', label: t('Modelo', 'Model') },
                  { key: 'Filtro', label: t('Filtro', 'Filter') },
                  { key: 'R2', label: 'R²' },
                  { key: 'MSE', label: 'MSE' },
                  { key: 'RMSE', label: 'RMSE' },
                  { key: 'MAE', label: 'MAE' },
                  { key: 'Latencia_ms', label: t('Latencia (ms)', 'Latency (ms)') },
                ]}
              />
            </div>

            {/* Bar Chart por Filtro */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                R² {t('por Modelo · Filtro:', 'by Model · Filter:')} {selectedFiltro}
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {filtros.map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFiltro(f)}
                    style={{
                      padding: '8px 16px',
                      background: selectedFiltro === f ? 'var(--prediction)' : 'transparent',
                      color: selectedFiltro === f ? '#fff' : 'var(--text)',
                      border: `1px solid ${selectedFiltro === f ? 'var(--prediction)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: 'var(--fs-sm)',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <PlotlyBarChart data={barData} title="" horizontal referenceLine={0} />
            </div>

            {/* Heatmap Modelo x Filtro */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                Heatmap R² · {t('Modelo', 'Model')} × {t('Filtro', 'Filter')}
              </h3>
              <Heatmap
                x={filtros}
                y={modelos}
                z={modelos.map(mod => filtros.map(fil => {
                  const row = global.find((g: any) => g.Modelo === mod && g.Filtro === fil);
                  return row?.R2 ?? 0;
                }))}
                title=""
                height={400}
              />
            </div>

            {/* Resumen Estadístico */}
            {resumen.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                  {t('Resumen Estadístico por Modelo', 'Statistical Summary by Model')}
                </h3>
                <DataTable
                  data={resumen as unknown as Record<string, unknown>[]}
                  title=""
                  columns={[
                    { key: 'Modelo', label: t('Modelo', 'Model') },
                    { key: 'n', label: 'n' },
                    { key: 'mu_R2', label: 'μ R²' },
                    { key: 'sigma_R2', label: 'σ R²' },
                    { key: 'min', label: 'Min' },
                    { key: 'max', label: 'Max' },
                  ]}
                />
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'expB' && (
          <div>
            {/* TD-CNN */}
            {props.tdCnnGlobal && props.tdCnnGlobal.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                  {t('Modelos TD-CNN · Resultados Globales', 'TD-CNN Models · Global Results')}
                </h2>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '16px' }}>
                  {t('Arquitecturas TD-CNN-LSTM y TD-CNN-GRU entrenadas con el mismo pool multi-paciente.', 'TD-CNN-LSTM and TD-CNN-GRU architectures trained with the same multi-patient pool.')}
                </p>
                <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                  <DataTable
                    data={props.tdCnnGlobal as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Modelo', label: t('Modelo', 'Model') },
                      { key: 'Filtro', label: t('Filtro', 'Filter') },
                      { key: 'R2', label: 'R²' },
                      { key: 'MSE', label: 'MSE' },
                      { key: 'RMSE', label: 'RMSE' },
                      { key: 'MAE', label: 'MAE' },
                      { key: 'Latencia_ms', label: t('Latencia (ms)', 'Latency (ms)') },
                    ]}
                  />
                </div>
                <PlotlyBarChart
                  data={props.tdCnnGlobal.map((r: any) => ({ name: `${r.Modelo}`, value: r.R2, color: MODEL_COLORS[r.Modelo] || '#6b7280' }))}
                  title="TD-CNN R² Global"
                  xAxisLabel="R²"
                  horizontal
                  height={200}
                />
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'estadisticas' && (
          <div>
            {/* ANÁLISIS DE SOBREAJUSTE */}
            {props.overfit && props.overfit.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                  {t('Análisis de Sobreajuste · R² Train vs Test', 'Overfitting Analysis · R² Train vs Test')}
                </h2>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '16px' }}>
                  {t('Gap = R² train − R² test. Menor gap = mejor generalización.', 'Gap = R² train − R² test. Lower gap = better generalization.')}
                </p>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <DataTable
                    data={props.overfit as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Modelo', label: t('Modelo', 'Model') },
                      { key: 'Filtro', label: t('Filtro', 'Filter') },
                      { key: 'R2_train', label: 'R² Train' },
                      { key: 'R2_test', label: 'R² Test' },
                      { key: 'GAP', label: 'Gap' },
                    ]}
                  />
                </div>
                <PlotlyBarChart
                  data={props.overfit.map((r: any, i: any) => {
                    const color = r.GAP < 0.05 ? '#3b82f6' : r.GAP < 0.15 ? '#f59e0b' : '#ef4444';
                    return { name: `${r.Modelo} · ${r.Filtro}`, value: r.GAP, color };
                  })}
                  title=""
                  xAxisLabel="Gap (R² train − test)"
                  horizontal
                  height={400}
                />
              </div>
            )}

            {/* TEST DE WILCOXON */}
            {props.wilcoxon && props.wilcoxon.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                  {t('Test de Wilcoxon · Comparaciones Pareadas entre Modelos', 'Wilcoxon Test · Paired Model Comparisons')}
                </h2>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '16px' }}>
                  {t('Prueba no paramétrica sobre R² de 48 pacientes (mejor filtro).', 'Non-parametric test on R² of 48 patients (best filter).')}
                </p>
                <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                  <DataTable
                    data={props.wilcoxon as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Modelo_A', label: t('Modelo A', 'Model A') },
                      { key: 'Modelo_B', label: t('Modelo B', 'Model B') },
                      { key: 'W_stat', label: 'W' },
                      { key: 'p_value', label: t('p-valor', 'p-value') },
                      { key: 'Sig', label: 'Sig.' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'filtros_hallazgos' && (
          <div>
            {/* Hallazgos NB4B */}
            <FindingsSection title={t('Hallazgos Principales', 'Key Findings')}>
              <FindingCard
                number={1}
                title={t('RF lidera R² absoluto', 'RF leads absolute R²')}
                description={t('RF con F_MED alcanza el mejor resultado global del experimento.', 'RF with F_MED achieves the best global result of the experiment.')}
                significance="high"
              />
              <FindingCard
                number={2}
                title={t('GRU es estadísticamente superior', 'GRU is statistically superior')}
                description={t(`Wilcoxon confirma que GRU supera a todos (p<0.01) con μ_R² = ${mejorModelo?.mu_R2?.toFixed(4) ?? 'N/A'}.`, `Wilcoxon confirms GRU outperforms all (p<0.01) with μ_R² = ${mejorModelo?.mu_R2?.toFixed(4) ?? 'N/A'}.`)}
                significance="high"
              />
              <FindingCard
                number={3}
                title={t('F_MED gana en R², pero por aplanar la señal', 'F_MED wins on R², but by flattening the signal')}
                description={t('Dentro de esta fase, la mediana simple basta y F_N+PB+MED introduce artefactos inter-paciente. La conclusión del proyecto, sin embargo, fue descartar la mediana: destruye el complejo QRS, que es justamente lo que el modelo debe predecir.', 'Within this phase, the simple median suffices and F_N+PB+MED introduces inter-patient artifacts. The conclusion of the project, however, was to discard the median: it destroys the QRS complex, which is precisely what the model must predict.')}
                significance="medium"
              />
              <FindingCard
                number={4}
                title={t('Gaps de sobreajuste mínimos', 'Minimal overfitting gaps')}
                description={t('Los menores de todo el proyecto, gracias al pool multi-sujeto que actúa como regularizador.', 'The lowest in the entire project, thanks to the multi-subject pool acting as a regularizer.')}
                significance="medium"
              />
              <FindingCard
                number={5}
                title={t('Eficiencia computacional', 'Computational efficiency')}
                description={t('Entrenamiento 15-18 s (vs ~600 s acumulados en NB2). Latencias < 0.5 ms.', 'Training 15-18 s (vs ~600 s accumulated in NB2). Latencies < 0.5 ms.')}
                significance="low"
              />
              <FindingCard
                number={6}
                title={t('Distribución bimodal por paciente', 'Bimodal distribution by patient')}
                description={t('R² muestra clusters: ~30% de pacientes con R² > 0.7 y ~20% con R² < 0.2.', 'R² shows clusters: ~30% of patients with R² > 0.7 and ~20% with R² < 0.2.')}
                significance="medium"
              />
              <FindingCard
                number={7}
                title={t('Paradigma viable para clínica', 'Viable paradigm for clinical use')}
                description={t('Un modelo multi-sujeto entrenado una vez puede desplegarse en nuevos pacientes sin reentrenamiento.', 'A multi-subject model trained once can be deployed on new patients without retraining.')}
                significance="high"
              />
              <FindingCard
                number={8}
                title={t('3 grupos estadísticos', '3 statistical groups')}
                description={t('Grupo A: GRU (solo). Grupo B: RF, MLP, LSTM (equivalentes). Grupo C: CNN-GRU, CNN-LSTM (inferiores).', 'Group A: GRU (alone). Group B: RF, MLP, LSTM (equivalent). Group C: CNN-GRU, CNN-LSTM (inferior).')}
                significance="low"
              />
              <FindingCard
                number={9}
                title={t('Arquitecturas CNN se degradan en multi-sujeto', 'CNN architectures degrade in multi-subject')}
                description={t('CNN-LSTM y CNN-GRU experimentan degradación significativa respecto al paradigma intra-paciente.', 'CNN-LSTM and CNN-GRU experience significant degradation compared to the intra-patient paradigm.')}
                significance="medium"
              />
              <FindingCard
                number={10}
                title={t('CNN-GRU y CNN-LSTM: arquitecturas inferiores', 'CNN-GRU and CNN-LSTM: inferior architectures')}
                description={t('R² consistente mente menor que los modelos recurrentes puros en el paradigma multi-sujeto.', 'R² consistently lower than pure recurrent models in the multi-subject paradigm.')}
                significance="low"
              />
            </FindingsSection>

            {/* Galería NB4B */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                {t('Galería de Visualizaciones · NB4B', 'Visualization Gallery · NB4B')}
              </h3>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '16px' }}>
                {t('Gráficas generadas durante la ejecución del notebook NB4B', 'Charts generated during NB4B notebook execution')}
              </p>
              <ImageGallery
                images={[
                  { src: '/data/nb4b/img/boxplot_nb4b.png', title: t('Boxplot R² por paciente (F_MED)', 'Boxplot R² per patient (F_MED)') },
                  { src: '/data/nb4b/img/barras_nb4b_modelo_filtro.png', title: t('Barras R² global · Modelo × Filtro', 'R² Bars global · Model × Filter') },
                  { src: '/data/nb4b/img/heatmap_nb4b.png', title: t('Heatmap R² · Modelo × Filtro', 'Heatmap R² · Model × Filter') },
                  { src: '/data/nb4b/img/ic95_nb4b.png', title: t('Intervalos de Confianza 95%', '95% Confidence Intervals') },
                  { src: '/data/nb4b/img/r2_por_paciente.png', title: t('Scatter R² por paciente', 'R² Scatter per patient') },
                  { src: '/data/nb4b/img/ejemplo_segmentos_60s.png', title: t('Ejemplo de segmentos ECG 60s', 'ECG 60s segment example') },
                  { src: '/data/nb4b/img/comparacion_td_cnn.png', title: t('Comparación CNN vs TD-CNN', 'CNN vs TD-CNN Comparison') },
                ]}
                columns={2}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface NB5ContentProps {
  resumen: import('@/types/ecg.types').NB5Resumen[];
  raw: import('@/types/ecg.types').NB5Raw[];
  loading: boolean;
  error: string | null;
  baseModel: import('@/types/ecg.types').NB5Resumen | null;
  ftModel: import('@/types/ecg.types').NB5Resumen | null;
  pacientesOrdenados: { paciente: string; r2: number; modelo: string }[];
  modelos: string[];
  ftEffect: { modeloBase: string; r2Base: number; r2FT: number; deltaR2: number; mejoraPct: number; pacientesMejorados: number; pacientesTotal: number };
  temporalDeg: { horizonte: string; r2Base: number; r2FT: number; deltaVsPrev: number }[];
  ic95Data: { Modelo: string; Media: number; IC95_inf: number; IC95_sup: number }[];
  r2Distribution: { rango: string; base: number; ft: number }[];
  gapData: { Modelo: string; R2_train: number; R2_test: number; GAP: number }[];
  totalEvals: number;
}

const NB5_COLORS: Record<string, string> = {
  CNN_GRU_ATTN: '#3b82f6',
  CNN_GRU_ATTN_FT: '#f59e0b',
};

function NB5Content(props: NB5ContentProps) {
  const {
    raw, loading, error, baseModel, ftModel,
    pacientesOrdenados, ftEffect, temporalDeg, ic95Data,
    r2Distribution, gapData, totalEvals,
  } = props;
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const { t } = useLang();
  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'expA' | 'expB' | 'estadisticas' | 'filtros_hallazgos'>('resumen');

  const top5 = pacientesOrdenados.filter((p: any) => !String(p.paciente).startsWith('I')).slice(0, 5);
  const bottom5 = [...pacientesOrdenados].reverse().slice(0, 5);

  const r2ByPatientSorted = useMemo(() => {
    const baseMap = new Map(raw.filter((r: any) => r.Modelo === 'CNN_GRU_ATTN').map(r => [String(r.paciente_test), r.R2_total]));
    return pacientesOrdenados.map((p: any) => ({
      paciente: String(p.paciente),
      r2: Number(p.r2.toFixed(4)),
      color: p.r2 >= 0.7 ? '#10b981' : p.r2 >= 0.5 ? '#3b82f6' : p.r2 >= 0.2 ? '#f59e0b' : '#ef4444',
      baseR2: baseMap.get(String(p.paciente)) ?? 0,
    }));
  }, [pacientesOrdenados, raw]);

  const baseRows = useMemo(() => raw.filter((r: any) => r.Modelo === 'CNN_GRU_ATTN'), [raw]);
  const ftRows = useMemo(() => raw.filter((r: any) => r.Modelo === 'CNN_GRU_ATTN_FT'), [raw]);
  const ftR2Map = useMemo(() => new Map(ftRows.map((r: any) => [String(r.paciente_test), r.R2_total])), [ftRows]);

  const temporalDegTotal = useMemo(() => {
    if (temporalDeg.length < 3) return null;
    return temporalDeg[2].r2Base - temporalDeg[0].r2Base;
  }, [temporalDeg]);

  const r2Ge080 = useMemo(() => {
    const cat = r2Distribution.find((r: any) => r.rango === 'R² ≥ 0.80');
    return { count: cat?.base ?? 0, total: baseRows.length };
  }, [r2Distribution, baseRows]);

  const boxTraces = useMemo(() => {
    return (['CNN_GRU_ATTN', 'CNN_GRU_ATTN_FT'] as const).map(model => {
      const vals = raw.filter(r => r.Modelo === model).map(r => r.R2_total);
      return { model, vals, color: NB5_COLORS[model] ?? '#888' };
    }).filter(t2 => t2.vals.length > 0);
  }, [raw]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>{t('Cargando datos de NB6...', 'Loading NB6 data...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alert)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>Error: {error}</div>
      </div>
    );
  }

  const subTabs = [
    { id: 'resumen' as const, label: t('Resumen', 'Summary'), icon: <TrendingUp size={14} /> },
    { id: 'expA' as const, label: t('Exp A: Base Model', 'Exp A: Base Model'), icon: <Activity size={14} /> },
    { id: 'expB' as const, label: t('Exp B: Fine-Tuned', 'Exp B: Fine-Tuned'), icon: <Zap size={14} /> },
    { id: 'estadisticas' as const, label: t('Estadísticas', 'Statistics'), icon: <BarChart3 size={14} /> },
    { id: 'filtros_hallazgos' as const, label: t('Filtros / Hallazgos', 'Filters / Findings'), icon: <Filter size={14} /> },
  ];

  return (
    <div>
      {/* Above the Fold Summary Panel */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: '24px',
        marginBottom: '24px',
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {/* Left: Metadata */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ letterSpacing: '2px', fontSize: 'var(--fs-xs)' }}>Experimento 6 · NB6</span>
              <span style={{ fontSize: 'var(--fs-xs)', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-data)', color: 'var(--signal)' }}>06_Cross_patient_MultiStep.ipynb</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>
              {t('Cross-patient Multi-step LOPO · CNN-GRU con Atención Temporal', 'Cross-patient Multi-step LOPO · CNN-GRU with Temporal Attention')}
            </h2>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', margin: 0 }}>
              {t('LOPO (Leave-One-Patient-Out) con horizonte H=3 latidos simultáneos y fine-tuning rápido.', 'LOPO (Leave-One-Patient-Out) with H=3 simultaneous beats horizon and quick fine-tuning.')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            <span><strong>Dataset:</strong> MIT-BIH (48) + INCART (75) = 123 pacientes</span>
            <span><strong>Partición:</strong> LOPO (Leave-One-Patient-Out)</span>
          </div>
        </div>

        {/* Right: Key KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: '10px', flex: '1 1 320px', alignContent: 'center' }}>
          <MetricStat
            densa
            fase="E6"
            etiqueta={<>{t('R² Total (Base)', 'R² Total (Base)')}</>}
            valor={<>{baseModel?.R2_total_mean?.toFixed(4) ?? '—'}</>}
            nota={<>CNN_GRU_ATTN</>}
          />
          <MetricStat
            densa
            fase="E6"
            etiqueta={<>{t('R² Total (FT)', 'R² Total (FT)')}</>}
            valor={<>{ftModel?.R2_total_mean?.toFixed(4) ?? '—'}</>}
            nota={<>CNN_GRU_ATTN_FT</>}
          />
          <MetricStat
            densa
            fase="E6"
            etiqueta={<>{t('Gap Train-Test', 'Train-Test Gap')}</>}
            valor={<>{gapData[0]?.GAP?.toFixed(4) ?? '—'}</>}
            nota={<>{t('Generalización', 'Generalization')}</>}
          />
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        width: 'fit-content',
        flexWrap: 'wrap',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {subTabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeSubTab === id ? 'var(--accent-bg, rgba(6, 182, 212, 0.15))' : 'transparent',
              color: activeSubTab === id ? 'var(--signal, #06b6d4)' : 'var(--text-sub)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-xs)',
              fontWeight: activeSubTab === id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeSubTab === 'resumen' && (
          <div>
            {/* KPI Cards (8) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))', gap: '10px', marginBottom: '28px' }}>
              <MetricStat
                densa
                fase="E6"
                etiqueta={<>{t('R² Total (Base)', 'R² Total (Base)')}</>}
                valor={<>{baseModel?.R2_total_mean?.toFixed(4) ?? 'N/A'}</>}
                nota={<>σ = {baseModel?.R2_total_std?.toFixed(4) ?? '—'}</>}
              />
              <MetricStat
                densa
                fase="E6"
                etiqueta={<>{t('R² Total (FT)', 'R² Total (FT)')}</>}
                valor={<>{ftModel?.R2_total_mean?.toFixed(4) ?? 'N/A'}</>}
                nota={<>σ = {ftModel?.R2_total_std?.toFixed(4) ?? '—'}</>}
              />
              <MetricStat
                densa
                fase="E6"
                etiqueta={<>{t('Gap Train-Test', 'Train-Test Gap')}</>}
                valor={<>{gapData[0]?.GAP?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{t('Generalización excelente', 'Excellent generalization')}</>}
              />
              <MetricStat
                densa
                fase="E6"
                etiqueta={<>{t('Shape Corr', 'Shape Corr')}</>}
                valor={<>{baseModel?.Shape_Corr_mean?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{t('Correlación morfológica', 'Morphological correlation')}</>}
              />
              <MetricStat
                densa
                fase="E6"
                etiqueta={<>{t('Deg. Temporal', 'Temporal Deg.')}</>}
                valor={<>{temporalDegTotal != null ? (temporalDegTotal >= 0 ? '+' : '') + temporalDegTotal.toFixed(4) : 'N/A'}</>}
                nota={<>{t('t+1→t+3', 't+1→t+3')}</>}
              />
              <MetricStat
                densa
                fase="E6"
                etiqueta={<>{t('Pacientes R²≥0.80', 'Patients R²≥0.80')}</>}
                valor={<>{r2Ge080.count} ({r2Ge080.total > 0 ? ((r2Ge080.count / r2Ge080.total) * 100).toFixed(1) : '—'}%)</>}
                nota={<>{t(`de ${r2Ge080.total} totales`, `of ${r2Ge080.total} total`)}</>}
              />
              <MetricStat
                densa
                fase="E6"
                etiqueta={<>{t('Forecast Score', 'Forecast Score')}</>}
                valor={<>{baseModel?.Forecast_Score_mean?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{t('Métrica compuesta', 'Composite metric')}</>}
              />
              <MetricStat
                densa
                fase="E6"
                etiqueta={<>RMSE</>}
                valor={<>{baseModel?.RMSE_total_mean?.toFixed(4) ?? 'N/A'}</>}
                nota={<>σ = {baseModel?.RMSE_total_std?.toFixed(4) ?? '—'}</>}
              />
            </div>

              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)' }}>
                  {t('Interpretación de Resultados en el Contexto del Problema', 'Interpretation of Results in the Problem Context')}
                </h3>
                <div style={{
                  padding: '16px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--fs-sm)',
                  lineHeight: 1.7,
                  color: 'var(--text-sub)',
                  maxWidth: '92ch',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}>
                <p>{t(`El NB6 representa la expansión más ambiciosa del proyecto en tres dimensiones: base de datos (48→123 pacientes), horizonte de predicción (1→3 latidos) y arquitectura (CNN_GRU_ATTN con atención temporal y pérdida ECG compuesta). El R² = ${baseModel?.R2_total_mean?.toFixed(4) ?? '—'} del modelo base, obtenido sin que el modelo haya visto jamás al paciente de prueba, demuestra que existe un `, `NB6 represents the most ambitious expansion of the project in three dimensions: database (48→123 patients), prediction horizon (1→3 beats), and architecture (CNN_GRU_ATTN with temporal attention and composite ECG loss). The R² = ${baseModel?.R2_total_mean?.toFixed(4) ?? '—'} of the base model, obtained without the model ever seeing the test patient, demonstrates that there is a `)}<strong>{t('componente morfológico universal', 'universal morphological component')}</strong>{t(' transferible entre sujetos.', ' transferable between subjects.')}</p>
                <p>{t(`El gap train-test de ${gapData[0]?.GAP?.toFixed(4) ?? '—'} es el más bajo de toda la trayectoria experimental, incluyendo los paradigmas intra-paciente de NB1 y NB2. Esto valida que la combinación de dataset ampliado + arquitectura con regularización implícita (atención temporal + conexión residual + pérdida ECG compuesta) mitiga efectivamente el sobreajuste.`, `The train-test gap of ${gapData[0]?.GAP?.toFixed(4) ?? '—'} is the lowest in the entire experimental trajectory, including NB1 and NB2 intra-patient paradigms. This validates that the combination of expanded dataset + architecture with implicit regularization (temporal attention + residual connection + composite ECG loss) effectively mitigates overfitting.`)}</p>
                <p>{t(`La degradación temporal multi-step es sorprendentemente contenida (${temporalDegTotal != null ? ((temporalDegTotal / (temporalDeg[0]?.r2Base || 1)) * 100).toFixed(1) : '—'}% de t+1→t+3). La conexión residual obliga al modelo a aprender diferencias incrementales (last_beat + delta), reduciendo la acumulación de errores en predicción multi-step.`, `The multi-step temporal degradation is surprisingly contained (${temporalDegTotal != null ? ((temporalDegTotal / (temporalDeg[0]?.r2Base || 1)) * 100).toFixed(1) : '—'}% from t+1→t+3). The residual connection forces the model to learn incremental differences (last_beat + delta), reducing error accumulation in multi-step prediction.`)}</p>
                <p>{t('La brecha sistemática entre datasets es notable: ningún paciente MIT-BIH obtuvo R² negativo, mientras que 5 pacientes INCART mantuvieron R² &lt; 0. Esto refleja la mayor diversidad morfológica de INCART y posibles artefactos de las grabaciones de Holter 24h.', 'The systematic gap between datasets is notable: no MIT-BIH patient obtained negative R², while 5 INCART patients maintained R² &lt; 0. This reflects the greater morphological diversity of INCART and possible artifacts from 24h Holter recordings.')}</p>
                </div>
              </div>
          </div>
        )}

        {activeSubTab === 'expA' && (
          <div>
            {/* Tabla Resumen Global */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Resumen Global · 2 Configuraciones LOPO', 'Global Summary · 2 LOPO Configurations')}</h3>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', marginBottom: '12px' }}>
                {t('Métricas de 123 folds LOPO. FT = Fine-tuning con 30 latidos del paciente objetivo.', 'Metrics from 123 LOPO folds. FT = Fine-tuning with 30 beats from the target patient.')}
              </p>
              <DataTable
                data={[
                  {
                    Modelo: 'CNN_GRU_ATTN',
                    'R² total': baseModel?.R2_total_mean?.toFixed(4) ?? '-',
                    'R² σ': baseModel?.R2_total_std?.toFixed(4) ?? '-',
                    'IC95 inf': ic95Data.find(r => r.Modelo === 'CNN_GRU_ATTN')?.IC95_inf?.toFixed(4) ?? '-',
                    'IC95 sup': ic95Data.find(r => r.Modelo === 'CNN_GRU_ATTN')?.IC95_sup?.toFixed(4) ?? '-',
                    RMSE: baseModel?.RMSE_total_mean?.toFixed(4) ?? '-',
                    Shape_Corr: baseModel?.Shape_Corr_mean?.toFixed(4) ?? '-',
                    Slope_MSE: baseModel?.Slope_MSE_mean?.toFixed(5) ?? '-',
                    Amp_Error: baseModel?.Amp_Error_mean?.toFixed(4) ?? '-',
                    Forecast_Score: baseModel?.Forecast_Score_mean?.toFixed(4) ?? '-',
                  },
                  {
                    Modelo: 'CNN_GRU_ATTN_FT',
                    'R² total': ftModel?.R2_total_mean?.toFixed(4) ?? '-',
                    'R² σ': ftModel?.R2_total_std?.toFixed(4) ?? '-',
                    'IC95 inf': ic95Data.find(r => r.Modelo === 'CNN_GRU_ATTN_FT')?.IC95_inf?.toFixed(4) ?? '-',
                    'IC95 sup': ic95Data.find(r => r.Modelo === 'CNN_GRU_ATTN_FT')?.IC95_sup?.toFixed(4) ?? '-',
                    RMSE: ftModel?.RMSE_total_mean?.toFixed(4) ?? '-',
                    Shape_Corr: ftModel?.Shape_Corr_mean?.toFixed(4) ?? '-',
                    Slope_MSE: ftModel?.Slope_MSE_mean?.toFixed(5) ?? '-',
                    Amp_Error: ftModel?.Amp_Error_mean?.toFixed(4) ?? '-',
                    Forecast_Score: ftModel?.Forecast_Score_mean?.toFixed(4) ?? '-',
                  },
                ] as unknown as Record<string, unknown>[]}
                title=""
                columns={[
                  { key: 'Modelo', label: 'Modelo' },
                  { key: 'R² total', label: 'R² total' },
                  { key: 'R² σ', label: 'R² σ' },
                  { key: 'IC95 inf', label: 'IC95 inf' },
                  { key: 'IC95 sup', label: 'IC95 sup' },
                  { key: 'RMSE', label: 'RMSE' },
                  { key: 'Shape_Corr', label: 'Shape_Corr' },
                  { key: 'Slope_MSE', label: 'Slope_MSE' },
                  { key: 'Amp_Error', label: 'Amp_Error' },
                  { key: 'Forecast_Score', label: 'Forecast_Score' },
                ]}
              />
            </div>

            {/* Degradación Temporal Multi-step */}
            {temporalDeg.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Degradación Temporal Multi-step · R² por Horizonte', 'Multi-step Temporal Degradation · R² per Horizon')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  <DataTable
                    data={temporalDeg.map((r: any) => ({
                      Horizonte: r.horizonte,
                      'R² base': r.r2Base.toFixed(4),
                      'R² FT': r.r2FT.toFixed(4),
                      'Δ vs prev': r.deltaVsPrev !== 0 ? (r.deltaVsPrev >= 0 ? '+' : '') + r.deltaVsPrev.toFixed(4) : '—',
                    })) as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Horizonte', label: t('Horizonte', 'Horizon') },
                      { key: 'R² base', label: 'R² base' },
                      { key: 'R² FT', label: 'R² FT' },
                      { key: 'Δ vs prev', label: 'Δ vs prev' },
                    ]}
                  />
                  <PlotlyGroupedBarChart
                    data={temporalDeg.map((r: any) => ({
                      name: r.horizonte,
                      Base: r.r2Base,
                      'Fine-Tuned': r.r2FT,
                    }))}
                    categories={['Base', 'Fine-Tuned']}
                    colors={['#3b82f6', '#f59e0b']}
                    yAxisLabel="R²"
                    height={280}
                  />
                </div>
              </div>
            )}

            {/* R² Promedio por Paciente */}
            {r2ByPatientSorted.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('R² por Paciente · 123 Pacientes LOPO', 'R² per Patient · 123 LOPO Patients')}</h3>
                <PlotlyChart
                  data={[{
                    type: 'bar',
                    x: r2ByPatientSorted.map((p: any) => 'P' + p.paciente),
                    y: r2ByPatientSorted.map((p: any) => p.r2),
                    text: r2ByPatientSorted.map(p => p.r2.toFixed(2)),
                    textposition: 'outside',
                    textfont: { size: 7, color: 'var(--text-muted)' },
                    marker: { color: r2ByPatientSorted.map((p: any) => p.color) },
                    hovertemplate: t('Paciente %{x}<br>R² = <b>%{y:.4f}</b><extra></extra>', 'Patient %{x}<br>R² = <b>%{y:.4f}</b><extra></extra>'),
                    cliponaxis: false,
                  }]}
                  layout={{
                    height: 400,
                    xaxis: { type: 'category', title: { text: t('Paciente (ID)', 'Patient (ID)'), font: { size: 11, color: 'var(--text-muted)' } }, tickangle: -60, tickfont: { size: 6, color: 'var(--text-muted)' }, categoryorder: 'array', categoryarray: r2ByPatientSorted.map((p: any) => 'P' + p.paciente) },
                    yaxis: { title: { text: 'R²', font: { size: 11, color: 'var(--text-muted)' } }, range: [-0.4, 1.08], tickfont: { size: 10, color: 'var(--text-muted)' } },
                    shapes: [
                      { type: 'line', x0: -0.5, x1: r2ByPatientSorted.length - 0.5, y0: 0.5, y1: 0.5, line: { dash: 'dash', color: 'rgba(59,130,246,0.5)', width: 1 } },
                      { type: 'line', x0: -0.5, x1: r2ByPatientSorted.length - 0.5, y0: 0, y1: 0, line: { dash: 'dot', color: 'rgba(239,68,68,0.5)', width: 1 } },
                    ],
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'var(--surface)',
                    font: { color: 'var(--text)' },
                    margin: { t: 24, b: 75, l: 50, r: 14 },
                    showlegend: false,
                    bargap: 0.08,
                  }}
                  style={{ width: '100%', height: 400 }}
                />
              </div>
            )}

            {/* Distribución R² por Rango */}
            {r2Distribution.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Distribución de R² por Rango', 'R² Distribution by Range')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  <DataTable
                    data={r2Distribution.map((r: any) => ({
                      Rango: r.rango,
                      'Base': r.base,
                      'Fine-Tuned': r.ft,
                      'Δ': r.ft - r.base,
                    })) as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Rango', label: t('Rango R²', 'R² Range') },
                      { key: 'Base', label: 'Base' },
                      { key: 'Fine-Tuned', label: 'FT' },
                      { key: 'Δ', label: 'Δ' },
                    ]}
                  />
                  <PlotlyGroupedBarChart
                    data={r2Distribution.map((r: any) => ({
                      name: r.rango,
                      Base: r.base,
                      'Fine-Tuned': r.ft,
                    }))}
                    categories={['Base', 'Fine-Tuned']}
                    colors={['#3b82f6', '#f59e0b']}
                    yAxisLabel={t('N. pacientes', 'N. patients')}
                    height={280}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'expB' && (
          <div>
            {/* Efecto Fine-Tuning */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Efecto del Fine-Tuning (K=30 latidos)', 'Fine-Tuning Effect (K=30 beats)')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <DataTable
                  data={[{
                    'Modelo base': ftEffect.modeloBase,
                    'R² base': ftEffect.r2Base.toFixed(4),
                    'R² FT': ftEffect.r2FT.toFixed(4),
                    'ΔR²': (ftEffect.deltaR2 >= 0 ? '+' : '') + ftEffect.deltaR2.toFixed(4),
                    'Mejora %': (ftEffect.mejoraPct >= 0 ? '+' : '') + ftEffect.mejoraPct.toFixed(2) + '%',
                    'Pac. mejorados': `${ftEffect.pacientesMejorados}/${ftEffect.pacientesTotal}`,
                  }] as unknown as Record<string, unknown>[]}
                  title=""
                  columns={[
                    { key: 'Modelo base', label: t('Modelo base', 'Base Model') },
                    { key: 'R² base', label: 'R² base' },
                    { key: 'R² FT', label: 'R² FT' },
                    { key: 'ΔR²', label: 'ΔR²' },
                    { key: 'Mejora %', label: t('Mejora %', 'Improvement %') },
                    { key: 'Pac. mejorados', label: t('Pac. mejorados', 'Improved pts') },
                  ]}
                />
                <div>
                  <PlotlyChart
                    data={[{
                      type: 'scatter',
                      mode: 'markers',
                      x: baseRows.map((r: any) => r.R2_total),
                      y: baseRows.map((r: any) => (ftR2Map.get(String(r.paciente_test)) ?? 0) - r.R2_total),
                      text: baseRows.map((r: any) => `Pac ${r.paciente_test}<br>Base: ${r.R2_total.toFixed(3)}<br>ΔR²: ${((ftR2Map.get(String(r.paciente_test)) ?? 0) - r.R2_total).toFixed(4)}`),
                      hovertemplate: '%{text}<extra></extra>',
                      marker: {
                        color: baseRows.map((r: any) => (ftR2Map.get(String(r.paciente_test)) ?? 0) - r.R2_total >= 0 ? '#10b981' : '#ef4444'),
                        size: 7,
                        opacity: 0.7,
                      },
                      name: t('ΔR² por paciente', 'ΔR² per patient'),
                    }, {
                      type: 'scatter',
                      mode: 'lines',
                      x: [-0.5, 1.1],
                      y: [0, 0],
                      line: { dash: 'dot', color: 'var(--border)', width: 1 },
                      showlegend: false,
                      hoverinfo: 'skip',
                    }]}
                    layout={{
                      height: 300,
                      xaxis: { title: { text: 'R² base', font: { size: 11 } }, range: [-0.5, 1.05] },
                      yaxis: { title: { text: 'ΔR² (FT − base)', font: { size: 11 } } },
                      font: { color: 'var(--text)' },
                      margin: { t: 14, b: 40, l: 60, r: 14 },
                      showlegend: false,
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'var(--surface)',
                    }}
                    style={{ width: '100%', height: 300 }}
                  />
                </div>
              </div>
            </div>

            {/* Top/Bottom Pacientes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>{t('Top 5 Pacientes (MIT-BIH)', 'Top 5 Patients (MIT-BIH)')}</h3>
                <DataTable
                  data={top5.map((p: any) => ({ Paciente: p.paciente, 'R² medio': p.r2.toFixed(4) })) as unknown as Record<string, unknown>[]}
                  title=""
                  columns={[{ key: 'Paciente', label: 'Paciente' }, { key: 'R² medio', label: 'R² medio' }]}
                />
              </div>
              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>{t('Top 5 Pacientes Complicados (INCART)', 'Top 5 Difficult Patients (INCART)')}</h3>
                <DataTable
                  data={bottom5.map((p: any) => ({ Paciente: p.paciente, 'R² medio': p.r2.toFixed(4) })) as unknown as Record<string, unknown>[]}
                  title=""
                  columns={[{ key: 'Paciente', label: 'Paciente' }, { key: 'R² medio', label: 'R² medio' }]}
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'estadisticas' && (
          <div>
            {/* Boxplots R² por modelo */}
            {boxTraces.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Distribución R² por Paciente · Boxplots (2 configuraciones)', 'R² Distribution per Patient · Boxplots (2 configurations)')}</h3>
                <PlotlyChart
                  data={boxTraces.map(t2 => ({
                    type: 'box',
                    y: t2.vals,
                    name: t2.model,
                    marker: { color: t2.color },
                    boxmean: true,
                  }))}
                  layout={{
                    yaxis: { title: { text: t('R² por paciente (123 folds)', 'R² per patient (123 folds)') } },
                    height: 420,
                    showlegend: false,
                    shapes: [{ type: 'line', x0: -0.5, x1: boxTraces.length - 0.5, y0: 0, y1: 0, line: { dash: 'dash', color: 'red', width: 1 } }],
                    font: { color: 'var(--text)' },
                    margin: { t: 20, b: 40, l: 50, r: 20 },
                  }}
                  style={{ width: '100%', height: 420 }}
                />
              </div>
            )}

            {/* Gap Train–Test */}
            {gapData.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Brecha Train-Test · Gap de Generalización LOPO', 'Train-Test Gap · LOPO Generalization Gap')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <DataTable
                    data={gapData.map((g: any) => ({
                      Modelo: g.Modelo,
                      'R² train': g.R2_train.toFixed(4),
                      'R² test': g.R2_test.toFixed(4),
                      GAP: g.GAP.toFixed(4),
                      Nivel: g.GAP < 0.15 ? t('Excelente', 'Excellent') : g.GAP < 0.30 ? t('Moderado', 'Moderate') : t('Alto', 'High'),
                    })) as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Modelo', label: 'Modelo' },
                      { key: 'R² train', label: 'R² train' },
                      { key: 'R² test', label: 'R² test' },
                      { key: 'GAP', label: 'GAP' },
                      { key: 'Nivel', label: t('Nivel', 'Level') },
                    ]}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                    <div style={{ padding: '12px 14px', background: isDark ? 'rgba(16,185,129,0.08)' : '#ecfdf5', borderRadius: '8px', border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : '#6ee7b7'}`, fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>
                      <strong>{t('Comparación con NB5B:', 'Comparison with NB5B:')}</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
                        <li>NB5B GRU_base: gap = 0.3341</li>
                        <li>NB5B CNN_GRU: gap = 0.2987</li>
                        <li>NB5B BiGRU_MHA: gap = 0.4398</li>
                        <li><strong>NB6 CNN_GRU_ATTN: gap = 0.0956</strong> </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Forest Plot IC 95% */}
            {ic95Data.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Intervalos de Confianza 95 % · R² Total', '95% Confidence Intervals · Total R²')}</h3>
                <ForestPlot
                  data={ic95Data.map((row: any) => ({
                    modelo: row.Modelo,
                    media: row.Media,
                    icInf: row.IC95_inf,
                    icSup: row.IC95_sup,
                    color: NB5_COLORS[row.Modelo] ?? '#888',
                  }))}
                  xAxisLabel="R²"
                  referenceLine={0.5}
                />
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'filtros_hallazgos' && (
          <div>
            {/* Key Findings */}
            <FindingsSection title={t('Hallazgos Principales', 'Key Findings')}>
              <FindingCard number={1} title={t('R² = 0.6734 con 123 pacientes demuestra escalabilidad', 'R² = 0.6734 with 123 patients demonstrates scalability')} description={t('El modelo CNN_GRU_ATTN supera al mejor NB5B (0.5484) en un +22.8 % con 2.56× más pacientes y 3× horizonte, simultáneamente.', 'CNN_GRU_ATTN outperforms the best NB5B (0.5484) by +22.8 % with 2.56× more patients and 3× horizon, simultaneously.')} significance="high" />
              <FindingCard number={2} title={t('Brecha entrenamiento-prueba = 0.0956: generalización contenida', 'Train-test gap = 0.0956: contained generalization')} description={t('El gap más bajo del proyecto (vs 0.30–0.44 de NB5B). Dataset ampliado + atención temporal + pérdida ECG compuesta mitigan el sobreajuste inter-paciente.', 'The lowest gap in the project (vs 0.30–0.44 from NB5B). Expanded dataset + temporal attention + composite ECG loss mitigate inter-patient overfitting.')} significance="high" />
              <FindingCard number={3} title={t('Degradación temporal estable: −3.35 % de t+1 a t+3', 'Stable temporal degradation: −3.35 % from t+1 to t+3')} description={t('La conexión residual (last_beat + delta) previene degradación exponencial. t+2→t+3 se estabiliza en −2.38 %.', 'The residual connection (last_beat + delta) prevents exponential degradation. t+2→t+3 stabilizes at −2.38 %.')} significance="high" />
              <FindingCard number={4} title={t('Shape_Corr = 0.8383: fidelidad morfológica confirmada', 'Shape_Corr = 0.8383: morphological fidelity confirmed')} description={t('El modelo reproduce la secuencia morfológica (P-QRS-T) con alta fidelidad. Slope_MSE = 0.0223 indica captura precisa del pico R.', 'The model reproduces the morphological sequence (P-QRS-T) with high fidelity. Slope_MSE = 0.0223 indicates precise R-peak capture.')} significance="medium" />
              <FindingCard number={5} title={t('Brecha MIT-BIH vs INCART: 5 pacientes INCART con R² < 0', 'MIT-BIH vs INCART gap: 5 INCART patients with R² < 0')} description={t('Ningún paciente MIT-BIH obtuvo R² negativo. INCART tiene mayor diversidad morfológica y artefactos de Holter 24h que dificultan la generalización.', 'No MIT-BIH patient obtained negative R². INCART has greater morphological diversity and 24h Holter artifacts that hinder generalization.')} significance="medium" />
              <FindingCard number={6} title={t('Fine-tuning con 30 latidos: 92.7 % de pacientes mejoran', 'Fine-tuning with 30 beats: 92.7 % of patients improve')} description={t('ΔR² = +0.0063 (+0.93 %), significativo según Wilcoxon pareado (p = 2.9×10⁻²⁰), aunque de magnitud pequeña. Los 9 pacientes que no mejoran no comparten un patrón único: su R² base va de 0.1333 a 0.9757.', 'ΔR² = +0.0063 (+0.93 %), significant under paired Wilcoxon (p = 2.9×10⁻²⁰), though small in magnitude. The 9 patients that do not improve share no single pattern: their base R² ranges from 0.1333 to 0.9757.')} significance="medium" />
            </FindingsSection>

            {/* Galería */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>{t('Galería de Visualizaciones · NB6', 'Visualizations Gallery · NB6')}</h3>
              <ImageGallery
                images={[
                  { src: '/data/nb5/img/10_boxplot_r2_total.png', title: t('Boxplot R² · CNN_GRU_ATTN Base vs FT', 'Boxplot R² · CNN_GRU_ATTN Base vs FT') },
                  { src: '/data/nb5/img/10_r2_pacientes_CNN_GRU_ATTN.png', title: t('R² por Paciente · CNN_GRU_ATTN', 'R² per Patient · CNN_GRU_ATTN') },
                  { src: '/data/nb5/img/10_degradacion_temporal.png', title: t('Degradación Temporal Multi-step', 'Multi-step Temporal Degradation') },
                  { src: '/data/nb5/img/07_demo_CNN_GRU_ATTN.png', title: t('Demo Predicción · CNN_GRU_ATTN', 'Prediction Demo · CNN_GRU_ATTN') },
                  { src: '/data/nb5/img/03_ecg_filtrado.png', title: t('ECG Filtrado · Pipeline NB6', 'Filtered ECG · NB6 Pipeline') },
                  { src: '/data/nb5/img/12_5_real_vs_pred_ft.png', title: t('Real vs Predicho (Fine-Tuned)', 'Actual vs Predicted (Fine-Tuned)') },
                  { src: '/data/nb5/img/12_5_prediccion_extendida_ft.png', title: t('Predicción Extendida (Fine-Tuned)', 'Extended Prediction (Fine-Tuned)') },
                  { src: '/data/nb5/img/12_5_tabla_metricas_ft.png', title: t('Tabla Métricas Fine-Tuning', 'Fine-Tuning Metrics Table') },
                ]}
                columns={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface NB5BContentProps {
  mejoresModelos: NB5BResumen[];
  bestIndividual: NB5BResumen | null;
  pacientesOrdenados: { paciente: string; r2: number }[];
  totalEvals: number;
  gapMinimo: { Modelo: string; R2_train: number; R2_test: number; GAP: number } | null;
  gapData: { Modelo: string; R2_train: number; R2_test: number; GAP: number }[];
  ftEffect: { modeloBase: string; r2Base: number; r2FT: number; deltaR2: number; mejoraPct: number }[];
  ic95Data: { Modelo: string; Media: number; IC95_inf: number; IC95_sup: number }[];
  comprehensiveTable: Record<string, Record<string, number>>;
  loading: boolean;
  error: string | null;
}

const NB5B_COLORS: Record<string, string> = {
  GRU_base: '#1f77b4', GRU_base_FT: '#aec7e8',
  CNN_GRU: '#d62728', CNN_GRU_FT: '#ff9896',
  BiGRU_MHA: '#9467bd', BiGRU_MHA_FT: '#c5b0d5',
  Ensemble: '#2ca02c', Ensemble_FT: '#17becf',
};

const NB5B_ORDER = ['GRU_base', 'CNN_GRU', 'BiGRU_MHA', 'GRU_base_FT', 'CNN_GRU_FT', 'BiGRU_MHA_FT', 'Ensemble', 'Ensemble_FT'];

function NB5BContent(props: NB5BContentProps) {
  const {
    mejoresModelos, bestIndividual, pacientesOrdenados, totalEvals,
    gapMinimo, gapData, ftEffect, ic95Data, comprehensiveTable, loading, error,
  } = props;
  const bestModel = mejoresModelos[0];
  const nb5bData = useECGStore((s) => s.nb5bData);
  const raw5b = nb5bData?.raw ?? [];
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const { t } = useLang();
  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'expA' | 'expB' | 'estadisticas' | 'filtros_hallazgos'>('resumen');

  // ── Todos los hooks ANTES de cualquier return condicional ─────────────────
  const comprehensiveRows = useMemo(() => {
    return NB5B_ORDER
      .filter(m => comprehensiveTable[m])
      .map(m => ({
        Modelo: m,
        'R² media': comprehensiveTable[m]['R2']?.toFixed(4) ?? '-',
        'R² σ': comprehensiveTable[m]['R2_std']?.toFixed(4) ?? '-',
        'IC95 inf': comprehensiveTable[m]['IC95_inf']?.toFixed(4) ?? '-',
        'IC95 sup': comprehensiveTable[m]['IC95_sup']?.toFixed(4) ?? '-',
        MSE: comprehensiveTable[m]['MSE']?.toFixed(4) ?? '-',
        RMSE: comprehensiveTable[m]['RMSE']?.toFixed(4) ?? '-',
        MAE: comprehensiveTable[m]['MAE']?.toFixed(4) ?? '-',
        DTW: comprehensiveTable[m]['DTW']?.toFixed(3) ?? '-',
      }));
  }, [comprehensiveTable]);

  const boxTraces = useMemo(() => {
    return NB5B_ORDER.map(model => {
      const vals = raw5b.filter((r: any) => r.Modelo === model).map((r: any) => r.R2);
      return { model, vals, color: NB5B_COLORS[model] ?? '#888' };
    }).filter(t => t.vals.length > 0);
  }, [raw5b]);

  const gapBarData = gapData.map((g: any) => ({
    name: g.Modelo,
    value: g.GAP,
    color: NB5B_COLORS[g.Modelo] ?? '#888',
  }));

  const top5 = pacientesOrdenados.slice(0, 5);
  const bottom5 = [...pacientesOrdenados].reverse().slice(0, 5);

  const r2ByPatientSorted = useMemo(() => {
    return pacientesOrdenados.map((p: any) => ({
      paciente: p.paciente,
      r2: Number(p.r2.toFixed(4)),
      color: p.r2 >= 0.7 ? '#10b981' : p.r2 >= 0.5 ? '#3b82f6' : p.r2 >= 0.2 ? '#f59e0b' : '#ef4444',
    }));
  }, [pacientesOrdenados]);

  // ── Scatter: tamaño muestra (n_test) vs R² (datos reales por fold) ────────
  const scatterSizeR2 = useMemo(() => {
    const BASE_MODELS = ['GRU_base', 'CNN_GRU', 'BiGRU_MHA'];
    return BASE_MODELS.map(model => {
      const rows = raw5b.filter((r: any) => r.Modelo === model);
      return {
        model,
        x: rows.map((r: any) => Number(r.n_test)),
        y: rows.map((r: any) => Number(r.R2)),
        patients: rows.map((r: any) => r.paciente_test),
        color: NB5B_COLORS[model] ?? '#888',
      };
    }).filter(t => t.x.length > 0);
  }, [raw5b]);

  // ── Radar: rendimiento normalizado por modelo (R², RMSE⁻¹, MAE⁻¹, DTW⁻¹) ──
  const radarData = useMemo(() => {
    const models = NB5B_ORDER.filter(m => comprehensiveTable[m]);
    if (!models.length) return [];
    const metrics: { key: string; label: string; invert: boolean }[] = [
      { key: 'R2', label: 'R²', invert: false },
      { key: 'RMSE', label: 'RMSE (invertido)', invert: true },
      { key: 'MAE', label: 'MAE (invertido)', invert: true },
      { key: 'DTW', label: 'DTW (invertido)', invert: true },
    ];
    const rawVals = metrics.map(m => models.map(md => comprehensiveTable[md]?.[m.key] ?? 0));
    const normalized = metrics.map((m, mi) => {
      const vals = rawVals[mi];
      const mn = Math.min(...vals), mx = Math.max(...vals);
      if (mx === mn) return vals.map(() => 0.5);
      return vals.map(v => m.invert ? (mx - v) / (mx - mn) : (v - mn) / (mx - mn));
    });
    return models.map((model, mi) => ({
      model,
      color: NB5B_COLORS[model] ?? '#888',
      values: metrics.map((_m, ki) => Number((normalized[ki][mi] * 100).toFixed(1))),
      labels: metrics.map(m => m.label),
    }));
  }, [comprehensiveTable]);

  // ── Validación INCART ─────────────────────────────────────────────────────
  const incartRows = (nb5bData?.incart ?? []).map(r => ({
    ...r,
    R2: Number(r.R2),
    MSE: Number(r.MSE),
    RMSE: Number(r.RMSE),
    MAE: Number(r.MAE),
    DTW: Number(r.DTW),
    Latencia_ms: Number(r.Latencia_ms),
    n_test: Number(r.n_test),
  }));
  const incartStats = useMemo(() => {
    if (!incartRows.length) return null;
    const r2vals = incartRows.map((r: any) => r.R2);
    const mean = r2vals.reduce((a, b) => a + b, 0) / r2vals.length;
    const std = Math.sqrt(r2vals.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / r2vals.length);
    const pctAbove05 = (r2vals.filter(v => v >= 0.5).length / r2vals.length) * 100;
    const best = incartRows.reduce((a, b) => a.R2 > b.R2 ? a : b);
    const worst = incartRows.reduce((a, b) => a.R2 < b.R2 ? a : b);
    return { mean, std, pctAbove05, best, worst, n: incartRows.length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nb5bData?.incart]);

  // ── Returns condicionales DESPUÉS de todos los hooks ─────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>{t('Cargando datos de NB5B...', 'Loading NB5B data...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alert)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>Error: {error}</div>
      </div>
    );
  }

  const subTabs = [
    { id: 'resumen' as const, label: t('Resumen', 'Summary'), icon: <TrendingUp size={14} /> },
    { id: 'expA' as const, label: t('Exp A: Base Models', 'Exp A: Base Models'), icon: <Activity size={14} /> },
    { id: 'expB' as const, label: t('Exp B: FT / INCART', 'Exp B: FT / INCART'), icon: <Zap size={14} /> },
    { id: 'estadisticas' as const, label: t('Estadísticas', 'Statistics'), icon: <BarChart3 size={14} /> },
    { id: 'filtros_hallazgos' as const, label: t('Filtros / Hallazgos', 'Filters / Findings'), icon: <Filter size={14} /> },
  ];

  return (
    <div>
      {/* Above the Fold Summary Panel */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: '24px',
        marginBottom: '24px',
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {/* Left: Metadata */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ letterSpacing: '2px', fontSize: 'var(--fs-xs)' }}>Experimento 5 · NB5B</span>
              <span style={{ fontSize: 'var(--fs-xs)', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-data)', color: 'var(--signal)' }}>05_cross_patient.ipynb</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>
              {t('Evaluación Cross-patient (LOPO)', 'Cross-patient Evaluation (LOPO)')}
            </h2>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', margin: 0 }}>
              {t('Evaluación Leave-One-Patient-Out (LOPO) sobre MIT-BIH y validación externa en INCART.', 'Leave-One-Patient-Out (LOPO) evaluation on MIT-BIH and external validation on INCART.')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            <span><strong>Dataset:</strong> MIT-BIH Arrhythmia Database · 48 pacientes</span>
            <span><strong>Partición:</strong> LOPO (Leave-One-Patient-Out)</span>
          </div>
        </div>

        {/* Right: Key KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: '10px', flex: '1 1 320px', alignContent: 'center' }}>
          <MetricStat
            densa
            fase="E5"
            etiqueta={<>{t('Mejor R² Global', 'Best Global R²')}</>}
            valor={<>{bestModel?.Media?.toFixed(4) ?? '—'}</>}
            nota={<>{bestModel?.Modelo}</>}
          />
          <MetricStat
            densa
            fase="E5"
            etiqueta={<>{t('R² INCART (ext.)', 'R² INCART (ext.)')}</>}
            valor={<>{incartStats?.mean?.toFixed(4) ?? '—'}</>}
            nota={<>{incartStats?.n ?? 0} {t('pacientes', 'patients')}</>}
          />
          <MetricStat
            densa
            fase="E5"
            etiqueta={<>{t('Min LOPO Gap', 'Min LOPO Gap')}</>}
            valor={<>{gapMinimo?.GAP?.toFixed(4) ?? '—'}</>}
            nota={<>{gapMinimo?.Modelo}</>}
          />
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        width: 'fit-content',
        flexWrap: 'wrap',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {subTabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeSubTab === id ? 'var(--accent-bg, rgba(6, 182, 212, 0.15))' : 'transparent',
              color: activeSubTab === id ? 'var(--signal, #06b6d4)' : 'var(--text-sub)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-xs)',
              fontWeight: activeSubTab === id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeSubTab === 'resumen' && (
          <div>
            {/* KPI Cards (6) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))', gap: '10px', marginBottom: '28px' }}>
              <MetricStat
                densa
                fase="E5"
                etiqueta={<>{t('Mejor R² Global (LOPO)', 'Best Global R² (LOPO)')}</>}
                valor={<>{bestModel?.Media?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{bestModel?.Modelo} · σ={bestModel?.Std?.toFixed(4)}</>}
              />
              <MetricStat
                densa
                fase="E5"
                etiqueta={<>{t('Mejor Modelo Individual', 'Best Individual Model')}</>}
                valor={<>{bestIndividual?.Media?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{bestIndividual?.Modelo}</>}
              />
              <MetricStat
                densa
                fase="E5"
                etiqueta={<>{t('Degradación vs NB4B', 'Degradation vs NB4B')}</>}
                valor={<>−24.2 %</>}
                nota={<>R² 0.7237 → 0.5484</>}
              />
              <MetricStat
                densa
                fase="E5"
                etiqueta={<>{t('Gap mínimo train-test', 'Min train-test gap')}</>}
                valor={<>{gapMinimo?.GAP?.toFixed(4) ?? 'N/A'}</>}
                nota={<>{gapMinimo?.Modelo}</>}
              />
              <MetricStat
                densa
                fase="E5"
                etiqueta={<>{t('Evaluaciones totales', 'Total evaluations')}</>}
                valor={<>{totalEvals}</>}
                nota={<>8 configs × 48 folds LOPO</>}
              />
              <MetricStat
                densa
                fase="E5"
                etiqueta={<>{t('Costo computacional', 'Computational cost')}</>}
                valor={<>≈ 56 h</>}
                nota={<>3 modelos × 48 folds</>}
              />
            </div>

              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)' }}>
                  {t('Interpretación de Resultados en el Contexto del Problema', 'Interpretation of Results in the Problem Context')}
                </h3>
                <div style={{
                  padding: '16px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--fs-sm)',
                  lineHeight: 1.7,
                  color: 'var(--text-sub)',
                  maxWidth: '92ch',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}>
                <p>{t('Los resultados del NB5B confirman que el paradigma LOPO constituye la prueba de generalización más exigente del proyecto. El R² = 0.5484 del Ensemble_FT, obtenido sin que el modelo haya visto jamás al paciente de prueba durante el entrenamiento, demuestra que existe un ', 'NB5B results confirm that the LOPO paradigm constitutes the most demanding generalization test of the project. The R² = 0.5484 of Ensemble_FT, obtained without the model ever seeing the test patient during training, demonstrates that there is a ')}<strong>{t('componente morfológico universal', 'universal morphological component')}</strong>{t(' en la señal ECG transferible entre sujetos.', ' in the ECG signal transferable between subjects.')}</p>
                <p>{t('La degradación de −24.2 % respecto al NB4B (pool intra-paciente) cuantifica el costo de generalización inter-sujeto, pero simultáneamente valida la viabilidad del despliegue clínico: un modelo pre-entrenado con una cohorte suficiente podría ofrecer predicciones útiles (R² > 0.50) sobre pacientes nuevos sin calibración, y con una breve calibración de 15 latidos alcanzar R² ≈ 0.55.', 'The degradation of −24.2% relative to NB4B (intra-patient pool) quantifies the cost of inter-subject generalization, but simultaneously validates the viability of clinical deployment: a pre-trained model with a sufficient cohort could offer useful predictions (R² > 0.50) on new patients without calibration, and with a brief calibration of 15 beats reach R² ≈ 0.55.')}</p>
                <p>{t('La ', 'The ')}<strong>{t('inversión de la jerarquía', 'hierarchy inversion')}</strong>{t(' respecto al NB4B es reveladora: mientras que GRU lideraba en el paradigma intra-paciente, CNN_GRU emerge como la mejor arquitectura individual en cross-patient. Las capas convolucionales extraen patrones locales (pendientes QRS, mesetas ST, morfología de onda T) con mayor invarianza inter-sujeto que las representaciones puramente recurrentes.', ' relative to NB4B is revealing: while GRU led in the intra-patient paradigm, CNN_GRU emerges as the best individual architecture in cross-patient. Convolutional layers extract local patterns (QRS slopes, ST plateaus, T-wave morphology) with greater inter-subject invariance than purely recurrent representations.')}</p>
                <p>{t('El colapso de BiGRU_MHA (R² = 0.4386, gap = 0.44) constituye la contribución empírica más importante: la mayor expresividad de un modelo bidireccional con atención multi-cabeza ', 'The collapse of BiGRU_MHA (R² = 0.4386, gap = 0.44) constitutes the most important empirical contribution: the greater expressiveness of a bidirectional model with multi-head attention ')}<strong>{t('no garantiza', 'does not guarantee')}</strong>{t(' mejor generalización cross-patient. Al contrario, la capacidad adicional permitió codificar patrones poblacionales específicos que no se transfirieron a morfologías atípicas, un fenómeno de ', ' better cross-patient generalization. On the contrary, the additional capacity allowed encoding specific population patterns that did not transfer to atypical morphologies, a phenomenon of ')}<em>{t('sobreajuste de segundo orden', 'second-order overfitting')}</em>.</p>
                <p>{t('La variabilidad inter-paciente (σ ≈ 0.27–0.34) constituye el desafío central: pacientes de la serie 100 (ritmo sinusal) alcanzan R² > 0.70 consistentemente, mientras que la serie 200 (arritmias complejas) produce R² < 0.10 o negativo. Los pacientes 200 y 203 mostraron R² negativo en las ', 'Inter-patient variability (σ ≈ 0.27–0.34) constitutes the central challenge: patients from the 100 series (sinus rhythm) consistently reach R² > 0.70, while the 200 series (complex arrhythmias) produces R² < 0.10 or negative. Patients 200 and 203 showed negative R² in all ')}<strong>{t('ocho configuraciones', 'eight configurations')}</strong>{t(', lo que sugiere que un sistema clínico debería incorporar un detector de confianza para derivar pacientes atípicos a calibración extendida.', ', suggesting that a clinical system should incorporate a confidence detector to refer atypical patients to extended calibration.')}</p>
                </div>
              </div>
          </div>
        )}

        {activeSubTab === 'expA' && (
          <div>
            {/* Tabla Resumen Global */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Resumen Global · 8 Configuraciones LOPO', 'Global Summary · 8 LOPO Configurations')}</h3>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', marginBottom: '12px' }}>
                {t('Métricas R² de 48 folds LOPO. FT = Fine-tuning con 15 muestras del paciente objetivo.', 'R² metrics from 48 LOPO folds. FT = Fine-tuning with 15 samples from the target patient.')}
              </p>
              <DataTable
                data={comprehensiveRows as unknown as Record<string, unknown>[]}
                title=""
                columns={[
                  { key: 'Modelo', label: 'Modelo' },
                  { key: 'R² media', label: 'R² media' },
                  { key: 'R² σ', label: 'R² σ' },
                  { key: 'IC95 inf', label: 'IC95 inf' },
                  { key: 'IC95 sup', label: 'IC95 sup' },
                  { key: 'MSE', label: 'MSE' },
                  { key: 'RMSE', label: 'RMSE' },
                  { key: 'MAE', label: 'MAE' },
                  { key: 'DTW', label: 'DTW' },
                ]}
              />
            </div>

            {/* Boxplots R² por modelo */}
            {boxTraces.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Distribución R² por Paciente · Boxplots (8 configuraciones)', 'R² Distribution per Patient · Boxplots (8 configurations)')}</h3>
                <PlotlyChart
                  data={boxTraces.map(t => ({
                    type: 'box',
                    y: t.vals,
                    name: t.model,
                    marker: { color: t.color },
                    boxmean: true,
                  }))}
                  layout={{
                    yaxis: { title: { text: t('R² por paciente (48 folds)', 'R² per patient (48 folds)') } },
                    height: 420,
                    showlegend: false,
                    shapes: [{ type: 'line', x0: -0.5, x1: boxTraces.length - 0.5, y0: 0, y1: 0, line: { dash: 'dash', color: 'red', width: 1 } }],
                    font: { color: 'var(--text)' },
                    margin: { t: 20, b: 40, l: 50, r: 20 },
                  }}
                  style={{ width: '100%', height: 420 }}
                />
              </div>
            )}

            {/* R² Promedio por Paciente */}
            {r2ByPatientSorted.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('R² Promedio por Paciente · 48 Pacientes LOPO (promedio 8 modelos)', 'Average R² per Patient · 48 LOPO Patients (8-model average)')}</h3>
                <PlotlyChart
                  data={[{
                    type: 'bar',
                    x: r2ByPatientSorted.map((p: any) => 'P' + p.paciente),
                    y: r2ByPatientSorted.map((p: any) => p.r2),
                    text: r2ByPatientSorted.map(p => p.r2.toFixed(2)),
                    textposition: 'outside',
                    textfont: { size: 8, color: 'var(--text-muted)' },
                    marker: { color: r2ByPatientSorted.map((p: any) => p.color) },
                    hovertemplate: t('Paciente %{x}<br>R² medio = <b>%{y:.4f}</b><extra></extra>', 'Patient %{x}<br>Average R² = <b>%{y:.4f}</b><extra></extra>'),
                    cliponaxis: false,
                  }]}
                  layout={{
                    height: 400,
                    xaxis: { type: 'category', title: { text: t('Paciente (ID MIT-BIH)', 'Patient (MIT-BIH ID)'), font: { size: 11, color: 'var(--text-muted)' } }, tickangle: -60, tickfont: { size: 8, color: 'var(--text-muted)' }, categoryorder: 'array', categoryarray: r2ByPatientSorted.map((p: any) => 'P' + p.paciente) },
                    yaxis: { title: { text: t('R² medio', 'Average R²'), font: { size: 11, color: 'var(--text-muted)' } }, range: [-0.4, 1.08], tickfont: { size: 10, color: 'var(--text-muted)' } },
                    shapes: [
                      { type: 'line', x0: -0.5, x1: r2ByPatientSorted.length - 0.5, y0: 0.5, y1: 0.5, line: { dash: 'dash', color: 'rgba(59,130,246,0.5)', width: 1 } },
                      { type: 'line', x0: -0.5, x1: r2ByPatientSorted.length - 0.5, y0: 0, y1: 0, line: { dash: 'dot', color: 'rgba(239,68,68,0.5)', width: 1 } },
                    ],
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'var(--surface)',
                    font: { color: 'var(--text)' },
                    margin: { t: 24, b: 75, l: 50, r: 14 },
                    showlegend: false,
                    bargap: 0.15,
                  }}
                  style={{ width: '100%', height: 400 }}
                />
              </div>
            )}

            {/* Scatter: Tamaño de Muestra vs R² */}
            {scatterSizeR2.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Tamaño de Muestra vs R² · ¿Importa la cantidad de datos de prueba?', 'Sample Size vs R² · Does the amount of test data matter?')}</h3>
                <PlotlyChart
                  data={scatterSizeR2.map(t => ({
                    type: 'scatter' as const,
                    mode: 'markers' as const,
                    x: t.x,
                    y: t.y,
                    name: t.model,
                    text: t.patients.map((p, i) => `Pac ${p} · n=${t.x[i]} · R²=${t.y[i].toFixed(3)}`),
                    hovertemplate: '%{text}<extra>%{fullData.name}</extra>',
                    marker: { color: t.color, size: 7, opacity: 0.7 },
                  }))}
                  layout={{
                    height: 380,
                    xaxis: { title: { text: t('n_test (muestras de prueba)', 'n_test (test samples)'), font: { size: 11, color: 'var(--text-muted)' } }, tickfont: { size: 10, color: 'var(--text-muted)' } },
                    yaxis: { title: { text: 'R²', font: { size: 11, color: 'var(--text-muted)' } }, range: [-0.5, 1.05], tickfont: { size: 10, color: 'var(--text-muted)' } },
                    shapes: [{ type: 'line', x0: 0, x1: 1, xref: 'paper', y0: 0, y1: 0, line: { dash: 'dot', color: 'rgba(239,68,68,0.4)', width: 1 } }],
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'var(--surface)',
                    font: { color: 'var(--text)' },
                    margin: { t: 14, b: 50, l: 50, r: 14 },
                    legend: { orientation: 'h', y: 1.12, font: { size: 11 } },
                  }}
                  style={{ width: '100%', height: 380 }}
                />
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'expB' && (
          <div>
            {/* Efecto Fine-Tuning */}
            {ftEffect.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Efecto del Fine-Tuning (15 muestras)', 'Fine-Tuning Effect (15 samples)')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  <DataTable
                    data={ftEffect.map((r: any) => ({
                      'Modelo base': r.modeloBase,
                      'R² base': r.r2Base.toFixed(4),
                      'R² FT': r.r2FT.toFixed(4),
                      'ΔR²': (r.deltaR2 >= 0 ? '+' : '') + r.deltaR2.toFixed(4),
                      'Mejora %': (r.mejoraPct >= 0 ? '+' : '') + r.mejoraPct.toFixed(2) + '%',
                    })) as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Modelo base', label: t('Modelo base', 'Base Model') },
                      { key: 'R² base', label: 'R² base' },
                      { key: 'R² FT', label: 'R² FT' },
                      { key: 'ΔR²', label: 'ΔR²' },
                      { key: 'Mejora %', label: t('Mejora %', 'Improvement %') },
                    ]}
                  />
                  <PlotlyGroupedBarChart
                    data={ftEffect.map((r: any) => ({
                      name: r.modeloBase,
                      'Base': r.r2Base,
                      'Fine-Tuned': r.r2FT,
                    }))}
                    categories={['Base', 'Fine-Tuned']}
                    colors={['#60a5fa', '#d97706']}
                    yAxisLabel="R²"
                    height={300}
                  />
                </div>
              </div>
            )}

            {/* Radar: Rendimiento Multi-Métrica */}
            {radarData.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Perfil Multi-Métrica por Modelo · Radar Normalizado', 'Multi-Metric Profile per Model · Normalized Radar')}</h3>
                <PlotlyChart
                  data={radarData.map(rd => ({
                    type: 'scatterpolar' as const,
                    r: [...rd.values, rd.values[0]],
                    theta: [...rd.labels, rd.labels[0]],
                    fill: 'toself' as const,
                    fillcolor: rd.color + '18',
                    line: { color: rd.color, width: 2 },
                    name: rd.model,
                    hovertemplate: `${rd.model}<br>%{theta}: <b>%{r:.1f}%</b><extra></extra>`,
                  }))}
                  layout={{
                    height: 420,
                    polar: {
                      radialaxis: {
                        visible: true,
                        range: [0, 105],
                        ticksuffix: '%',
                        tickfont: { size: 9, color: 'var(--text-muted)' },
                        gridcolor: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)',
                      },
                      angularaxis: {
                        tickfont: { size: 11, color: 'var(--text-sub)' },
                        gridcolor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)',
                      },
                      bgcolor: 'transparent',
                    },
                    paper_bgcolor: 'transparent',
                    font: { color: 'var(--text)' },
                    margin: { t: 40, b: 40, l: 60, r: 60 },
                    legend: { orientation: 'h', y: -0.08, font: { size: 10 }, xanchor: 'center', x: 0.5 },
                    showlegend: true,
                  }}
                  style={{ width: '100%', height: 420 }}
                />
              </div>
            )}

            {/* Validación Externa — Base de Datos INCART */}
            {incartStats && incartRows.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderBottom: 'none',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  padding: '18px 22px 14px',
                  color: 'var(--text)',
                }}>
                  <h3 style={{ margin: '0 0 4px 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600 }}>
                    {t('Validación Externa · Base de Datos INCART St.-Petersburg', 'External Validation · INCART St.-Petersburg Database')}
                  </h3>
                  <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>
                    {t('Prueba de robustez en dataset completamente externo', 'Robustness test on completely external dataset')}, {incartStats.n} {t('registros · Equipment distinto · Pacientes europeos', 'records · Different equipment · European patients')}
                  </p>
                </div>

                <div className="card" style={{ borderRadius: '0 0 12px 12px', padding: '20px', borderTop: 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                    <MetricStat
                      densa
                      fase="E5"
                      etiqueta={<>{t('R² Medio INCART', 'Mean R² INCART')}</>}
                      valor={<>{incartStats.mean.toFixed(4)}</>}
                      nota={<>σ = {incartStats.std.toFixed(4)}</>}
                    />
                    <MetricStat
                      densa
                      fase="E5"
                      etiqueta={<>{t('Registros R² ≥ 0.5', 'Records R² ≥ 0.5')}</>}
                      valor={<>{incartStats.pctAbove05.toFixed(1)}%</>}
                      nota={<>{incartRows.filter(r => r.R2 >= 0.5).length} {t('de', 'of')} {incartStats.n} {t('registros', 'records')}</>}
                    />
                    <MetricStat
                      densa
                      fase="E5"
                      etiqueta={<>{t('Mejor Registro', 'Best Record')}</>}
                      valor={<>{incartStats.best.registro}</>}
                      nota={<>R² = {incartStats.best.R2.toFixed(4)}</>}
                    />
                    <MetricStat
                      densa
                      fase="E5"
                      etiqueta={<>{t('Peor Registro', 'Worst Record')}</>}
                      valor={<>{incartStats.worst.registro}</>}
                      nota={<>R² = {incartStats.worst.R2.toFixed(4)}</>}
                    />
                    <MetricStat
                      densa
                      fase="E5"
                      etiqueta={<>Δ vs MIT-BIH LOPO</>}
                      valor={<>{bestModel ? (incartStats.mean >= bestModel.Media ? '+' : '') + (incartStats.mean - bestModel.Media).toFixed(4) : '—'}</>}
                      nota={<>MIT-BIH: {bestModel?.Media?.toFixed(4) ?? '—'}</>}
                    />
                  </div>

                  {/* Gráfico de barras R² por registro INCART */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>{t('R² por Registro INCART (75 registros · orden de registro)', 'R² per INCART Record (75 records · record order)')}</h4>
                    <PlotlyChart
                      data={[{
                        type: 'bar',
                        x: incartRows.map(r => r.registro),
                        y: incartRows.map((r: any) => r.R2),
                        marker: {
                          color: incartRows.map(r =>
                            r.R2 >= 0.7 ? '#10b981' : r.R2 >= 0.5 ? '#3b82f6' : r.R2 >= 0.2 ? '#f59e0b' : '#ef4444'
                          ),
                        },
                        name: 'R² INCART',
                      }, {
                        type: 'scatter',
                        mode: 'lines',
                        x: incartRows.map(r => r.registro),
                        y: Array(incartRows.length).fill(incartStats.mean),
                        line: { dash: 'dash', color: '#10b981', width: 1.5 },
                        name: `Media ${incartStats.mean.toFixed(3)}`,
                      }]}
                      layout={{
                        height: 320,
                        xaxis: { tickangle: -60, tickfont: { size: 9 } },
                        yaxis: { title: { text: 'R²' }, range: [-0.1, 1.05] },
                        shapes: [{ type: 'line', x0: 0, x1: incartRows.length - 1, y0: 0.5, y1: 0.5, line: { dash: 'dot', color: 'rgba(148,163,184,0.6)', width: 1 } }],
                        font: { color: 'var(--text)' },
                        margin: { t: 16, b: 80, l: 50, r: 20 },
                        legend: { orientation: 'h', y: 1.1 },
                        showlegend: true,
                      }}
                      style={{ width: '100%', height: 320 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>{t('Distribución R² INCART (histograma)', 'R² Distribution INCART (histogram)')}</h4>
                      <PlotlyChart
                        data={[{
                          type: 'histogram',
                          x: incartRows.map((r: any) => r.R2),
                          nbinsx: 15,
                          marker: { color: '#10b981', opacity: 0.7 },
                          name: 'INCART',
                        }]}
                        layout={{
                          height: 240,
                          xaxis: { title: { text: 'R²' }, range: [-0.1, 1.05] },
                          yaxis: { title: { text: t('Frecuencia', 'Frequency') } },
                          font: { color: 'var(--text)' },
                          margin: { t: 12, b: 40, l: 45, r: 16 },
                          showlegend: false,
                          shapes: [{ type: 'line', x0: incartStats.mean, x1: incartStats.mean, y0: 0, y1: 1, yref: 'paper', line: { dash: 'dash', color: '#10b981', width: 2 } }],
                        }}
                        style={{ width: '100%', height: 240 }}
                      />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>{t('MIT-BIH vs INCART · Métricas Clave', 'MIT-BIH vs INCART · Key Metrics')}</h4>
                      <PlotlyGroupedBarChart
                        data={[
                          { name: 'R²', 'MIT-BIH (LOPO)': bestModel?.Media ?? 0, 'INCART (ext.)': incartStats.mean },
                          { name: 'RMSE', 'MIT-BIH (LOPO)': comprehensiveTable[bestModel?.Modelo ?? '']?.['RMSE'] ?? 0, 'INCART (ext.)': incartRows.reduce((s, r) => s + r.RMSE, 0) / incartRows.length },
                          { name: 'MAE', 'MIT-BIH (LOPO)': comprehensiveTable[bestModel?.Modelo ?? '']?.['MAE'] ?? 0, 'INCART (ext.)': incartRows.reduce((s, r) => s + r.MAE, 0) / incartRows.length },
                        ]}
                        categories={['MIT-BIH (LOPO)', 'INCART (ext.)']}
                        colors={['#3b82f6', '#10b981']}
                        yAxisLabel="Valor"
                        height={240}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'estadisticas' && (
          <div>
            {/* Gap Train–Test */}
            {gapData.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Brecha Train-Test · Gap de Generalización LOPO', 'Train-Test Gap · LOPO Generalization Gap')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <DataTable
                    data={gapData.map((g: any) => ({
                      Modelo: g.Modelo,
                      'R² train': g.R2_train.toFixed(4),
                      'R² test': g.R2_test.toFixed(4),
                      GAP: g.GAP.toFixed(4),
                      Nivel: g.GAP < 0.35 ? t('Moderado', 'Moderate') : g.GAP < 0.45 ? t('Alto', 'High') : t('Severo', 'Severe'),
                    })) as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[
                      { key: 'Modelo', label: 'Modelo' },
                      { key: 'R² train', label: 'R² train' },
                      { key: 'R² test', label: 'R² test' },
                      { key: 'GAP', label: 'GAP' },
                      { key: 'Nivel', label: t('Nivel', 'Level') },
                    ]}
                  />
                  <PlotlyBarChart data={gapBarData} title="" horizontal referenceLine={0} />
                </div>
              </div>
            )}

            {/* Forest Plot IC 95% */}
            {ic95Data.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{t('Intervalos de Confianza 95 % · R² por Configuración', '95% Confidence Intervals · R² per Configuration')}</h3>
                <ForestPlot
                  data={ic95Data.map((row: any) => ({
                    modelo: row.Modelo,
                    media: row.Media,
                    icInf: row.IC95_inf,
                    icSup: row.IC95_sup,
                    color: NB5B_COLORS[row.Modelo] ?? '#888',
                  }))}
                  xAxisLabel="R²"
                  referenceLine={0.5}
                />
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'filtros_hallazgos' && (
          <div>
            {/* Top/Bottom Pacientes */}
            {pacientesOrdenados.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>{t('Top 5 Pacientes', 'Top 5 Patients')}</h3>
                  <DataTable
                    data={top5 as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[{ key: 'paciente', label: 'Paciente' }, { key: 'r2', label: 'R² medio' }]}
                  />
                </div>
                <div className="card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>{t('Top 5 Pacientes Complicados', 'Top 5 Difficult Patients')}</h3>
                  <DataTable
                    data={bottom5 as unknown as Record<string, unknown>[]}
                    title=""
                    columns={[{ key: 'paciente', label: 'Paciente' }, { key: 'r2', label: 'R² medio' }]}
                  />
                </div>
              </div>
            )}

            {/* Key Findings */}
            <FindingsSection title={t('Hallazgos Principales', 'Key Findings')}>
              <FindingCard number={1} title={t('R² = 0.5484 demuestra componente morfológico universal', 'R² = 0.5484 demonstrates universal morphological component')} description={t('El Ensemble_FT obtiene este R² sin que el modelo haya visto jamás al paciente de prueba, confirmando transferencia inter-sujeto.', 'Ensemble_FT obtains this R² without the model ever seeing the test patient, confirming inter-subject transfer.')} significance="high" />
              <FindingCard number={2} title={t('Degradación de −24.2% vs NB4B cuantifica el costo de generalización', 'Degradation of −24.2% vs NB4B quantifies the generalization cost')} description={t('El paso de pool intra-paciente a LOPO inter-paciente reduce el R², pero mantiene utilidad clínica (R² > 0.50).', 'The shift from intra-patient pool to inter-patient LOPO reduces R², but maintains clinical utility (R² > 0.50).')} significance="high" />
              <FindingCard number={3} title={t('Inversión de jerarquía: CNN_GRU supera a GRU en cross-patient', 'Hierarchy inversion: CNN_GRU surpasses GRU in cross-patient')} description={t('Las capas convolucionales extraen patrones locales con mayor invarianza inter-sujeto que las representaciones puramente recurrentes.', 'Convolutional layers extract local patterns with greater inter-subject invariance than purely recurrent representations.')} significance="medium" />
              <FindingCard number={4} title={t('Colapso de BiGRU_MHA: sobreajuste de segundo orden', 'BiGRU_MHA collapse: second-order overfitting')} description={t('R² = 0.4386, gap = 0.44. La mayor expresividad del modelo bidireccional con atención codificó patrones poblacionales específicos que no se transfirieron.', 'R² = 0.4386, gap = 0.44. The greater expressiveness of the bidirectional attention model encoded specific population patterns that did not transfer.')} significance="medium" />
              <FindingCard number={5} title={t('Variabilidad inter-paciente (σ ≈ 0.27–0.34) es el desafío central', 'Inter-patient variability (σ ≈ 0.27–0.34) is the central challenge')} description={t('Pacientes de la serie 100 (ritmo sinusal) alcanzan R² > 0.70; la serie 200 (arritmias complejas) produce R² < 0.10.', 'Patients from the 100 series (sinus rhythm) reach R² > 0.70; the 200 series (complex arrhythmias) produces R² < 0.10.')} significance="high" />
              <FindingCard number={6} title={t('Fine-tuning con 15 muestras mejora el rendimiento', 'Fine-tuning with 15 samples improves performance')} description={t('La calibración breve del paciente objetivo permite alcanzar R² ≈ 0.55. Patrón asimétrico: BiGRU_MHA es la más beneficiada (+4.15 %).', 'Brief target patient calibration allows reaching R² ≈ 0.55. Asymmetric pattern: BiGRU_MHA benefits the most (+4.15%).')} significance="medium" />
              <FindingCard number={7} title={t('Pacientes 200 y 203: R² negativo en todas las configuraciones', 'Patients 200 and 203: negative R² in all configurations')} description={t('Sugiere que un system clínico debería incorporar un detector de confianza para derivar pacientes atípicos a calibración extendida.', 'Suggests that a clinical system should incorporate a confidence detector to refer atypical patients to extended calibration.')} significance="medium" />
            </FindingsSection>

            {/* Galería */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>{t('Galería de Visualizaciones · NB5B', 'Visualizations Gallery · NB5B')}</h3>
              <ImageGallery
                images={[
                  { src: '/data/nb5b/img/lopo_v2_boxplot_all.png', title: t('Boxplot R² · Todos los Modelos LOPO', 'Boxplot R² · All LOPO Models') },
                  { src: '/data/nb5b/img/lopo_v2_GRU_base_r2.png', title: t('R² por Paciente · GRU Base', 'R² per Patient · GRU Base') },
                  { src: '/data/nb5b/img/lopo_v2_CNN_GRU_r2.png', title: t('R² por Paciente · CNN-GRU', 'R² per Patient · CNN-GRU') },
                  { src: '/data/nb5b/img/lopo_v2_BiGRU_MHA_r2.png', title: t('R² por Paciente · BiGRU MHA', 'R² per Patient · BiGRU MHA') },
                  { src: '/data/nb5b/img/demo_v2_GRU_base.png', title: t('Demo Predicción · GRU Base', 'Prediction Demo · GRU Base') },
                  { src: '/data/nb5b/img/demo_v2_CNN_GRU.png', title: t('Demo Predicción · CNN-GRU', 'Prediction Demo · CNN-GRU') },
                  { src: '/data/nb5b/img/demo_v2_BiGRU_MHA.png', title: t('Demo Predicción · BiGRU MHA', 'Prediction Demo · BiGRU MHA') },
                  { src: '/data/nb5b/img/lopo_v2_mejora_ft_CNN_GRU.png', title: t('Mejora Fine-Tuning · CNN-GRU', 'Fine-Tuning Improvement · CNN-GRU') },
                  { src: '/data/nb5b/img/lopo_v2_mejora_ft_BiGRU_MHA.png', title: t('Mejora Fine-Tuning · BiGRU MHA', 'Fine-Tuning Improvement · BiGRU MHA') },
                ]}
                columns={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface NB3ContentProps {
  expA: ReturnType<typeof useNB3Results>['expA'];
  expBResumen: ReturnType<typeof useNB3Results>['expBResumen'];
  expBTransferencia: ReturnType<typeof useNB3Results>['expBTransferencia'];
  expC: ReturnType<typeof useNB3Results>['expC'];
  loading: boolean;
  error: string | null;
}

function NB3Content({ expA, expBResumen, expBTransferencia, expC, loading, error }: NB3ContentProps) {
  const theme = useECGStore((s) => s.theme);
  const { t } = useLang();
  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'expA' | 'expB' | 'estadisticas' | 'filtros_hallazgos'>('resumen');

  // ── Métricas calculadas ─────────────────────────────────────────────────
  const expAStats = useMemo(() => {
    if (!expA.length) return null;
    const modelos = [...new Set(expA.map((r: any) => r.Modelo))];
    const pacientes = [...new Set(expA.map((r: any) => Number(r.Paciente)))];
    const byModelo = modelos.map(m => {
      const rows = expA.filter((r: any) => r.Modelo === m);
      const r2Values = rows.map((r: any) => Number(r.R2));
      const mean = r2Values.reduce((a: any, b: any) => a + b, 0) / r2Values.length;
      const rmseValues = rows.map((r: any) => Number(r.RMSE));
      const maeValues = rows.map((r: any) => Number(r.MAE));
      return {
        Modelo: m,
        R2_mean: mean,
        R2_values: r2Values,
        RMSE_mean: rmseValues.reduce((a: any, b: any) => a + b, 0) / rmseValues.length,
        MAE_mean: maeValues.reduce((a: any, b: any) => a + b, 0) / maeValues.length,
      };
    });
    const best = byModelo.reduce((a: any, b: any) => a.R2_mean > b.R2_mean ? a : b);
    return { modelos, pacientes, byModelo, best, totalRows: expA.length };
  }, [expA]);

  const expBStats = useMemo(() => {
    if (!expBResumen.length) return null;
    const avgCaida = expBResumen.reduce((s: any, r: any) => s + Number(r.Caida_NB2), 0) / expBResumen.length;
    const avgNB4B = expBResumen.reduce((s: any, r: any) => s + Number(r.NB4B), 0) / expBResumen.length;
    const avgNB5B = expBResumen.reduce((s: any, r: any) => s + Number(r.NB5B), 0) / expBResumen.length;
    return { avgCaida, avgNB4B, avgNB5B, nPacientes: expBResumen.length };
  }, [expBResumen]);

  const expCStats = useMemo(() => {
    if (!expC.length) return null;
    const modelos = [...new Set(expC.map((r: any) => r.Modelo))];
    const pacientes = [...new Set(expC.map((r: any) => Number(r.Paciente)))];
    const byModelo = modelos.map(m => {
      const rows = expC.filter((r: any) => r.Modelo === m);
      const r2Vals = rows.map((r: any) => Number(r.R2));
      const mean = r2Vals.reduce((a: any, b: any) => a + b, 0) / r2Vals.length;
      return { Modelo: m, R2_mean: mean, R2_values: r2Vals };
    });
    const best = byModelo.reduce((a: any, b: any) => a.R2_mean > b.R2_mean ? a : b);
    return { modelos, pacientes, byModelo, best, totalRows: expC.length };
  }, [expC]);

  // ── Loading/Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>{t('Cargando datos de NB3...', 'Loading NB3 data...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alert)' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-sm)' }}>{t('Error:', 'Error:')} {error}</div>
      </div>
    );
  }

  const NB3_MODEL_COLORS: Record<string, string> = {
    NB1: '#f59e0b',
    NB2: '#3b82f6',
    NB4B: '#10b981',
    NB5B: '#8b5cf6',
    Persistencia: '#94a3b8',
  };

  const subTabs = [
    { id: 'resumen' as const, label: t('Resumen', 'Summary'), icon: <TrendingUp size={14} /> },
    { id: 'expA' as const, label: t('Exp A: Estándar', 'Exp A: Standard'), icon: <Activity size={14} /> },
    { id: 'expB' as const, label: t('Exp B: Transferencia', 'Exp B: Transfer'), icon: <Zap size={14} /> },
    { id: 'estadisticas' as const, label: t('Estadísticas (Exp C)', 'Statistics (Exp C)'), icon: <BarChart3 size={14} /> },
    { id: 'filtros_hallazgos' as const, label: t('Filtros / Hallazgos', 'Filters / Findings'), icon: <Filter size={14} /> },
  ];

  return (
    <div>
      {/* Above the Fold Summary Panel */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: '24px',
        marginBottom: '24px',
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {/* Left: Metadata */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ letterSpacing: '2px', fontSize: 'var(--fs-xs)' }}>Experimento 3 · NB3</span>
              <span style={{ fontSize: 'var(--fs-xs)', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-data)', color: 'var(--signal)' }}>03_evaluation.ipynb</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>
              {t('Evaluación Comparativa de Modelos', 'Comparative Model Evaluation')}
            </h2>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', margin: 0 }}>
              {t('Evaluación comparativa: Estándar (Exp A), Transferencia (Exp B), y Escenario Clínico (Exp C)', 'Comparative evaluation: Standard (Exp A), Transfer (Exp B), and Clinical Scenario (Exp C)')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            <span><strong>Dataset:</strong> MIT-BIH Arrhythmia Database · 48 pacientes · 360 Hz · MLII</span>
            <span><strong>Evaluación:</strong> Cross-patient & Intra-patient</span>
          </div>
        </div>

        {/* Right: Key KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: '10px', flex: '1 1 320px', alignContent: 'center' }}>
          <MetricStat
            densa
            fase="E3"
            etiqueta={<>{t('Mejor R² Exp A', 'Best R² Exp A')}</>}
            valor={<>{expAStats?.best.R2_mean.toFixed(4) ?? '—'}</>}
            nota={<>{expAStats?.best.Modelo}</>}
          />
          <MetricStat
            densa
            fase="E3"
            etiqueta={<>{t('Caída R² Exp B', 'R² Drop Exp B')}</>}
            valor={<>{expBStats?.avgCaida.toFixed(4) ?? '—'}</>}
            nota={<>{t('NB2 Transfer', 'NB2 Transfer')}</>}
          />
          <MetricStat
            densa
            fase="E3"
            etiqueta={<>{t('Mejor R² Exp C', 'Best R² Exp C')}</>}
            valor={<>{expCStats?.best.R2_mean.toFixed(4) ?? '—'}</>}
            nota={<>{expCStats?.best.Modelo}</>}
          />
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        width: 'fit-content',
        flexWrap: 'wrap',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        {subTabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeSubTab === id ? 'var(--accent-bg, rgba(6, 182, 212, 0.15))' : 'transparent',
              color: activeSubTab === id ? 'var(--signal, #06b6d4)' : 'var(--text-sub)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-xs)',
              fontWeight: activeSubTab === id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeSubTab === 'resumen' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))', gap: '10px', marginBottom: '24px' }}>
              <MetricStat
                densa
                fase="E3"
                etiqueta={<>{t('Mejor Modelo · Exp A', 'Best Model · Exp A')}</>}
                valor={<>{expAStats?.best.Modelo ?? '—'}</>}
                nota={<>{t('R² medio:', 'Average R²:')} {expAStats?.best.R2_mean.toFixed(4) ?? '—'}</>}
              />
              <MetricStat
                densa
                fase="E3"
                etiqueta={<>{t('Caída NB2 (propio→ajeno)', 'NB2 Drop (own→other)')}</>}
                valor={<>{expBStats ? expBStats.avgCaida.toFixed(4) : '—'}</>}
                nota={<>{t('Promedio de', 'Average of')} {expBStats?.nPacientes ?? 0} {t('pacientes', 'patients')}</>}
              />
              <MetricStat
                densa
                fase="E3"
                etiqueta={<>{t('Mejor Modelo · Exp C', 'Best Model · Exp C')}</>}
                valor={<>{expCStats?.best.Modelo ?? '—'}</>}
                nota={<>{t('R² medio:', 'Average R²:')} {expCStats?.best.R2_mean.toFixed(4) ?? '—'} · {expCStats?.pacientes.length ?? 0} {t('pacientes', 'patients')}</>}
              />
              <MetricStat
                densa
                fase="E3"
                etiqueta={<>{t('NB5B promedio · Exp C', 'NB5B average · Exp C')}</>}
                valor={<>{expCStats?.byModelo.find(m => m.Modelo === 'NB5B')?.R2_mean.toFixed(4) ?? '—'}</>}
                nota={<>{t('Modelo multi-sujeto cross-patient', 'Multi-subject cross-patient model')}</>}
              />
            </div>
          </div>
        )}

        {activeSubTab === 'expA' && expAStats && (
          <div>
            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
              {t('Exp A · Evaluación Estándar por Paciente', 'Exp A · Standard Evaluation per Patient')}
            </h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '20px' }}>
              {t(`Cada modelo se evalúa con datos del mismo paciente (train/test temporal). Se comparan ${expAStats.modelos.length} modelos sobre ${expAStats.pacientes.length} pacientes.`, `Each model is evaluated with data from the same patient (temporal train/test). ${expAStats.modelos.length} models are compared across ${expAStats.pacientes.length} patients.`)}
            </p>

            {/* Bar chart: R² medio por modelo */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{t('R² Medio por Modelo', 'Average R² per Model')}</h4>
              <PlotlyBarChart
                data={expAStats.byModelo.map((m: any) => ({
                  name: m.Modelo,
                  value: m.R2_mean,
                  color: NB3_MODEL_COLORS[m.Modelo] || '#6b7280',
                }))}
                horizontal
                xAxisLabel={t('R² medio', 'Average R²')}
                height={300}
              />
            </div>

            {/* Box plot: distribución R² por modelo */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{t('Distribución R² por Modelo', 'R² Distribution per Model')}</h4>
              <BoxPlot
                data={expAStats.byModelo.map((m: any) => ({
                  name: m.Modelo,
                  values: m.R2_values,
                }))}
                yAxisLabel="R²"
                height={380}
                showMean
              />
            </div>

            {/* Grouped bar: R² por paciente y modelo */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{t('R² por Paciente y Modelo', 'R² per Patient and Model')}</h4>
              <PlotlyGroupedBarChart
                data={expAStats.pacientes.map((p: any) => {
                  const row: { name: string; [key: string]: number | string } = { name: String(p) };
                  expAStats.modelos.forEach((m: any) => {
                    const found = expA.find(r => Number(r.Paciente) === p && r.Modelo === m);
                    row[m] = found ? Number(found.R2) : 0;
                  });
                  return row;
                })}
                categories={expAStats.modelos}
                yAxisLabel="R²"
                colors={expAStats.modelos.map(m => NB3_MODEL_COLORS[m] || '#6b7280')}
                height={420}
              />
            </div>

            {/* Tabla completa */}
            <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
              <DataTable
                data={expA as unknown as Record<string, unknown>[]}
                title={t('Detalle por Paciente y Modelo', 'Detail per Patient and Model')}
                columns={[
                  { key: 'Paciente', label: 'Paciente', sortable: true },
                  { key: 'Modelo', label: 'Modelo', sortable: true },
                  { key: 'R2', label: 'R²', sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'RMSE', label: 'RMSE', sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'MAE', label: 'MAE', sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'n_test', label: 'n_test', sortable: true },
                ]}
                maxHeight="500px"
              />
            </div>
          </div>
        )}

        {activeSubTab === 'expB' && expBStats && (
          <div>
            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
              {t('Exp B · Transferencia Cruzada de Modelos NB2', 'Exp B · Cross Transfer of NB2 Models')}
            </h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '20px' }}>
              {t('Se evalúa qué pasa cuando un modelo NB2 entrenado en un paciente se aplica a otro. Se compara con NB4B y NB5B que son modelos globales.', 'Evaluates what happens when an NB2 model trained on one patient is applied to another. Compared with NB4B and NB5B which are global models.')}
            </p>

            {/* Gráfico: NB2 propio vs ajeno vs globales */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{t('NB2 Propio vs Ajeno vs Modelos Globales', 'NB2 Own vs Other vs Global Models')}</h4>
              <PlotlyGroupedBarChart
                data={expBResumen.map((r: any) => ({
                  name: String(r.Paciente),
                  'NB2 propio': Number(r.NB2_propio),
                  'NB2 ajeno (media)': Number(r.NB2_ajeno_mean),
                  'NB4B': Number(r.NB4B),
                  'NB5B': Number(r.NB5B),
                }))}
                categories={['NB2 propio', 'NB2 ajeno (media)', 'NB4B', 'NB5B']}
                yAxisLabel="R²"
                colors={['#3b82f6', '#ef4444', '#10b981', '#8b5cf6']}
                height={420}
              />
            </div>

            {/* Gráfico: Caída NB2 por paciente */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{t('Caída R² al Transferir NB2 (propio − ajeno)', 'R² Drop when Transferring NB2 (own − other)')}</h4>
              <PlotlyBarChart
                data={expBResumen.map((r: any) => ({
                  name: String(r.Paciente),
                  value: Number(r.Caida_NB2),
                  color: Number(r.Caida_NB2) > 1 ? '#ef4444' : Number(r.Caida_NB2) > 0.5 ? '#f59e0b' : '#10b981',
                }))}
                xAxisLabel={t('Caída R²', 'R² Drop')}
                horizontal
                height={350}
              />
            </div>

            {/* Tabla resumen */}
            <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
              <DataTable
                data={expBResumen as unknown as Record<string, unknown>[]}
                title={t('Resumen de Transferencia Cruzada', 'Cross Transfer Summary')}
                columns={[
                  { key: 'Paciente', label: t('Paciente', 'Patient'), sortable: true },
                  { key: 'NB2_propio', label: t('NB2 Propio', 'NB2 Own'), sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'NB2_ajeno_mean', label: t('NB2 Ajeno (μ)', 'NB2 Other (μ)'), sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'NB2_ajeno_min', label: t('NB2 Ajeno Min', 'NB2 Other Min'), sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'NB2_ajeno_max', label: t('NB2 Ajeno Max', 'NB2 Other Max'), sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'NB4B', label: 'NB4B', sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'NB5B', label: 'NB5B', sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'Caida_NB2', label: t('Caída NB2', 'NB2 Drop'), sortable: true, render: (v) => Number(v).toFixed(4) },
                ]}
                maxHeight="450px"
              />
            </div>

            {/* Tabla detalle transferencia */}
            <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
              <DataTable
                data={expBTransferencia as unknown as Record<string, unknown>[]}
                title={t('Detalle de Transferencia Cruzada', 'Cross Transfer Detail')}
                columns={[
                  { key: 'Paciente', label: t('Paciente', 'Patient'), sortable: true },
                  { key: 'Escenario', label: t('Escenario', 'Scenario'), sortable: true },
                  { key: 'R2', label: 'R²', sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'n_test', label: 'n_test', sortable: true },
                ]}
                maxHeight="500px"
              />
            </div>
          </div>
        )}

        {activeSubTab === 'estadisticas' && expCStats && (
          <div>
            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
              {t('Exp C · Escenario Clínico (Pacientes Nuevos)', 'Exp C · Clinical Scenario (New Patients)')}
            </h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: '20px' }}>
              {t(`Evaluación sobre ${expCStats.pacientes.length} pacientes usando solo modelos que no requieren datos de entrenamiento individuales: NB4B, NB5B y Persistencia.`, `Evaluation on ${expCStats.pacientes.length} patients using only models that do not require individual training data: NB4B, NB5B and Persistence.`)}
            </p>

            {/* Bar chart: R² medio por modelo */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{t('R² Medio por Modelo · Escenario Clínico', 'Average R² per Model · Clinical Scenario')}</h4>
              <PlotlyBarChart
                data={expCStats.byModelo.map((m: any) => ({
                  name: m.Modelo,
                  value: m.R2_mean,
                  color: NB3_MODEL_COLORS[m.Modelo] || '#6b7280',
                }))}
                horizontal
                xAxisLabel={t('R² medio', 'Average R²')}
                height={250}
              />
            </div>

            {/* BoxPlot distribución */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{t('Distribución R² por Modelo', 'R² Distribution per Model')}</h4>
              <BoxPlot
                data={expCStats.byModelo.map((m: any) => ({
                  name: m.Modelo,
                  values: m.R2_values,
                }))}
                yAxisLabel="R²"
                height={380}
                showMean
              />
            </div>

            {/* Scatter: R² de NB5B vs NB4B por paciente */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{t('NB5B vs NB4B por Paciente', 'NB5B vs NB4B per Patient')}</h4>
              <PlotlyChart
                data={[
                  {
                    x: expCStats.pacientes.map((p: any) => {
                      const row = expC.find((r: any) => Number(r.Paciente) === p && r.Modelo === 'NB4B');
                      return row ? Number(row.R2) : 0;
                    }),
                    y: expCStats.pacientes.map((p: any) => {
                      const row = expC.find((r: any) => Number(r.Paciente) === p && r.Modelo === 'NB5B');
                      return row ? Number(row.R2) : 0;
                    }),
                    text: expCStats.pacientes.map((p: any) => `Pac ${p}`),
                    mode: 'markers+text',
                    type: 'scatter',
                    textposition: 'top center',
                    textfont: { size: 9, color: 'var(--text-muted)' },
                    marker: { size: 10, color: '#8b5cf6', opacity: 0.8 },
                    hovertemplate: '<b>%{text}</b><br>NB4B R²: %{x:.4f}<br>NB5B R²: %{y:.4f}<extra></extra>',
                  },
                  {
                    x: [-0.5, 1],
                    y: [-0.5, 1],
                    mode: 'lines',
                    type: 'scatter',
                    line: { dash: 'dot', color: 'var(--border)', width: 1 },
                    showlegend: false,
                    hoverinfo: 'skip',
                  },
                ]}
                layout={{
                  height: 420,
                  xaxis: { title: 'R² NB4B', zeroline: true, gridcolor: 'var(--border)' },
                  yaxis: { title: 'R² NB5B', zeroline: true, gridcolor: 'var(--border)' },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  font: { color: 'var(--text)', family: 'Inter, system-ui, sans-serif' },
                  margin: { l: 60, r: 20, t: 20, b: 50 },
                  showlegend: false,
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '420px' }}
              />
            </div>

            {/* Tabla completa */}
            <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
              <DataTable
                data={expC as unknown as Record<string, unknown>[]}
                title={t('Detalle Escenario Clínico', 'Clinical Scenario Detail')}
                columns={[
                  { key: 'Paciente', label: t('Paciente', 'Patient'), sortable: true },
                  { key: 'Modelo', label: t('Modelo', 'Model'), sortable: true },
                  { key: 'R2', label: 'R²', sortable: true, render: (v) => Number(v).toFixed(4) },
                  { key: 'Disponible', label: t('Disponible', 'Available') },
                  { key: 'n_test', label: 'n_test', sortable: true },
                ]}
                maxHeight="500px"
              />
            </div>
          </div>
        )}

        {activeSubTab === 'filtros_hallazgos' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <Callout type="warning" title={t('Hallazgo clave · Los modelos NB2 no transfieren', 'Key finding · NB2 models do not transfer')}>
                {t(`La caída media de R² al transferir un modelo NB2 a otro paciente es de ${expBStats?.avgCaida.toFixed(4) ?? '—'}. Los modelos intra-paciente no generalizan. NB4B (R² medio: ${expBStats?.avgNB4B.toFixed(4) ?? '—'}) y NB5B (R² medio: ${expBStats?.avgNB5B.toFixed(4) ?? '—'}) resisten mejor al ser modelos multi-sujeto.`, `The average R² drop when transferring an NB2 model to another patient is ${expBStats?.avgCaida.toFixed(4) ?? '—'}. Intra-patient models do not generalize. NB4B (average R²: ${expBStats?.avgNB4B.toFixed(4) ?? '—'}) and NB5B (average R²: ${expBStats?.avgNB5B.toFixed(4) ?? '—'}) perform better as multi-subject models.`)}
              </Callout>
              <Callout type="note" title={t('Nota · Evaluación intra-paciente', 'Note · Intra-patient evaluation')}>
                {t('En este experimento, cada modelo se entrena y evalúa sobre el mismo paciente con partición temporal estricta (80/20). NB1 y NB2 son modelos intra-paciente, mientras que NB4B y NB5B son modelos multi-sujeto evaluados sobre cada paciente.', 'In this experiment, each model is trained and evaluated on the same patient with strict temporal partitioning (80/20). NB1 and NB2 are intra-patient models, while NB4B and NB5B are multi-subject models evaluated on each patient.')}
              </Callout>
              <Callout type="note" title={t('Nota · Simulación de despliegue real', 'Note · Real deployment simulation')}>
                {t('El Exp C simula un despliegue clínico donde NO se dispone de datos previos del paciente. Solo modelos multi-sujeto (NB4B, NB5B) son aplicables. NB5B supera a NB4B y Persistencia en la mayoría de pacientes, demostrando la viabilidad del enfoque cross-patient.', 'Exp C simulates a clinical deployment where NO prior patient data is available. Only multi-subject models (NB4B, NB5B) are applicable. NB5B outperforms NB4B and Persistence in most patients, demonstrating the viability of the cross-patient approach.')}
              </Callout>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}