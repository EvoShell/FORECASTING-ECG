/**
 * Pagina Explorador de Resultados
 * Exploracion completa de datos crudos por experimento con tablas, graficas, KPIs y filtrado
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { DataTable } from '@/components/data/DataTable';
import { PlotlyBarChart } from '@/components/charts/PlotlyBarChart';
import { Heatmap } from '@/components/charts/Heatmap';
import { MetricStat, MetricGrid } from '@/components/metrics/MetricStat';
import { useNB1Results } from '@/hooks/useNB1Results';
import { useNB2Results } from '@/hooks/useNB2Results';
import { useNB3Results } from '@/hooks/useNB3Results';
import { useNB4BResults } from '@/hooks/useNB4BResults';
import { useNB5Results } from '@/hooks/useNB5Results';
import { useNB5BResults } from '@/hooks/useNB5BResults';
import { useNB7HPResults, FUENTES_NB7HP } from '@/hooks/useNB7HPResults';
import {
  useNB8Results,
  FUENTE_CLASES,
  FUENTE_CONTRASTE,
  FUENTE_RESUMEN_P4,
  FUENTE_DETECCION,
  FUENTE_SALVEDAD,
} from '@/hooks/useNB8Results';
import { useECGStore, loadAllExperimentsData } from '@/store/useECGStore';
import { MODEL_COLORS } from '@/types/ecg.types';
import { PlotlyChart } from '@/components/charts/PlotlyChart';
import { descargarCSV } from '@/lib/exportarCSV';
import { Boton } from '@/components/ui/Boton';
import { BarraFiltros, Selector, Busqueda, RecuentoFiltro } from '@/components/ui/Filtros';
import { useLang, type TFn } from '@/i18n';
import { ChevronDown, ChevronUp, Download, RotateCcw } from 'lucide-react';

type ExperimentKey = 'NB1' | 'NB2' | 'NB3' | 'NB4B' | 'NB5B' | 'NB6' | 'NB7' | 'NB8';

// El orden es el real de los experimentos, que no coincide con el alfabetico de
// los cuadernos: NB5B es el 5 y la carpeta `nb5` guarda el 6.
const EXP_TABS = (): { id: ExperimentKey; label: string; short: string }[] => [
  { id: 'NB1', label: 'Exp. 1', short: 'NB1' },
  { id: 'NB2', label: 'Exp. 2', short: 'NB2' },
  { id: 'NB3', label: 'Exp. 3', short: 'NB3' },
  { id: 'NB4B', label: 'Exp. 4', short: 'NB4B' },
  { id: 'NB5B', label: 'Exp. 5', short: 'NB5B' },
  { id: 'NB6', label: 'Exp. 6', short: 'NB6' },
  { id: 'NB7', label: 'Exp. 7', short: 'NB7' },
  { id: 'NB8', label: 'Exp. 8', short: 'NB8' },
];

const EXP_DESCRIPTIONS = (t: TFn): Record<ExperimentKey, { title: string; notebook: string; desc: string }> => ({
  NB1: {
    title: t('Modelos Tradicionales de ML', 'Traditional ML Models'),
    notebook: '01_tradicionales.ipynb',
    desc: t('7 modelos ML clasicos evaluados en 48 pacientes con 7 filtros', '7 classic ML models evaluated on 48 patients with 7 filters'),
  },
  NB2: {
    title: 'Deep Learning',
    notebook: '02_deep_learning.ipynb',
    desc: t('4 modelos DL (LSTM, GRU, CNN-LSTM, CNN-GRU) con 3 filtros', '4 DL models (LSTM, GRU, CNN-LSTM, CNN-GRU) with 3 filters'),
  },
  NB3: {
    title: t('Evaluacion Comparativa', 'Comparative Evaluation'),
    notebook: '03_evaluation.ipynb',
    desc: t('Comparacion cruzada de modelos NB1-NB5B con 3 experimentos', 'Cross comparison of NB1-NB5B models with 3 experiments'),
  },
  NB4B: {
    title: t('Modelo Multi-sujeto', 'Multi-subject Model'),
    notebook: '04_compuesta multi-sujeto.ipynb',
    desc: t('Modelo global entrenado con pool de 48 pacientes', 'Global model trained with 48-patient pool'),
  },
  NB5B: {
    title: 'Cross-patient LOPO',
    notebook: '05_cross_patient.ipynb',
    desc: t('8 modelos LOPO en 48 pacientes MIT-BIH con fine-tuning', '8 LOPO models on 48 MIT-BIH patients with fine-tuning'),
  },
  NB6: {
    title: t('Cross-patient Multi-step LOPO', 'Cross-patient Multi-step LOPO'),
    notebook: '06_Cross_patient_MultiStep.ipynb',
    desc: t('CNN-GRU-ATTN con 123 pacientes (MIT-BIH + INCART), horizonte H=3', 'CNN-GRU-ATTN with 123 patients (MIT-BIH + INCART), horizon H=3'),
  },
  NB7: {
    title: t('Busqueda de hiperparametros', 'Hyperparameter search'),
    notebook: '07_hiperparametros.ipynb',
    desc: t('20 configuraciones por arquitectura sobre 10 pliegues LOPO de la cohorte reducida de 50', '20 configurations per architecture over 10 LOPO folds of the reduced 50-patient cohort'),
  },
  NB8: {
    title: t('Deteccion de evento sobre el residuo', 'Event detection on the residual'),
    notebook: '08_deteccion_evento.ipynb',
    desc: t('Error por clase AAMI y deteccion de latido ectopico paciente a paciente', 'Per-AAMI-class error and per-patient ectopic beat detection'),
  },
});

const HEADER_BG = 'var(--glass-bg)';

export function ExploradorPage() {
  const { t } = useLang();
  const TABS = EXP_TABS();
  const DESCS = EXP_DESCRIPTIONS(t);
  const [activeExp, setActiveExp] = useState<ExperimentKey>('NB1');
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState<string>('Todos');
  const [filterFilter, setFilterFilter] = useState<string>('Todos');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ raw: true, charts: true, overfit: false, patient: false });

  const nb1 = useNB1Results();
  const nb2 = useNB2Results();
  const nb3 = useNB3Results();
  const nb4b = useNB4BResults();
  const nb5 = useNB5Results();
  const nb5b = useNB5BResults();
  const theme = useECGStore((s) => s.theme);
  const nb1Data = useECGStore((s) => s.nb1Data);
  const nb2Data = useECGStore((s) => s.nb2Data);
  const nb4bData = useECGStore((s) => s.nb4bData);
  const nb5Data = useECGStore((s) => s.nb5Data);
  const nb5bData = useECGStore((s) => s.nb5bData);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!nb1Data && !nb2Data && !nb4bData && !nb5Data && !nb5bData) {
      loadAllExperimentsData().catch(err => console.error('[Explorador] Error:', err));
    }
  }, []);

  // Igual que en Experimentos: `!nb1Data` dentro de la espera convertia cualquier
  // fallo de lectura en una pantalla de «Cargando…» permanente y muda. La espera
  // depende ahora solo de las peticiones en vuelo, y el error tiene su propio camino.
  const cargando = nb1.loading || nb2.loading || nb3.loading
    || nb4b.loading || nb5.loading || nb5b.loading;

  const fallo = nb1.error || nb2.error || nb3.error || nb4b.error || nb5.error || nb5b.error
    || (!cargando && !nb1Data
        ? t('No se han podido leer los datos de los experimentos.',
            'Experiment data could not be read.')
        : null);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleExportCSV = useCallback((data: Record<string, unknown>[], filename: string) => {
    // La version anterior no entrecomillaba ni ponia BOM: una coma dentro de un valor
    // partia la fila, y los rotulos con acentos salian ilegibles en Excel.
    descargarCSV(
      data,
      filename,
      `Exportado del panel ECG Forecasting el ${new Date().toISOString().slice(0, 10)}`,
    );
  }, []);

  if (fallo) {
    return (
      <PageWrapper>
        <div
          role="alert"
          style={{
            padding: '28px', background: 'var(--crit-tint)',
            border: '1px solid var(--crit)', borderRadius: 'var(--radius-md)',
            color: 'var(--text)',
          }}
        >
          <strong style={{ color: 'var(--crit)' }}>
            {t('No se han podido cargar los datos', 'Data could not be loaded')}
          </strong>
          <p style={{ marginTop: '8px', color: 'var(--text-sub)' }}>{fallo}</p>
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
        <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '16px' }}>{t('Cargando datos...', 'Loading data...')}</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div style={{ marginBottom: '24px' }}>
        <p className="eyebrow">{t('Analisis Exploratorio', 'Exploratory Analysis')}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: 0 }}>
          {t('Explorador de Resultados', 'Results Explorer')}
        </h1>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginTop: '8px' }}>
          {t('Exploracion completa de datos crudos por experimento', 'Full raw data exploration by experiment')}
        </p>
      </div>

      {/* Experiment Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '28px',
        background: 'var(--glass-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '6px',
        width: 'fit-content',
        flexWrap: 'wrap',
        backdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)',
      }}>
        {TABS.map(tab => (
          <Boton
            key={tab.id}
            onClick={() => { setActiveExp(tab.id); setSearchTerm(''); setModelFilter('Todos'); setFilterFilter('Todos'); }}
            variante="sutil"
            activo={activeExp === tab.id}
            role="tab"
            aria-selected={activeExp === tab.id}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {tab.label}
          </Boton>
        ))}
      </div>

      {/* Experiment Header */}
      <div style={{
        background: HEADER_BG,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        color: 'var(--text)',
        marginBottom: '28px',
        backdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow effect inside */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          background: 'var(--signal)',
          filter: 'blur(60px)',
          opacity: 0.15,
          pointerEvents: 'none',
        }}></div>
        <h2 style={{ color: 'var(--text)', margin: '0 0 6px 0', fontSize: 'var(--fs-lg)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          {DESCS[activeExp].title}
        </h2>
        <div style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-sm)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Notebook</span>
          <code style={{
            color: 'var(--prediction)',
            background: 'rgba(34, 211, 238, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(34, 211, 238, 0.2)',
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-xs)',
          }}>
            {DESCS[activeExp].notebook}
          </code>
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{DESCS[activeExp].desc}</div>
      </div>

      {/* Content per experiment */}
{activeExp === 'NB1' && <NB1Explorer nb1={nb1} isDark={isDark} t={t} searchTerm={searchTerm} setSearchTerm={setSearchTerm} modelFilter={modelFilter} setModelFilter={setModelFilter} filterFilter={filterFilter} setFilterFilter={setFilterFilter} expandedSections={expandedSections} toggleSection={toggleSection} handleExportCSV={handleExportCSV} />}
{activeExp === 'NB2' && <NB2Explorer nb2={nb2} isDark={isDark} t={t} searchTerm={searchTerm} setSearchTerm={setSearchTerm} modelFilter={modelFilter} setModelFilter={setModelFilter} filterFilter={filterFilter} setFilterFilter={setFilterFilter} expandedSections={expandedSections} toggleSection={toggleSection} handleExportCSV={handleExportCSV} />}
{activeExp === 'NB3' && <NB3Explorer nb3={nb3} t={t} expandedSections={expandedSections} toggleSection={toggleSection} handleExportCSV={handleExportCSV} />}
{activeExp === 'NB4B' && <NB4BExplorer nb4b={nb4b} t={t} searchTerm={searchTerm} setSearchTerm={setSearchTerm} modelFilter={modelFilter} setModelFilter={setModelFilter} filterFilter={filterFilter} setFilterFilter={setFilterFilter} expandedSections={expandedSections} toggleSection={toggleSection} handleExportCSV={handleExportCSV} />}
      {activeExp === 'NB6' && <NB6Explorer nb5={nb5} isDark={isDark} t={t} searchTerm={searchTerm} setSearchTerm={setSearchTerm} modelFilter={modelFilter} setModelFilter={setModelFilter} expandedSections={expandedSections} toggleSection={toggleSection} handleExportCSV={handleExportCSV} />}
      {activeExp === 'NB5B' && <NB5BExplorer nb5b={nb5b} isDark={isDark} t={t} searchTerm={searchTerm} setSearchTerm={setSearchTerm} modelFilter={modelFilter} setModelFilter={setModelFilter} expandedSections={expandedSections} toggleSection={toggleSection} handleExportCSV={handleExportCSV} />}
      {activeExp === 'NB7' && <NB7Explorer t={t} expandedSections={expandedSections} toggleSection={toggleSection} handleExportCSV={handleExportCSV} />}
      {activeExp === 'NB8' && <NB8Explorer t={t} searchTerm={searchTerm} setSearchTerm={setSearchTerm} expandedSections={expandedSections} toggleSection={toggleSection} handleExportCSV={handleExportCSV} />}
    </PageWrapper>
  );
}

/* ─── Shared UI helpers ────────────────────────────────────────────── */

/**
 * Archivo de procedencia de cada bloque de metricas.
 *
 * Una cifra sin su archivo no es verificable, y en un trabajo de tesis eso es lo
 * primero que se pregunta. Se declaran aqui para que la ruta salga una sola vez y no
 * pueda desincronizarse entre tarjetas de la misma seccion.
 */
const FUENTE_NB1 = '/data/nb1/resultados_A.csv + resultados_B.csv';
const FUENTE_NB2 = '/data/nb2/resultados_ExpA.csv + resultados_ExpB.csv';
const FUENTE_NB3_A = '/data/nb3/expA_evaluacion_estandar.csv';
const FUENTE_NB3_B = '/data/nb3/expB_resumen.csv';
const FUENTE_NB3_T = '/data/nb3/expB_transferencia_cruzada.csv';
const FUENTE_NB3_C = '/data/nb3/expC_escenario_clinico.csv';
const FUENTE_NB4B = '/data/nb4b/resultados_nb4b_global.csv';
// Ojo: la carpeta en disco se llama `nb5` pero guarda el experimento 6. Se deja
// la ruta tal cual porque renombrarla aqui, sin renombrarla en disco, romperia
// la carga. El nombre de la constante si dice la verdad.
const FUENTE_NB6 = '/data/nb5/resultados_lopo.csv';
const FUENTE_NB5B = '/data/nb5b/tabla_resumen_v2.csv';

/** Cuatro decimales, o nada si el valor no existe. */
const dec4 = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? undefined : x.toFixed(4);

/**
 * Resumen de un vector de R²: media, desviacion tipica muestral e intervalo de
 * confianza del 95 % de la media.
 *
 * Las tarjetas mostraban solo la media, que da una falsa sensacion de precision. Con
 * n grande el intervalo es estrecho y la desviacion no: son cosas distintas y las dos
 * hacen falta para leer el resultado.
 */
function resumenR2(valores: number[]) {
  const n = valores.length;
  if (n === 0) return null;
  const media = valores.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { n, media, std: null as number | null, ic95: null as [number, number] | null };
  const std = Math.sqrt(valores.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1));
  const e = 1.96 * (std / Math.sqrt(n));
  return { n, media, std, ic95: [media - e, media + e] as [number, number] };
}

function SectionHeader({ title, expanded, onToggle }: { title: string; expanded: boolean; onToggle: () => void }) {
  // Antes leia el tema con `useECGStore.getState()`, que no es reactivo: al cambiar
  // de claro a oscuro este encabezado se quedaba con los colores del tema anterior
  // hasta que algo lo repintase. Con tokens el navegador lo resuelve solo.
  return (
    <Boton
      onClick={onToggle}
      variante="secundario"
      ancho
      aria-expanded={expanded}
      iconoDerecha={expanded ? <ChevronUp size={17} aria-hidden /> : <ChevronDown size={17} aria-hidden />}
      style={{
        justifyContent: 'space-between',
        background: 'var(--accent-bg)',
        borderColor: 'var(--accent-border)',
        marginBottom: expanded ? 16 : 0,
      }}
    >
      <span>{title}</span>
    </Boton>
  );
}




function ExportBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Boton onClick={onClick} variante="secundario" tamano="sm" icono={<Download size={14} aria-hidden />}>
      {label}
    </Boton>
  );
}

/* ─── NB1 Explorer ────────────────────────────────────────────── */

function NB1Explorer({ nb1, isDark, t, searchTerm, setSearchTerm, modelFilter, setModelFilter, filterFilter, setFilterFilter, expandedSections, toggleSection, handleExportCSV }: {
  nb1: ReturnType<typeof useNB1Results>; isDark: boolean; t: TFn;
  searchTerm: string; setSearchTerm: (v: string) => void;
  modelFilter: string; setModelFilter: (v: string) => void;
  filterFilter: string; setFilterFilter: (v: string) => void;
  expandedSections: Record<string, boolean>; toggleSection: (k: string) => void;
  handleExportCSV: (data: Record<string, unknown>[], fn: string) => void;
}) {
  const [nb1Exp, setNb1Exp] = useState<'A' | 'B'>('B');

  const raw = nb1Exp === 'A' ? nb1.rawA : nb1.rawB;
  const resumen = nb1Exp === 'A' ? nb1.resumenA : nb1.resumenB;

  const filteredRaw = useMemo(() => {
    return raw.filter(r => {
      if (modelFilter !== 'Todos' && r.Modelo !== modelFilter) return false;
      if (filterFilter !== 'Todos' && r.Filtro !== filterFilter) return false;
      if (searchTerm && !String(r.Paciente).includes(searchTerm) && !r.Modelo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [raw, modelFilter, filterFilter, searchTerm]);

  const uniqueModels = useMemo(() => [...new Set(raw.map(r => r.Modelo))], [raw]);
  const uniqueFilters = useMemo(() => [...new Set(raw.map(r => r.Filtro))], [raw]);

  const kpis = useMemo(() => {
    if (filteredRaw.length === 0) return null;
    const r2Vals = filteredRaw.map(r => r.R2);
    const mean = r2Vals.reduce((a, b) => a + b, 0) / r2Vals.length;
    const best = filteredRaw.reduce((b, c) => c.R2 > b.R2 ? c : b, filteredRaw[0]);
    const worst = filteredRaw.reduce((b, c) => c.R2 < b.R2 ? c : b, filteredRaw[0]);
    const patients = new Set(filteredRaw.map(r => r.Paciente)).size;
    const res = resumenR2(r2Vals);
    return { mean, best, worst, patients, n: filteredRaw.length, bestModel: best.Modelo,
             std: res?.std ?? null, ic95: res?.ic95 ?? null };
  }, [filteredRaw]);

  const barData = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    filteredRaw.forEach(r => { if (!grouped[r.Modelo]) grouped[r.Modelo] = []; grouped[r.Modelo].push(r.R2); });
    return Object.entries(grouped).map(([m, v]) => {
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const std = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
      return { name: m, value: mean, error: std, color: MODEL_COLORS[m] || '#6b7280' };
    }).sort((a, b) => b.value - a.value);
  }, [filteredRaw]);

  const violinData = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    filteredRaw.forEach(r => { if (!grouped[r.Modelo]) grouped[r.Modelo] = []; grouped[r.Modelo].push(r.R2); });
    return Object.entries(grouped).map(([modelo, vals]) => ({
      type: 'violin' as const, name: modelo, y: vals,
      box: { visible: true }, points: 'outliers' as const,
      marker: { color: MODEL_COLORS[modelo] || '#6b7280' },
      line: { color: MODEL_COLORS[modelo] || '#6b7280' },
      fillcolor: (MODEL_COLORS[modelo] || '#6b7280') + '40',
    }));
  }, [filteredRaw]);

  const heatmapData = useMemo(() => {
    if (uniqueModels.length < 2 || uniqueFilters.length < 2) return null;
    const z: number[][] = [];
    uniqueModels.forEach(m => {
      const row: number[] = [];
      uniqueFilters.forEach(f => {
        const subset = filteredRaw.filter(r => r.Modelo === m && r.Filtro === f);
        row.push(subset.length > 0 ? subset.reduce((s, r) => s + r.R2, 0) / subset.length : NaN);
      });
      z.push(row);
    });
    return { x: uniqueFilters, y: uniqueModels, z };
  }, [filteredRaw, uniqueModels, uniqueFilters]);

  return (
    <div>
      <div role="tablist" style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['A', 'B'] as const).map(exp => (
          <Boton
            key={exp}
            onClick={() => setNb1Exp(exp)}
            variante="secundario"
            activo={nb1Exp === exp}
            role="tab"
            aria-selected={nb1Exp === exp}
          >
            Exp {exp}{exp === 'A' ? ` · ${t('Ventanas de tiempo', 'Time windows')}` : ` · ${t('Latido a latido', 'Beat-to-beat')}`}
          </Boton>
        ))}
      </div>

      {/* Filters */}
      <BarraFiltros>
        <Busqueda rotulo={t('Buscar', 'Search')} valor={searchTerm} onChange={setSearchTerm} marcador={t('Buscar paciente o modelo...', 'Search patient or model...')} />
        <Selector rotulo={t('Modelo', 'Model')} valor={modelFilter} onChange={setModelFilter} opciones={['Todos', ...uniqueModels]} />
        <Selector rotulo={t('Filtro', 'Filter')} valor={filterFilter} onChange={setFilterFilter} opciones={['Todos', ...uniqueFilters]} />
        <RecuentoFiltro>
          {filteredRaw.length} {t('de', 'of')} {raw.length} {t('filas', 'rows')}
        </RecuentoFiltro>
      </BarraFiltros>

      {/* KPIs */}
      {kpis && (
        <MetricGrid minimo={190}>
          <MetricStat densa etiqueta={t('Observaciones', 'Observations')} valor={kpis.n} fase="NB1" fuente={FUENTE_NB1} />
          <MetricStat densa etiqueta={t('Pacientes', 'Patients')} valor={kpis.patients} fase="NB1" fuente={FUENTE_NB1} />
          <MetricStat densa etiqueta="R² medio" valor={kpis.mean.toFixed(4)}
            dispersion={dec4(kpis.std)}
            ic95={kpis.ic95 ? [kpis.ic95[0].toFixed(4), kpis.ic95[1].toFixed(4)] : undefined}
            n={kpis.n} fase="NB1" fuente={FUENTE_NB1} />
          <MetricStat densa etiqueta={t('Mejor modelo', 'Best model')} valor={kpis.bestModel} fase="NB1" fuente={FUENTE_NB1} />
          <MetricStat densa etiqueta="R² máximo" valor={kpis.best.R2.toFixed(4)} estado="bueno"
            nota={`${kpis.best.Modelo} · ${t('paciente', 'patient')} ${kpis.best.Paciente}`}
            fase="NB1" fuente={FUENTE_NB1} />
          <MetricStat densa etiqueta="R² mínimo" valor={kpis.worst.R2.toFixed(4)}
            estado={kpis.worst.R2 < 0 ? 'critico' : 'neutro'}
            nota={`${kpis.worst.Modelo} · ${t('paciente', 'patient')} ${kpis.worst.Paciente}`}
            fase="NB1" fuente={FUENTE_NB1} />
        </MetricGrid>
      )}

      {/* Summary Table */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>
          {t('Tabla Resumen', 'Summary Table')}, Exp {nb1Exp}
        </h3>
        <DataTable
          fuente={`/data/nb1/resumen_Exp${nb1Exp}.csv`}
          data={resumen as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'Modelo', label: t('Modelo', 'Model') },
            { key: 'N', label: 'N' },
            { key: 'R2_media', label: `R\u00B2 ${t('medio', 'mean')}` },
            { key: 'R2_std', label: `R\u00B2 \u03C3` },
            { key: 'RMSE_media', label: 'RMSE' },
            { key: 'MAE_media', label: 'MAE' },
          ]}
          highlightBest highlightKey="R2_media"
          highlightCondition={(val) => val === Math.max(...resumen.map(r => r.R2_media))}
          maxHeight="250px"
        />
      </div>

      {/* Raw Data */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={`${t('Datos Crudos', 'Raw Data')} (${filteredRaw.length} ${t('filas', 'rows')})`} expanded={expandedSections.raw} onToggle={() => toggleSection('raw')} />
        {expandedSections.raw && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(filteredRaw as unknown as Record<string, unknown>[], `nb1_exp${nb1Exp}_raw.csv`)} label="CSV" />
            </div>
            <DataTable
              fuente={`/data/nb1/resultados_${nb1Exp}.csv`}
              data={filteredRaw as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'Paciente', label: t('Paciente', 'Patient') },
                { key: 'Filtro', label: t('Filtro', 'Filter') },
                ...(nb1Exp === 'A' ? [{ key: 'Horizonte_seg', label: 'H (s)' }] : [{ key: 'Lookback', label: 'LB' }]),
                { key: 'Modelo', label: t('Modelo', 'Model') },
                { key: 'R2', label: `R\u00B2` },
                { key: 'RMSE', label: 'RMSE' },
                { key: 'MAE', label: 'MAE' },
                { key: 'DTW', label: 'DTW' },
                { key: 'R2_train', label: `R\u00B2 train` },
              ]}
              maxHeight="350px"
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={t('Graficas', 'Charts')} expanded={expandedSections.charts} onToggle={() => toggleSection('charts')} />
        {expandedSections.charts && (
          <>
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>
                {`R\u00B2 ${t('medio por modelo', 'mean per model')}`}
              </h3>
              <PlotlyBarChart data={barData} title="" xAxisLabel={`R\u00B2`} horizontal showErrorBars height={Math.max(200, barData.length * 40)} />
            </div>
            {heatmapData && (
              <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>
                  {t('Heatmap Modelo x Filtro', 'Heatmap Model x Filter')}
                </h3>
                <Heatmap x={heatmapData.x} y={heatmapData.y} z={heatmapData.z} title="" zAxisLabel={`R\u00B2`} colorscale="thermal" height={350} />
              </div>
            )}
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>
                {t('Distribucion R\u00B2 por modelo', 'R\u00B2 distribution per model')}
              </h3>
              <PlotlyChart
                data={violinData}
                layout={{
                  height: 360, margin: { l: 50, r: 20, t: 10, b: 40 },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                  font: { color: 'var(--text)', size: 11 },
                  violingap: 0.05, violinmode: 'group', showlegend: false,
                  yaxis: { title: `R\u00B2`, gridcolor: 'var(--border)' },
                  xaxis: { gridcolor: 'var(--border)' },
                }}
                config={{ responsive: true, displayModeBar: false }} style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Overfitting */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={t('Sobreajuste (Train vs Test)', 'Overfitting (Train vs Test)')} expanded={expandedSections.overfit} onToggle={() => toggleSection('overfit')} />
        {expandedSections.overfit && (
          <div className="card" style={{ padding: '16px' }}>
            <DataTable
              fuente={`/data/nb1/tabla_r2_train_test_Exp${nb1Exp}.csv`}
              data={(nb1Exp === 'A' ? nb1.overfitA : nb1.overfitB) as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'Modelo', label: t('Modelo', 'Model') },
                { key: 'R2_train', label: `R\u00B2 train` },
                { key: 'R2_test', label: `R\u00B2 test` },
                { key: 'Diferencia', label: 'Gap' },
              ]}
              maxHeight="250px"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── NB2 Explorer ────────────────────────────────────────────── */

function NB2Explorer({ nb2, isDark, t, searchTerm, setSearchTerm, modelFilter, setModelFilter, filterFilter, setFilterFilter, expandedSections, toggleSection, handleExportCSV }: {
  nb2: ReturnType<typeof useNB2Results>; isDark: boolean; t: TFn;
  searchTerm: string; setSearchTerm: (v: string) => void;
  modelFilter: string; setModelFilter: (v: string) => void;
  filterFilter: string; setFilterFilter: (v: string) => void;
  expandedSections: Record<string, boolean>; toggleSection: (k: string) => void;
  handleExportCSV: (data: Record<string, unknown>[], fn: string) => void;
}) {
  const [nb2Exp, setNb2Exp] = useState<'A' | 'B'>('B');
  const raw = nb2Exp === 'A' ? nb2.rawA : nb2.rawB;
  const resumen = nb2Exp === 'A' ? nb2.resumenA : nb2.resumenB;

  const filteredRaw = useMemo(() => {
    return raw.filter(r => {
      if (modelFilter !== 'Todos' && r.Modelo !== modelFilter) return false;
      if (filterFilter !== 'Todos' && r.Filtro !== filterFilter) return false;
      if (searchTerm && !String(r.Paciente).includes(searchTerm) && !r.Modelo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [raw, modelFilter, filterFilter, searchTerm]);

  const uniqueModels = useMemo(() => [...new Set(raw.map(r => r.Modelo))], [raw]);
  const uniqueFilters = useMemo(() => [...new Set(raw.map(r => r.Filtro))], [raw]);

  const kpis = useMemo(() => {
    if (filteredRaw.length === 0) return null;
    const r2Vals = filteredRaw.map(r => r.R2);
    const mean = r2Vals.reduce((a, b) => a + b, 0) / r2Vals.length;
    const best = filteredRaw.reduce((b, c) => c.R2 > b.R2 ? c : b, filteredRaw[0]);
    const patients = new Set(filteredRaw.map(r => r.Paciente)).size;
    const res = resumenR2(r2Vals);
    return { mean, best, patients, n: filteredRaw.length, bestModel: best.Modelo,
             std: res?.std ?? null, ic95: res?.ic95 ?? null };
  }, [filteredRaw]);

  const barData = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    filteredRaw.forEach(r => { if (!grouped[r.Modelo]) grouped[r.Modelo] = []; grouped[r.Modelo].push(r.R2); });
    return Object.entries(grouped).map(([m, v]) => {
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const std = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
      return { name: m, value: mean, error: std, color: MODEL_COLORS[m] || '#6b7280' };
    }).sort((a, b) => b.value - a.value);
  }, [filteredRaw]);

  const violinData = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    filteredRaw.forEach(r => { if (!grouped[r.Modelo]) grouped[r.Modelo] = []; grouped[r.Modelo].push(r.R2); });
    return Object.entries(grouped).map(([modelo, vals]) => ({
      type: 'violin' as const, name: modelo, y: vals,
      box: { visible: true }, points: 'outliers' as const,
      marker: { color: MODEL_COLORS[modelo] || '#6b7280' },
      line: { color: MODEL_COLORS[modelo] || '#6b7280' },
      fillcolor: (MODEL_COLORS[modelo] || '#6b7280') + '40',
    }));
  }, [filteredRaw]);

  return (
    <div>
      <div role="tablist" style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['A', 'B'] as const).map(exp => (
          <Boton
            key={exp}
            onClick={() => setNb2Exp(exp)}
            variante="secundario"
            activo={nb2Exp === exp}
            role="tab"
            aria-selected={nb2Exp === exp}
          >
            Exp {exp}{exp === 'A' ? ` · ${t('Ventanas de tiempo', 'Time windows')}` : ` · ${t('Latido a latido', 'Beat-to-beat')}`}
          </Boton>
        ))}
      </div>

      <BarraFiltros>
        <Busqueda rotulo={t('Buscar', 'Search')} valor={searchTerm} onChange={setSearchTerm} marcador={t('Buscar paciente o modelo...', 'Search patient or model...')} />
        <Selector rotulo={t('Modelo', 'Model')} valor={modelFilter} onChange={setModelFilter} opciones={['Todos', ...uniqueModels]} />
        <Selector rotulo={t('Filtro', 'Filter')} valor={filterFilter} onChange={setFilterFilter} opciones={['Todos', ...uniqueFilters]} />
        <RecuentoFiltro>
          {filteredRaw.length} {t('de', 'of')} {raw.length} {t('filas', 'rows')}
        </RecuentoFiltro>
      </BarraFiltros>

      {kpis && (
        <MetricGrid minimo={190}>
          <MetricStat densa etiqueta={t('Observaciones', 'Observations')} valor={kpis.n} fase="NB2" fuente={FUENTE_NB2} />
          <MetricStat densa etiqueta={t('Pacientes', 'Patients')} valor={kpis.patients} fase="NB2" fuente={FUENTE_NB2} />
          <MetricStat densa etiqueta="R² medio" valor={kpis.mean.toFixed(4)}
            dispersion={dec4(kpis.std)}
            ic95={kpis.ic95 ? [kpis.ic95[0].toFixed(4), kpis.ic95[1].toFixed(4)] : undefined}
            n={kpis.n} fase="NB2" fuente={FUENTE_NB2} />
          <MetricStat densa etiqueta={t('Mejor modelo', 'Best model')} valor={kpis.bestModel} fase="NB2" fuente={FUENTE_NB2} />
        </MetricGrid>
      )}

      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Tabla Resumen', 'Summary Table')}, Exp {nb2Exp}</h3>
        <DataTable
          fuente={`/data/nb2/resumen_Exp ${nb2Exp}.csv`}
          data={resumen as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'Modelo', label: t('Modelo', 'Model') }, { key: 'N', label: 'N' },
            { key: 'R2_media', label: `R\u00B2 ${t('medio', 'mean')}` }, { key: 'R2_std', label: `R\u00B2 \u03C3` },
            { key: 'RMSE_media', label: 'RMSE' }, { key: 'MAE_media', label: 'MAE' },
          ]}
          highlightBest highlightKey="R2_media" maxHeight="250px"
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={`${t('Datos Crudos', 'Raw Data')} (${filteredRaw.length} ${t('filas', 'rows')})`} expanded={expandedSections.raw} onToggle={() => toggleSection('raw')} />
        {expandedSections.raw && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(filteredRaw as unknown as Record<string, unknown>[], `nb2_exp${nb2Exp}_raw.csv`)} label="CSV" />
            </div>
            <DataTable
              fuente={`/data/nb2/resultados_Exp${nb2Exp}.csv`}
              data={filteredRaw as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'Paciente', label: t('Paciente', 'Patient') }, { key: 'Filtro', label: t('Filtro', 'Filter') },
                ...(nb2Exp === 'A' ? [{ key: 'Horizonte_seg', label: 'H (s)' }] : [{ key: 'Lookback', label: 'LB' }]),
                { key: 'Modelo', label: t('Modelo', 'Model') }, { key: 'R2', label: `R\u00B2` },
                { key: 'RMSE', label: 'RMSE' }, { key: 'MAE', label: 'MAE' }, { key: 'R2_train', label: `R\u00B2 train` },
              ]}
              maxHeight="350px"
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={t('Graficas', 'Charts')} expanded={expandedSections.charts} onToggle={() => toggleSection('charts')} />
        {expandedSections.charts && (
          <>
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{`R\u00B2 ${t('medio por modelo', 'mean per model')}`}</h3>
              <PlotlyBarChart data={barData} title="" xAxisLabel={`R\u00B2`} horizontal showErrorBars height={Math.max(200, barData.length * 40)} />
            </div>
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Distribucion R\u00B2', 'R\u00B2 distribution')}</h3>
              <PlotlyChart
                data={violinData}
                layout={{
                  height: 360, margin: { l: 50, r: 20, t: 10, b: 40 },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                  font: { color: 'var(--text)', size: 11 },
                  violingap: 0.05, violinmode: 'group', showlegend: false,
                  yaxis: { title: `R\u00B2`, gridcolor: 'var(--border)' },
                  xaxis: { gridcolor: 'var(--border)' },
                }}
                config={{ responsive: true, displayModeBar: false }} style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={t('Sobreajuste', 'Overfitting')} expanded={expandedSections.overfit} onToggle={() => toggleSection('overfit')} />
        {expandedSections.overfit && (
          <div className="card" style={{ padding: '16px' }}>
            <DataTable
              fuente={`/data/nb2/r2_train_test_Exp ${nb2Exp}.csv`}
              data={(nb2Exp === 'A' ? nb2.overfitA : nb2.overfitB) as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'Modelo', label: t('Modelo', 'Model') }, { key: 'R2_train', label: `R\u00B2 train` },
                { key: 'R2_test', label: `R\u00B2 test` }, { key: 'Diferencia', label: 'Gap' },
              ]}
              maxHeight="250px"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── NB3 Explorer ────────────────────────────────────────────── */

function NB3Explorer({ nb3, t, expandedSections, toggleSection, handleExportCSV }: {
  nb3: ReturnType<typeof useNB3Results>; t: TFn;
  expandedSections: Record<string, boolean>; toggleSection: (k: string) => void;
  handleExportCSV: (data: Record<string, unknown>[], fn: string) => void;
}) {
  const [nb3SubTab, setNb3SubTab] = useState<'A' | 'B' | 'C'>('A');

  const expAKpis = useMemo(() => {
    if (nb3.expA.length === 0) return null;
    const models = [...new Set(nb3.expA.map(r => r.Modelo))];
    const best = nb3.expA.reduce((b, c) => c.R2 > b.R2 ? c : b, nb3.expA[0]);
    return { n: nb3.expA.length, models, bestModel: best.Modelo, bestR2: best.R2, patients: new Set(nb3.expA.map(r => r.Paciente)).size };
  }, [nb3.expA]);

  const barData = useMemo(() => {
    if (nb3SubTab !== 'A' || nb3.expA.length === 0) return [];
    const grouped: Record<string, number[]> = {};
    nb3.expA.forEach(r => { if (!grouped[r.Modelo]) grouped[r.Modelo] = []; grouped[r.Modelo].push(r.R2); });
    return Object.entries(grouped).map(([m, v]) => {
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const std = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
      return { name: m, value: mean, error: std, color: MODEL_COLORS[m] || '#6b7280' };
    }).sort((a, b) => b.value - a.value);
  }, [nb3.expA, nb3SubTab]);

  return (
    <div>
      <div role="tablist" style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['A', 'B', 'C'] as const).map(exp => (
          <Boton
            key={exp}
            onClick={() => setNb3SubTab(exp)}
            variante="secundario"
            activo={nb3SubTab === exp}
            role="tab"
            aria-selected={nb3SubTab === exp}
          >
            {exp === 'A' ? `Exp A · ${t('Evaluacion Estandar', 'Standard Evaluation')}` : exp === 'B' ? `Exp B · ${t('Transferencia Cruzada', 'Cross Transfer')}` : `Exp C · ${t('Escenario Clinico', 'Clinical Scenario')}`}
          </Boton>
        ))}
      </div>

      {nb3SubTab === 'A' && (
        <>
          {expAKpis && (
            <MetricGrid minimo={190}>
              <MetricStat densa etiqueta={t('Observaciones', 'Observations')} valor={expAKpis.n} fase="NB3" fuente={FUENTE_NB3_A} />
              <MetricStat densa etiqueta={t('Pacientes', 'Patients')} valor={expAKpis.patients} fase="NB3" fuente={FUENTE_NB3_A} />
              <MetricStat densa etiqueta={t('Mejor modelo', 'Best model')} valor={expAKpis.bestModel} fase="NB3" fuente={FUENTE_NB3_A} />
              <MetricStat densa etiqueta="R² máximo" valor={expAKpis.bestR2.toFixed(4)} estado="bueno"
                n={expAKpis.n} fase="NB3" fuente={FUENTE_NB3_A} />
            </MetricGrid>
          )}
          <div style={{ marginBottom: '24px' }}>
            <SectionHeader title={`${t('Datos Crudos', 'Raw Data')} · Exp A (${nb3.expA.length})`} expanded={expandedSections.raw} onToggle={() => toggleSection('raw')} />
            {expandedSections.raw && (
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <ExportBtn onClick={() => handleExportCSV(nb3.expA as unknown as Record<string, unknown>[], 'nb3_expA.csv')} label="CSV" />
                </div>
                <DataTable
                  fuente="/data/nb3/expA_evaluacion_estandar.csv"
                  data={nb3.expA as unknown as Record<string, unknown>[]}
                  columns={[
                    { key: 'Paciente', label: t('Paciente', 'Patient') }, { key: 'Modelo', label: t('Modelo', 'Model') },
                    { key: 'R2', label: `R\u00B2` }, { key: 'RMSE', label: 'RMSE' }, { key: 'MAE', label: 'MAE' },
                  ]}
                  maxHeight="350px"
                />
              </div>
            )}
          </div>
          {barData.length > 0 && (
            <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{`R\u00B2 ${t('medio por modelo', 'mean per model')}`}</h3>
              <PlotlyBarChart data={barData} title="" xAxisLabel={`R\u00B2`} horizontal showErrorBars height={250} />
            </div>
          )}
        </>
      )}

      {nb3SubTab === 'B' && (
        <>
          <MetricGrid minimo={190}>
            <MetricStat densa etiqueta={t('Pacientes', 'Patients')} valor={nb3.expBResumen.length} fase="NB3" fuente={FUENTE_NB3_B} />
            <MetricStat densa etiqueta={t('Escenarios', 'Scenarios')} valor={nb3.expBTransferencia.length} fase="NB3" fuente={FUENTE_NB3_T} />
          </MetricGrid>
          <div style={{ marginBottom: '24px' }}>
            <SectionHeader title={t('Resumen Transferencia', 'Transfer Summary')} expanded={expandedSections.raw} onToggle={() => toggleSection('raw')} />
            {expandedSections.raw && (
              <div className="card" style={{ padding: '16px' }}>
                <DataTable
                  fuente="/data/nb3/expB_resumen.csv"
                  data={nb3.expBResumen as unknown as Record<string, unknown>[]}
                  columns={[
                    { key: 'Paciente', label: t('Paciente', 'Patient') },
                    { key: 'NB2_propio', label: 'NB2 propio' }, { key: 'NB2_ajeno_mean', label: 'NB2 ajeno' },
                    { key: 'NB4B', label: 'NB4B' }, { key: 'NB5B', label: 'NB5B' },
                    { key: 'Caida_NB2', label: t('Caida NB2', 'NB2 Drop') },
                  ]}
                  maxHeight="350px"
                />
              </div>
            )}
          </div>
          <div style={{ marginBottom: '24px' }}>
            <SectionHeader title={`${t('Transferencia Cruzada', 'Cross Transfer')} (${nb3.expBTransferencia.length})`} expanded={expandedSections.charts} onToggle={() => toggleSection('charts')} />
            {expandedSections.charts && (
              <div className="card" style={{ padding: '16px' }}>
                <DataTable
                  fuente="/data/nb3/expB_transferencia_cruzada.csv"
                  data={nb3.expBTransferencia as unknown as Record<string, unknown>[]}
                  columns={[
                    { key: 'Paciente', label: t('Paciente', 'Patient') },
                    { key: 'Escenario', label: t('Escenario', 'Scenario') },
                    { key: 'R2', label: `R\u00B2` }, { key: 'n_test', label: 'n' },
                  ]}
                  maxHeight="350px"
                />
              </div>
            )}
          </div>
        </>
      )}

      {nb3SubTab === 'C' && (
        <div style={{ marginBottom: '24px' }}>
          <MetricGrid minimo={190}>
            <MetricStat densa etiqueta={t('Observaciones', 'Observations')} valor={nb3.expC.length} fase="NB3" fuente={FUENTE_NB3_C} />
          </MetricGrid>
          <SectionHeader title={`${t('Escenario Clinico', 'Clinical Scenario')} (${nb3.expC.length})`} expanded={expandedSections.raw} onToggle={() => toggleSection('raw')} />
          {expandedSections.raw && (
            <div className="card" style={{ padding: '16px' }}>
              <DataTable
                fuente="/data/nb3/expC_escenario_clinico.csv"
                data={nb3.expC as unknown as Record<string, unknown>[]}
                columns={[
                  { key: 'Paciente', label: t('Paciente', 'Patient') }, { key: 'Modelo', label: t('Modelo', 'Model') },
                  { key: 'R2', label: `R\u00B2` }, { key: 'Disponible', label: t('Disponible', 'Available') },
                ]}
                maxHeight="350px"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── NB4B Explorer ────────────────────────────────────────────── */

function NB4BExplorer({ nb4b, t, searchTerm, setSearchTerm, modelFilter, setModelFilter, filterFilter, setFilterFilter, expandedSections, toggleSection, handleExportCSV }: {
  nb4b: ReturnType<typeof useNB4BResults>; t: TFn;
  searchTerm: string; setSearchTerm: (v: string) => void;
  modelFilter: string; setModelFilter: (v: string) => void;
  filterFilter: string; setFilterFilter: (v: string) => void;
  expandedSections: Record<string, boolean>; toggleSection: (k: string) => void;
  handleExportCSV: (data: Record<string, unknown>[], fn: string) => void;
}) {
  const filteredGlobal = useMemo(() => {
    return nb4b.global.filter(r => {
      if (modelFilter !== 'Todos' && r.Modelo !== modelFilter) return false;
      if (filterFilter !== 'Todos' && r.Filtro !== filterFilter) return false;
      return true;
    });
  }, [nb4b.global, modelFilter, filterFilter]);

  const filteredPorPaciente = useMemo(() => {
    return nb4b.porPaciente.filter(r => {
      if (modelFilter !== 'Todos' && r.Modelo !== modelFilter) return false;
      if (filterFilter !== 'Todos' && r.Filtro !== filterFilter) return false;
      if (searchTerm && !String(r.Paciente).includes(searchTerm)) return false;
      return true;
    });
  }, [nb4b.porPaciente, modelFilter, filterFilter, searchTerm]);

  const uniqueModels = useMemo(() => [...new Set(nb4b.global.map(r => r.Modelo))], [nb4b.global]);
  const uniqueFilters = useMemo(() => [...new Set(nb4b.global.map(r => r.Filtro))], [nb4b.global]);

  const kpis = useMemo(() => {
    if (filteredGlobal.length === 0) return null;
    const best = filteredGlobal.reduce((b, c) => c.R2 > b.R2 ? c : b, filteredGlobal[0]);
    const meanR2 = filteredGlobal.reduce((s, r) => s + r.R2, 0) / filteredGlobal.length;
    const res = resumenR2(filteredGlobal.map(r => r.R2));
    return { n: filteredGlobal.length, bestModel: `${best.Modelo} + ${best.Filtro}`, bestR2: best.R2, meanR2,
             std: res?.std ?? null, ic95: res?.ic95 ?? null };
  }, [filteredGlobal]);

  const barData = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    filteredGlobal.forEach(r => { if (!grouped[r.Modelo]) grouped[r.Modelo] = []; grouped[r.Modelo].push(r.R2); });
    return Object.entries(grouped).map(([m, v]) => {
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const std = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
      return { name: m, value: mean, error: std, color: MODEL_COLORS[m] || '#6b7280' };
    }).sort((a, b) => b.value - a.value);
  }, [filteredGlobal]);

  const heatmapData = useMemo(() => {
    if (uniqueModels.length < 2 || uniqueFilters.length < 2) return null;
    const z: number[][] = [];
    uniqueModels.forEach(m => {
      const row: number[] = [];
      uniqueFilters.forEach(f => {
        const subset = filteredGlobal.filter(r => r.Modelo === m && r.Filtro === f);
        row.push(subset.length > 0 ? subset[0].R2 : NaN);
      });
      z.push(row);
    });
    return { x: uniqueFilters, y: uniqueModels, z };
  }, [filteredGlobal, uniqueModels, uniqueFilters]);

  return (
    <div>
      <BarraFiltros>
        <Busqueda rotulo={t('Buscar', 'Search')} valor={searchTerm} onChange={setSearchTerm} marcador={t('Buscar paciente...', 'Search patient...')} />
        <Selector rotulo={t('Modelo', 'Model')} valor={modelFilter} onChange={setModelFilter} opciones={['Todos', ...uniqueModels]} />
        <Selector rotulo={t('Filtro', 'Filter')} valor={filterFilter} onChange={setFilterFilter} opciones={['Todos', ...uniqueFilters]} />
        <RecuentoFiltro>
          {filteredPorPaciente.length} {t('de', 'of')} {nb4b.porPaciente.length} {t('filas', 'rows')}
        </RecuentoFiltro>
      </BarraFiltros>

      {kpis && (
        <MetricGrid minimo={190}>
          <MetricStat densa etiqueta={t('Configuraciones', 'Configurations')} valor={kpis.n} fase="NB4B" fuente={FUENTE_NB4B} />
          <MetricStat densa etiqueta="R² medio" valor={kpis.meanR2.toFixed(4)}
            dispersion={dec4(kpis.std)}
            ic95={kpis.ic95 ? [kpis.ic95[0].toFixed(4), kpis.ic95[1].toFixed(4)] : undefined}
            n={kpis.n} fase="NB4B" fuente={FUENTE_NB4B} />
          <MetricStat densa etiqueta={t('Mejor resultado', 'Best result')} valor={kpis.bestModel}
            estado="bueno" nota={`R² = ${kpis.bestR2.toFixed(4)}`} fase="NB4B" fuente={FUENTE_NB4B} />
        </MetricGrid>
      )}

      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Resultados Globales', 'Global Results')}</h3>
        <DataTable
          fuente="/data/nb4b/resultados_nb4b_global.csv"
          data={filteredGlobal as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'Filtro', label: t('Filtro', 'Filter') }, { key: 'Modelo', label: t('Modelo', 'Model') },
            { key: 'R2', label: `R\u00B2` }, { key: 'RMSE', label: 'RMSE' }, { key: 'MAE', label: 'MAE' },
            { key: 'R2_train', label: `R\u00B2 train` },
          ]}
          highlightBest highlightKey="R2" maxHeight="300px"
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={`${t('Datos por Paciente', 'Per-Patient Data')} (${filteredPorPaciente.length})`} expanded={expandedSections.patient} onToggle={() => toggleSection('patient')} />
        {expandedSections.patient && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(filteredPorPaciente as unknown as Record<string, unknown>[], 'nb4b_por_paciente.csv')} label="CSV" />
            </div>
            <DataTable
              fuente="/data/nb4b/resultados_nb4b_por_paciente.csv"
              data={filteredPorPaciente as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'Filtro', label: t('Filtro', 'Filter') }, { key: 'Modelo', label: t('Modelo', 'Model') },
                { key: 'Paciente', label: t('Paciente', 'Patient') },
                { key: 'R2', label: `R\u00B2` }, { key: 'RMSE', label: 'RMSE' }, { key: 'MAE', label: 'MAE' },
              ]}
              maxHeight="350px"
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={t('Graficas', 'Charts')} expanded={expandedSections.charts} onToggle={() => toggleSection('charts')} />
        {expandedSections.charts && (
          <>
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{`R\u00B2 ${t('medio por modelo', 'mean per model')}`}</h3>
              <PlotlyBarChart data={barData} title="" xAxisLabel={`R\u00B2`} horizontal showErrorBars height={Math.max(200, barData.length * 40)} />
            </div>
            {heatmapData && (
              <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Heatmap Modelo x Filtro', 'Heatmap Model x Filter')}</h3>
                <Heatmap x={heatmapData.x} y={heatmapData.y} z={heatmapData.z} title="" zAxisLabel={`R\u00B2`} colorscale="thermal" height={350} />
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={t('Sobreajuste', 'Overfitting')} expanded={expandedSections.overfit} onToggle={() => toggleSection('overfit')} />
        {expandedSections.overfit && nb4b.overfit.length > 0 && (
          <div className="card" style={{ padding: '16px' }}>
            <DataTable
              fuente="/data/nb4b/tabla_r2_train_test_nb4b.csv"
              data={nb4b.overfit as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'Modelo', label: t('Modelo', 'Model') }, { key: 'R2_train', label: `R\u00B2 train` },
                { key: 'R2_test', label: `R\u00B2 test` }, { key: 'Diferencia', label: 'Gap' },
              ]}
              maxHeight="250px"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── NB6 Explorer ────────────────────────────────────────────── */

function NB6Explorer({ nb5, isDark, t, searchTerm, setSearchTerm, modelFilter, setModelFilter, expandedSections, toggleSection, handleExportCSV }: {
  nb5: ReturnType<typeof useNB5Results>; isDark: boolean; t: TFn;
  searchTerm: string; setSearchTerm: (v: string) => void;
  modelFilter: string; setModelFilter: (v: string) => void;
  expandedSections: Record<string, boolean>; toggleSection: (k: string) => void;
  handleExportCSV: (data: Record<string, unknown>[], fn: string) => void;
}) {
  const filteredRaw = useMemo(() => {
    return nb5.raw.filter(r => {
      if (modelFilter !== 'Todos' && r.Modelo !== modelFilter) return false;
      if (searchTerm && !String(r.paciente_test).includes(searchTerm)) return false;
      return true;
    });
  }, [nb5.raw, modelFilter, searchTerm]);

  const uniqueModels = useMemo(() => [...new Set(nb5.raw.map(r => r.Modelo))], [nb5.raw]);

  const kpis = useMemo(() => {
    if (filteredRaw.length === 0) return null;
    const r2Vals = filteredRaw.map(r => r.R2_total);
    const mean = r2Vals.reduce((a, b) => a + b, 0) / r2Vals.length;
    const best = filteredRaw.reduce((b, c) => c.R2_total > b.R2_total ? c : b, filteredRaw[0]);
    const worst = filteredRaw.reduce((b, c) => c.R2_total < b.R2_total ? c : b, filteredRaw[0]);
    const patients = new Set(filteredRaw.map(r => String(r.paciente_test))).size;
    const res = resumenR2(r2Vals);
    return { mean, best, worst, patients, n: filteredRaw.length,
             std: res?.std ?? null, ic95: res?.ic95 ?? null };
  }, [filteredRaw]);

  const barData = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    filteredRaw.forEach(r => { if (!grouped[r.Modelo]) grouped[r.Modelo] = []; grouped[r.Modelo].push(r.R2_total); });
    return Object.entries(grouped).map(([m, v]) => {
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const std = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
      return { name: m, value: mean, error: std, color: m.includes('_FT') ? '#f59e0b' : '#3b82f6' };
    }).sort((a, b) => b.value - a.value);
  }, [filteredRaw]);

  const scatterData = useMemo(() => {
    if (filteredRaw.length === 0) return [];
    const grouped: Record<string, { x: string[]; y: number[] }> = {};
    filteredRaw.forEach(r => {
      const key = r.Modelo;
      if (!grouped[key]) grouped[key] = { x: [], y: [] };
      grouped[key].x.push(`P${r.paciente_test}`);
      grouped[key].y.push(r.R2_total);
    });
    return Object.entries(grouped).map(([modelo, d]) => ({
      type: 'scatter' as const, mode: 'markers' as const, name: modelo,
      x: d.x, y: d.y,
      marker: { color: modelo.includes('_FT') ? '#f59e0b' : '#3b82f6', size: 6 },
    }));
  }, [filteredRaw]);

  return (
    <div>
      <BarraFiltros>
        <Busqueda rotulo={t('Buscar', 'Search')} valor={searchTerm} onChange={setSearchTerm} marcador={t('Buscar paciente...', 'Search patient...')} />
        <Selector rotulo={t('Modelo', 'Model')} valor={modelFilter} onChange={setModelFilter} opciones={['Todos', ...uniqueModels]} />
        <RecuentoFiltro>
          {filteredRaw.length} {t('de', 'of')} {nb5.raw.length} {t('filas', 'rows')}
        </RecuentoFiltro>
      </BarraFiltros>

      {kpis && (
        <MetricGrid minimo={190}>
          <MetricStat densa etiqueta={t('Evaluaciones', 'Evaluations')} valor={kpis.n} fase="NB6" fuente={FUENTE_NB6} />
          <MetricStat densa etiqueta={t('Pacientes', 'Patients')} valor={kpis.patients} fase="NB6" fuente={FUENTE_NB6} />
          <MetricStat densa etiqueta="R² medio" valor={kpis.mean.toFixed(4)}
            dispersion={dec4(kpis.std)}
            ic95={kpis.ic95 ? [kpis.ic95[0].toFixed(4), kpis.ic95[1].toFixed(4)] : undefined}
            n={kpis.n} fase="NB6" fuente={FUENTE_NB6} />
          <MetricStat densa etiqueta="R² máximo" valor={kpis.best.R2_total.toFixed(4)} estado="bueno"
            nota={`${t('paciente', 'patient')} ${kpis.best.paciente_test}`} fase="NB6" fuente={FUENTE_NB6} />
          <MetricStat densa etiqueta="R² mínimo" valor={kpis.worst.R2_total.toFixed(4)}
            estado={kpis.worst.R2_total < 0 ? 'critico' : 'neutro'}
            nota={`${t('paciente', 'patient')} ${kpis.worst.paciente_test}`} fase="NB6" fuente={FUENTE_NB6} />
          <MetricStat densa etiqueta={t('Gap entrenamiento-prueba', 'Train-test gap')}
            valor={nb5.gapData[0]?.GAP?.toFixed(4) ?? null} fase="NB6" fuente={FUENTE_NB6} />
          <MetricStat densa etiqueta="DTW medio" valor={nb5.dtwMean.toFixed(4)}
            nota={t('unidades de señal normalizada', 'normalized signal units')}
            n={kpis.n} fase="NB6" fuente={FUENTE_NB6} />
        </MetricGrid>
      )}

      {/* Summary Table */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Tabla Resumen', 'Summary Table')}</h3>
        <DataTable
          fuente="/data/nb5/tabla_resumen.csv"
          data={nb5.resumen as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'Modelo', label: t('Modelo', 'Model') },
            { key: 'N_pacientes', label: t('Pacientes', 'Patients') },
            { key: 'R2_total_mean', label: `R\u00B2 total` },
            { key: 'R2_total_std', label: `\u03C3` },
            { key: 'RMSE_total_mean', label: 'RMSE' },
            { key: 'Shape_Corr_mean', label: t('Shape Corr', 'Shape Corr') },
            { key: 'Forecast_Score_mean', label: 'Forecast' },
          ]}
          maxHeight="150px"
        />
      </div>

      {/* Fine-tuning Effect */}
      {nb5.ftEffect && (
        <MetricGrid minimo={190}>
          <MetricStat densa etiqueta={t('Efecto del ajuste fino', 'Fine-tuning effect')}
            valor={(nb5.ftEffect.deltaR2 >= 0 ? '+' : '') + nb5.ftEffect.deltaR2.toFixed(4)}
            estado={nb5.ftEffect.deltaR2 > 0 ? 'bueno' : 'neutro'}
            nota={`ΔR² ${t('sobre el modelo base', 'over the base model')}`}
            n={nb5.ftEffect.pacientesTotal} fase="NB6" fuente={FUENTE_NB6} />
          <MetricStat densa etiqueta={t('Mejora relativa', 'Relative improvement')}
            valor={nb5.ftEffect.mejoraPct.toFixed(1)} unidad="%"
            n={nb5.ftEffect.pacientesTotal} fase="NB6" fuente={FUENTE_NB6} />
          <MetricStat densa etiqueta={t('Pacientes mejorados', 'Improved patients')}
            valor={`${nb5.ftEffect.pacientesMejorados} / ${nb5.ftEffect.pacientesTotal}`}
            nota={`${((nb5.ftEffect.pacientesMejorados / nb5.ftEffect.pacientesTotal) * 100).toFixed(1)} %`}
            fase="NB6" fuente={FUENTE_NB6} />
        </MetricGrid>
      )}

      {/* Raw Data */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={`${t('Datos Crudos LOPO', 'Raw LOPO Data')} (${filteredRaw.length})`} expanded={expandedSections.raw} onToggle={() => toggleSection('raw')} />
        {expandedSections.raw && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(filteredRaw as unknown as Record<string, unknown>[], 'nb5_lopo_raw.csv')} label="CSV" />
            </div>
            <DataTable
              fuente="/data/nb5/resultados_lopo.csv"
              data={filteredRaw as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'paciente_test', label: t('Paciente', 'Patient') },
                { key: 'Modelo', label: t('Modelo', 'Model') },
                { key: 'R2_total', label: `R\u00B2 total` },
                { key: 'R2_t1', label: `R\u00B2 t+1` },
                { key: 'R2_t2', label: `R\u00B2 t+2` },
                { key: 'R2_t3', label: `R\u00B2 t+3` },
                { key: 'RMSE_total', label: 'RMSE' },
  { key: 'Shape_Corr', label: t('Shape Corr', 'Shape Corr') },
  { key: 'Forecast_Score', label: 'Forecast' },
  { key: 'DTW_mean', label: 'DTW mean' },
  { key: 'DTW_std', label: 'DTW std' },
]}
              maxHeight="400px"
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={t('Graficas', 'Charts')} expanded={expandedSections.charts} onToggle={() => toggleSection('charts')} />
        {expandedSections.charts && (
          <>
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{`R\u00B2 ${t('medio por modelo', 'mean per model')}`}</h3>
              <PlotlyBarChart data={barData} title="" xAxisLabel={`R\u00B2`} horizontal showErrorBars height={200} />
            </div>
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{`R\u00B2 ${t('por paciente', 'per patient')}`}</h3>
              <PlotlyChart
                data={scatterData}
                layout={{
                  height: 400, margin: { l: 50, r: 20, t: 10, b: 80 },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                  font: { color: 'var(--text)', size: 10 },
                  xaxis: { title: t('Paciente', 'Patient'), tickangle: -60, type: 'category', gridcolor: 'var(--border)' },
                  yaxis: { title: `R\u00B2`, gridcolor: 'var(--border)' },
                  legend: { orientation: 'h', y: -0.35 },
                  shapes: [{ type: 'line', x0: 0, x1: 1, xref: 'paper', y0: 0, y1: 0, line: { color: '#ef4444', dash: 'dot', width: 1 } }],
                }}
                config={{ responsive: true, displayModeBar: false }} style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Temporal Degradation */}
      {nb5.temporalDeg.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Degradacion Temporal', 'Temporal Degradation')}</h3>
          <DataTable
            fuente="/data/nb5/resultados_lopo.csv"
            data={nb5.temporalDeg as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'horizonte', label: t('Horizonte', 'Horizon') },
              { key: 'r2Base', label: `R\u00B2 ${t('base', 'base')}` },
              { key: 'r2FT', label: `R\u00B2 FT` },
              { key: 'deltaVsPrev', label: '\u0394 vs prev' },
            ]}
            maxHeight="150px"
          />
        </div>
      )}

      {/* IC95 */}
      {nb5.ic95Data.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Intervalos de Confianza 95%', '95% Confidence Intervals')}</h3>
          <DataTable
            fuente="/data/nb5/resultados_lopo.csv"
            data={nb5.ic95Data as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'Modelo', label: t('Modelo', 'Model') },
              { key: 'Media', label: `R\u00B2 ${t('medio', 'mean')}` },
              { key: 'IC95_inf', label: 'IC 95% inf' },
              { key: 'IC95_sup', label: 'IC 95% sup' },
            ]}
            maxHeight="150px"
          />
        </div>
      )}

      {/* R2 Distribution */}
      {nb5.r2Distribution.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Distribucion R\u00B2', 'R\u00B2 Distribution')}</h3>
          <DataTable
            fuente="/data/nb5/resultados_lopo.csv"
            data={nb5.r2Distribution as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'rango', label: t('Rango', 'Range') },
              { key: 'base', label: 'Base' },
              { key: 'ft', label: 'FT' },
            ]}
            maxHeight="200px"
          />
        </div>
      )}
    </div>
  );
}

/* ─── NB5B Explorer ────────────────────────────────────────────── */

function NB5BExplorer({ nb5b, isDark, t, searchTerm, setSearchTerm, modelFilter, setModelFilter, expandedSections, toggleSection, handleExportCSV }: {
  nb5b: ReturnType<typeof useNB5BResults>; isDark: boolean; t: TFn;
  searchTerm: string; setSearchTerm: (v: string) => void;
  modelFilter: string; setModelFilter: (v: string) => void;
  expandedSections: Record<string, boolean>; toggleSection: (k: string) => void;
  handleExportCSV: (data: Record<string, unknown>[], fn: string) => void;
}) {
  const [metricFilter, setMetricFilter] = useState('R2');

  const filteredResumen = useMemo(() => {
    return nb5b.resumen.filter(r => {
      if (r.Metrica !== metricFilter) return false;
      if (modelFilter !== 'Todos' && r.Modelo !== modelFilter) return false;
      return true;
    });
  }, [nb5b.resumen, metricFilter, modelFilter]);

  const filteredRaw = useMemo(() => {
    return nb5b.raw.filter(r => {
      if (modelFilter !== 'Todos' && r.Modelo !== modelFilter) return false;
      if (searchTerm && !String(r.paciente_test).includes(searchTerm)) return false;
      return true;
    });
  }, [nb5b.raw, modelFilter, searchTerm]);

  const uniqueModels = useMemo(() => [...new Set(nb5b.raw.map(r => r.Modelo))], [nb5b.raw]);
  const uniqueMetrics = useMemo(() => [...new Set(nb5b.resumen.map(r => r.Metrica))], [nb5b.resumen]);

  const kpis = useMemo(() => {
    const r2Rows = nb5b.mejoresModelos;
    if (r2Rows.length === 0) return null;
    const best = r2Rows[0];
    const mean = r2Rows.reduce((s, r) => s + r.Media, 0) / r2Rows.length;
    return { bestModel: best.Modelo, bestR2: best.Media, meanR2: mean, n: nb5b.totalEvals };
  }, [nb5b]);

  const barData = useMemo(() => {
    return filteredResumen.sort((a, b) => b.Media - a.Media).map(r => ({
      name: r.Modelo, value: r.Media, error: r.Std,
      color: MODEL_COLORS[r.Modelo] || '#6b7280',
    }));
  }, [filteredResumen]);

  const scatterData = useMemo(() => {
    if (filteredRaw.length === 0) return [];
    const grouped: Record<string, { x: string[]; y: number[] }> = {};
    filteredRaw.forEach(r => {
      if (!grouped[r.Modelo]) grouped[r.Modelo] = { x: [], y: [] };
      grouped[r.Modelo].x.push(`P${r.paciente_test}`);
      grouped[r.Modelo].y.push(r.R2);
    });
    return Object.entries(grouped).map(([modelo, d]) => ({
      type: 'scatter' as const, mode: 'markers' as const, name: modelo,
      x: d.x, y: d.y,
      marker: { color: MODEL_COLORS[modelo] || '#6b7280', size: 6 },
    }));
  }, [filteredRaw]);

  return (
    <div>
      <BarraFiltros>
        <Busqueda rotulo={t('Buscar', 'Search')} valor={searchTerm} onChange={setSearchTerm} marcador={t('Buscar paciente...', 'Search patient...')} />
        <Selector rotulo={t('Modelo', 'Model')} valor={modelFilter} onChange={setModelFilter} opciones={['Todos', ...uniqueModels]} />
        <Selector rotulo={t('Metrica', 'Metric')} valor={metricFilter} onChange={setMetricFilter} opciones={uniqueMetrics} />
        <RecuentoFiltro>
          {filteredRaw.length} {t('de', 'of')} {nb5b.raw.length} {t('filas', 'rows')}
        </RecuentoFiltro>
      </BarraFiltros>

      {kpis && (
        <MetricGrid minimo={190}>
          <MetricStat densa etiqueta={t('Evaluaciones LOPO', 'LOPO evaluations')} valor={kpis.n} fase="NB5B" fuente={FUENTE_NB5B} />
          <MetricStat densa etiqueta={t('Mejor modelo', 'Best model')} valor={kpis.bestModel} estado="bueno"
            nota={`R² = ${kpis.bestR2.toFixed(4)}`} fase="NB5B" fuente={FUENTE_NB5B} />
          <MetricStat densa etiqueta={t('R² medio global', 'Global mean R²')} valor={kpis.meanR2.toFixed(4)}
            n={kpis.n} fase="NB5B" fuente={FUENTE_NB5B} />
          <MetricStat densa etiqueta={t('Gap mínimo', 'Minimum gap')}
            valor={nb5b.gapMinimo?.GAP?.toFixed(4) ?? null}
            nota={nb5b.gapMinimo?.Modelo ?? undefined} fase="NB5B" fuente={FUENTE_NB5B} />
        </MetricGrid>
      )}

      {/* Resumen */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Tabla Resumen', 'Summary Table')}, {metricFilter}</h3>
        <DataTable
          fuente="/data/nb5b/tabla_resumen_v2.csv"
          data={filteredResumen as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'Modelo', label: t('Modelo', 'Model') },
            { key: 'Media', label: t('Media', 'Mean') },
            { key: 'Std', label: '\u03C3' },
            { key: 'Min', label: 'Min' },
            { key: 'Max', label: 'Max' },
          ]}
          maxHeight="300px"
        />
      </div>

      {/* FT Effect */}
      {nb5b.ftEffect.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Efecto Fine-Tuning', 'Fine-Tuning Effect')}</h3>
          <DataTable
            fuente="/data/nb5b/resultados_lopo_v2.csv"
            data={nb5b.ftEffect as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'modeloBase', label: t('Modelo base', 'Base model') },
              { key: 'r2Base', label: `R\u00B2 base` },
              { key: 'r2FT', label: `R\u00B2 FT` },
              { key: 'deltaR2', label: '\u0394R\u00B2' },
              { key: 'mejoraPct', label: '% mejora' },
            ]}
            maxHeight="200px"
          />
        </div>
      )}

      {/* Raw Data */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={`${t('Datos Crudos LOPO', 'Raw LOPO Data')} (${filteredRaw.length})`} expanded={expandedSections.raw} onToggle={() => toggleSection('raw')} />
        {expandedSections.raw && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(filteredRaw as unknown as Record<string, unknown>[], 'nb5b_lopo_raw.csv')} label="CSV" />
            </div>
            <DataTable
              data={filteredRaw as unknown as Record<string, unknown>[]}
              fuente="/data/nb5b/resultados_lopo_v2.csv"
              columns={[
                { key: 'paciente_test', label: t('Paciente', 'Patient') },
                { key: 'Modelo', label: t('Modelo', 'Model') },
                { key: 'R2', label: `R\u00B2` },
                { key: 'R2_train', label: `R\u00B2 train` },
              ]}
              maxHeight="400px"
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader title={t('Graficas', 'Charts')} expanded={expandedSections.charts} onToggle={() => toggleSection('charts')} />
        {expandedSections.charts && (
          <>
            {barData.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{`${metricFilter} ${t('por modelo', 'per model')}`}</h3>
                <PlotlyBarChart data={barData} title="" xAxisLabel={metricFilter} horizontal showErrorBars height={Math.max(200, barData.length * 40)} />
              </div>
            )}
            {scatterData.length > 0 && (
              <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{`R\u00B2 ${t('por paciente', 'per patient')}`}</h3>
                <PlotlyChart
                  data={scatterData}
                  layout={{
                    height: 400, margin: { l: 50, r: 20, t: 10, b: 80 },
                    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                    font: { color: 'var(--text)', size: 10 },
                    xaxis: { title: t('Paciente', 'Patient'), tickangle: -60, type: 'category', gridcolor: 'var(--border)' },
                    yaxis: { title: `R\u00B2`, gridcolor: 'var(--border)' },
                    legend: { orientation: 'h', y: -0.35 },
                    shapes: [{ type: 'line', x0: 0, x1: 1, xref: 'paper', y0: 0, y1: 0, line: { color: '#ef4444', dash: 'dot', width: 1 } }],
                  }}
                  config={{ responsive: true, displayModeBar: false }} style={{ width: '100%' }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* IC95 */}
      {nb5b.ic95Data.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Intervalos de Confianza 95%', '95% Confidence Intervals')}</h3>
          <DataTable
            data={nb5b.ic95Data as unknown as Record<string, unknown>[]}
            fuente="/data/nb5b/tabla_resumen_v2.csv"
            columns={[
              { key: 'Modelo', label: t('Modelo', 'Model') },
              { key: 'Media', label: `R\u00B2 ${t('medio', 'mean')}` },
              { key: 'IC95_inf', label: 'IC 95% inf' },
              { key: 'IC95_sup', label: 'IC 95% sup' },
            ]}
            maxHeight="250px"
          />
        </div>
      )}

      {/* Gap Data */}
      {nb5b.gapData.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>{t('Gap Train-Test', 'Train-Test Gap')}</h3>
          <DataTable
            fuente="/data/nb5b/resultados_lopo_v2.csv"
            data={nb5b.gapData as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'Modelo', label: t('Modelo', 'Model') },
              { key: 'R2_train', label: `R\u00B2 train` },
              { key: 'R2_test', label: `R\u00B2 test` },
              { key: 'GAP', label: 'Gap' },
            ]}
            maxHeight="200px"
          />
        </div>
      )}
    </div>
  );
}

/* ─── NB7 Explorer ────────────────────────────────────────────── */

/**
 * Explorador del experimento 7. Aquí no se cuenta la historia —eso lo hace la
 * página de Experimentos—: se dan las filas para que alguien las mire y las baje.
 *
 * Carga sus propios datos y no entra en la espera general de la página. Son cinco
 * archivos que solo hacen falta si se abre esta pestaña, y meterlos en el bloqueo
 * de arriba retrasaría las seis pestañas que no los necesitan.
 */
function NB7Explorer({ t, expandedSections, toggleSection, handleExportCSV }: {
  t: TFn;
  expandedSections: Record<string, boolean>; toggleSection: (k: string) => void;
  handleExportCSV: (data: Record<string, unknown>[], fn: string) => void;
}) {
  const { datos, cargando, error } = useNB7HPResults();
  const [arq, setArq] = useState<'CNN_GRU_ATTN' | 'GRU'>('CNN_GRU_ATTN');
  const [modeloTrad, setModeloTrad] = useState('Todos');

  const configs = datos ? datos.configs[arq] : [];
  const hpCols = datos ? datos.hpColumnas[arq] : [];

  /** Las columnas `hp_*` van anidadas en `hp`; aquí se aplanan para la tabla. */
  const filasConfig = useMemo(
    () => configs.map(f => ({
      combinacion: f.combinacion,
      en_uso: f.esBase ? 'sí' : '',
      r2_val_medio: f.r2ValMedio,
      r2_val_std: f.r2ValStd,
      minutos: f.minutos,
      ...f.hp,
    })),
    [configs],
  );

  const filasTrad = useMemo(() => {
    if (!datos) return [];
    return datos.tradPorPaciente.filter(
      f => modeloTrad === 'Todos' || f.modelo === modeloTrad);
  }, [datos, modeloTrad]);

  const dispersión = useMemo(() => {
    if (configs.length === 0) return null;
    const v = configs.map(f => f.r2ValMedio);
    return { min: Math.min(...v), max: Math.max(...v), recorrido: Math.max(...v) - Math.min(...v) };
  }, [configs]);

  if (cargando) {
    return (
      <div role="status" aria-live="polite" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '16px' }}>{t('Cargando la búsqueda de hiperparámetros…', 'Loading the hyperparameter search…')}</p>
      </div>
    );
  }
  if (error || !datos) {
    return (
      <div className="card" style={{ padding: '24px', color: 'var(--alert)' }}>
        {error ?? t('El hook no devolvió datos.', 'The hook returned no data.')}
        <div style={{ marginTop: '8px', fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: 'var(--text-sub)' }}>
          {FUENTES_NB7HP.dlResumen} · {FUENTES_NB7HP.tradResumen}
        </div>
      </div>
    );
  }

  const a = datos.dl[arq];

  return (
    <div>
      <BarraFiltros>
        <Selector
          rotulo={t('Arquitectura', 'Architecture')}
          valor={arq}
          onChange={(v) => setArq(v as 'CNN_GRU_ATTN' | 'GRU')}
          opciones={['CNN_GRU_ATTN', 'GRU']}
          anchoMinimo={150}
        />
        <Selector
          rotulo={t('Modelo tradicional', 'Traditional model')}
          valor={modeloTrad}
          onChange={setModeloTrad}
          opciones={['Todos', ...datos.tradModelos]}
        />
        <RecuentoFiltro>
          {configs.length} {t('configuraciones', 'configurations')} · {filasTrad.length} {t('filas por paciente', 'per-patient rows')}
        </RecuentoFiltro>
      </BarraFiltros>

      <MetricGrid minimo={178}>
        <MetricStat densa etiqueta={t('Configuraciones', 'Configurations')} valor={configs.length}
          nota={t('por arquitectura', 'per architecture')} fase="NB7" fuente={FUENTES_NB7HP.dlConfigs[arq]} />
        <MetricStat densa etiqueta={t('R² en uso', 'R² in use')} valor={a.r2_base_media.toFixed(4)}
          dispersion={a.r2_base_std.toFixed(4)} n={a.n_pacientes} fase="NB7" fuente={FUENTES_NB7HP.dlResumen} />
        <MetricStat densa etiqueta={t('R² mejor', 'Best R²')} valor={a.r2_opt_media.toFixed(4)}
          dispersion={a.r2_opt_std.toFixed(4)} n={a.n_pacientes} fase="NB7" fuente={FUENTES_NB7HP.dlResumen} />
        <MetricStat densa etiqueta="Δ R²" valor={`${a.delta_medio >= 0 ? '+' : '−'}${Math.abs(a.delta_medio).toFixed(4)}`}
          referencia={`${a.mejora_relativa_pct.toFixed(2)} % relativo`} n={a.n_pacientes}
          fase="NB7" fuente={FUENTES_NB7HP.dlResumen} />
        <MetricStat densa etiqueta="Wilcoxon p" valor={a.wilcoxon_p >= 0.01 ? a.wilcoxon_p.toFixed(4) : a.wilcoxon_p.toPrecision(3)}
          estado={a.significativo_005 ? 'bueno' : 'atencion'}
          referencia={`W = ${a.wilcoxon_W.toFixed(1)}`} n={a.n_pacientes}
          fase="NB7" fuente={FUENTES_NB7HP.dlResumen} />
        <MetricStat densa etiqueta={t('Recorrido del R²', 'R² range')}
          valor={dispersión ? dispersión.recorrido.toFixed(4) : null}
          referencia={dispersión ? `${dispersión.min.toFixed(4)} – ${dispersión.max.toFixed(4)}` : undefined}
          n={configs.length} fase="NB7" fuente={FUENTES_NB7HP.dlConfigs[arq]} />
        <MetricStat densa etiqueta={t('Cómputo', 'Compute')} valor={datos.minutosTotales[arq].toFixed(1)} unidad="min"
          n={configs.length} fase="NB7" fuente={FUENTES_NB7HP.dlConfigs[arq]} />
      </MetricGrid>

      {/* Configuraciones evaluadas */}
      <div style={{ marginBottom: '24px', marginTop: '20px' }}>
        <SectionHeader
          title={`${t('Configuraciones evaluadas', 'Evaluated configurations')} (${filasConfig.length})`}
          expanded={expandedSections.raw}
          onToggle={() => toggleSection('raw')}
        />
        {expandedSections.raw && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(filasConfig as unknown as Record<string, unknown>[], `nb7_configs_${arq}.csv`)} label="CSV" />
            </div>
            <DataTable
              fuente={FUENTES_NB7HP.dlConfigs[arq]}
              caption={t('«en uso» marca la configuración que el proyecto ya empleaba', '"en uso" marks the configuration the project already used')}
              data={filasConfig as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'combinacion', label: '#', align: 'right' },
                { key: 'en_uso', label: t('En uso', 'In use'), align: 'center' },
                { key: 'r2_val_medio', label: 'R² val', align: 'right' },
                { key: 'r2_val_std', label: 'σ', align: 'right' },
                { key: 'minutos', label: 'min', align: 'right' },
                ...hpCols.map(c => ({ key: c, label: c.replace(/^hp_/, ''), align: 'right' as const })),
              ]}
              maxHeight="420px"
            />
          </div>
        )}
      </div>

      {/* Sensibilidad */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader
          title={`${t('Sensibilidad por hiperparámetro', 'Sensitivity per hyperparameter')} (${datos.sensibilidad[arq].length})`}
          expanded={expandedSections.charts}
          onToggle={() => toggleSection('charts')}
        />
        {expandedSections.charts && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(datos.sensibilidad[arq] as unknown as Record<string, unknown>[], `nb7_sensibilidad_${arq}.csv`)} label="CSV" />
            </div>
            <DataTable
              fuente={FUENTES_NB7HP.dlSensibilidad[arq]}
              caption={t('n es el número de configuraciones que usaron ese valor; el recorrido se repite en todas las filas del mismo hiperparámetro', 'n is the number of configurations that used that value; the range repeats across rows of the same hyperparameter')}
              data={datos.sensibilidad[arq] as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'hiperparametro', label: t('Hiperparámetro', 'Hyperparameter') },
                { key: 'valor', label: t('Valor', 'Value') },
                { key: 'r2Medio', label: 'R² medio', align: 'right' },
                { key: 'n', label: 'n', align: 'right' },
                { key: 'rango', label: t('Recorrido', 'Range'), align: 'right' },
              ]}
              maxHeight="340px"
            />
          </div>
        )}
      </div>

      {/* Modelos tradicionales por paciente */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader
          title={`${t('Modelos tradicionales, paciente a paciente', 'Traditional models, per patient')} (${filasTrad.length})`}
          expanded={expandedSections.patient}
          onToggle={() => toggleSection('patient')}
        />
        {expandedSections.patient && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(filasTrad as unknown as Record<string, unknown>[], 'nb7_tradicionales_por_paciente.csv')} label="CSV" />
            </div>
            <DataTable
              fuente={FUENTES_NB7HP.tradPorPaciente}
              data={filasTrad as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'modelo', label: t('Modelo', 'Model') },
                { key: 'paciente', label: t('Paciente', 'Patient') },
                { key: 'r2TestBase', label: 'R² base', align: 'right' },
                { key: 'r2TestOpt', label: 'R² optimizado', align: 'right' },
                { key: 'deltaR2', label: 'Δ R²', align: 'right' },
              ]}
              maxHeight="380px"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── NB8 Explorer ────────────────────────────────────────────── */

/**
 * Explorador del experimento 8: error por clase AAMI y detección paciente a
 * paciente.
 *
 * La columna que de verdad hay que poder mirar fila a fila es la precisión: la
 * media entre pacientes tapa que hay pliegues con precisión casi nula junto a
 * pliegues altos. Por eso la tabla por paciente sale completa y exportable.
 */
function NB8Explorer({ t, searchTerm, setSearchTerm, expandedSections, toggleSection, handleExportCSV }: {
  t: TFn;
  searchTerm: string; setSearchTerm: (v: string) => void;
  expandedSections: Record<string, boolean>; toggleSection: (k: string) => void;
  handleExportCSV: (data: Record<string, unknown>[], fn: string) => void;
}) {
  const nb8 = useNB8Results();
  const [base, setBase] = useState('Todas');

  const filasDeteccion = useMemo(() => nb8.deteccion.filter(f => {
    if (base !== 'Todas' && f.base !== base) return false;
    if (searchTerm && !String(f.paciente).includes(searchTerm)) return false;
    return true;
  }), [nb8.deteccion, base, searchTerm]);

  if (nb8.cargando) {
    return (
      <div role="status" aria-live="polite" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '16px' }}>{t('Cargando la detección de evento…', 'Loading event detection…')}</p>
      </div>
    );
  }
  if (nb8.error) {
    return (
      <div className="card" style={{ padding: '24px', color: 'var(--alert)' }}>
        {nb8.error}
        <div style={{ marginTop: '8px', fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: 'var(--text-sub)' }}>
          {FUENTE_CLASES} · {FUENTE_DETECCION}
        </div>
      </div>
    );
  }

  const p4 = nb8.resumenP4;

  return (
    <div>
      <BarraFiltros>
        <Busqueda
          rotulo={t('Buscar', 'Search')}
          valor={searchTerm}
          onChange={setSearchTerm}
          marcador={t('Paciente…', 'Patient…')}
        />
        <Selector
          rotulo={t('Base', 'Database')}
          valor={base}
          onChange={setBase}
          opciones={['Todas', ...nb8.basesDeteccion.map(b => b.base)]}
        />
        <RecuentoFiltro>
          {filasDeteccion.length} {t('de', 'of')} {nb8.deteccion.length} {t('pliegues', 'folds')}
        </RecuentoFiltro>
      </BarraFiltros>

      <MetricGrid minimo={178}>
        <MetricStat densa etiqueta="AUC-PR" valor={p4 ? p4.auc_pr.toFixed(4) : null}
          referencia={p4 ? `${p4.ganancia.toFixed(2)}× sobre la prevalencia` : undefined}
          n={p4?.n_latidos} fase="NB8" fuente={FUENTE_RESUMEN_P4} />
        <MetricStat densa etiqueta={t('Prevalencia', 'Prevalence')} valor={p4 ? `${(p4.prevalencia * 100).toFixed(2)} %` : null}
          referencia={p4 ? `${p4.n_ectopicos.toLocaleString('es')} ectópicos` : undefined}
          n={p4?.n_latidos} fase="NB8" fuente={FUENTE_RESUMEN_P4} />
        <MetricStat densa etiqueta={t('Pliegues', 'Folds')} valor={p4?.n_pacientes ?? null}
          nota={nb8.pacientesSinDeteccion.length > 0
            ? `${nb8.pacientesSinDeteccion.length} ${t('sin fila de detección', 'without a detection row')}`
            : undefined}
          fase="NB8" fuente={FUENTE_RESUMEN_P4} />
        <MetricStat densa etiqueta={t('Precisión, mediana', 'Precision, median')}
          valor={nb8.dispersion.precision ? nb8.dispersion.precision.mediana.toFixed(4) : null}
          referencia={nb8.dispersion.precision
            ? `RIC ${nb8.dispersion.precision.p25.toFixed(3)} – ${nb8.dispersion.precision.p75.toFixed(3)}`
            : undefined}
          n={nb8.dispersion.precision?.n} fase="NB8" fuente={FUENTE_DETECCION} />
        <MetricStat densa etiqueta={t('Exhaustividad, mediana', 'Recall, median')}
          valor={nb8.dispersion.exhaustividad ? nb8.dispersion.exhaustividad.mediana.toFixed(4) : null}
          referencia={nb8.dispersion.exhaustividad
            ? `${nb8.dispersion.exhaustividad.min.toFixed(3)} – ${nb8.dispersion.exhaustividad.max.toFixed(3)}`
            : undefined}
          n={nb8.dispersion.exhaustividad?.n} fase="NB8" fuente={FUENTE_DETECCION} />
        <MetricStat densa etiqueta={t('Razón MSE ectópico/normal', 'Ectopic/normal MSE ratio')}
          valor={nb8.contraste ? nb8.contraste.razon.toFixed(4) : null}
          referencia={nb8.contraste ? `U = ${nb8.contraste.U.toExponential(3)}` : undefined}
          n={nb8.contraste?.n_total} fase="NB8" fuente={FUENTE_CONTRASTE} />
      </MetricGrid>

      {/* Error por clase AAMI */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', marginTop: '20px' }}>
        <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>
          {t('Error por clase AAMI', 'Error per AAMI class')}
        </h3>
        <DataTable
          fuente={FUENTE_CLASES}
          caption={t('La razón y el Δ de correlación se calculan contra la clase N, no se leen del archivo', 'The ratio and correlation Δ are computed against class N, not read from the file')}
          porPagina={0}
          data={nb8.clases as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'clase_aami', label: 'Clase' },
            { key: 'grupo', label: 'Grupo' },
            { key: 'n', label: 'n', align: 'right' },
            { key: 'pct', label: '%', align: 'right' },
            { key: 'mse_media', label: 'MSE medio', align: 'right' },
            { key: 'mse_mediana', label: 'MSE mediana', align: 'right' },
            { key: 'shape_corr_media', label: 'Corr. forma', align: 'right' },
            { key: 'razonMseVsNormal', label: 'MSE / N', align: 'right' },
          ]}
          maxHeight="300px"
        />
      </div>

      {/* Detección por paciente */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader
          title={`${t('Detección por paciente', 'Detection per patient')} (${filasDeteccion.length})`}
          expanded={expandedSections.raw}
          onToggle={() => toggleSection('raw')}
        />
        {expandedSections.raw && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <ExportBtn onClick={() => handleExportCSV(filasDeteccion as unknown as Record<string, unknown>[], 'nb8_deteccion_por_paciente.csv')} label="CSV" />
            </div>
            <DataTable
              fuente={FUENTE_DETECCION}
              caption={t('Cada fila es un pliegue: el umbral es común y las cifras son de ese paciente', 'Each row is one fold: the threshold is shared and the figures are that patient’s')}
              data={filasDeteccion as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'paciente', label: t('Paciente', 'Patient') },
                { key: 'base', label: 'Base' },
                { key: 'n', label: t('Latidos', 'Beats'), align: 'right' },
                { key: 'n_ectopicos', label: t('Ectópicos', 'Ectopic'), align: 'right' },
                { key: 'VP', label: 'VP', align: 'right' },
                { key: 'FP', label: 'FP', align: 'right' },
                { key: 'FN', label: 'FN', align: 'right' },
                { key: 'precision', label: t('Precisión', 'Precision'), align: 'right' },
                { key: 'exhaustividad', label: t('Exhaustividad', 'Recall'), align: 'right' },
                { key: 'f1', label: 'F1', align: 'right' },
                { key: 'ap', label: 'AP', align: 'right' },
              ]}
              maxHeight="420px"
            />
          </div>
        )}
      </div>

      {/* Salvedad de derivaciones */}
      {nb8.salvedad.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <SectionHeader
            title={`${t('Salvedad de derivaciones', 'Lead caveat')} (${nb8.salvedad.length})`}
            expanded={expandedSections.overfit}
            onToggle={() => toggleSection('overfit')}
          />
          {expandedSections.overfit && (
            <div className="card" style={{ padding: '16px' }}>
              <DataTable
                fuente={FUENTE_SALVEDAD}
                porPagina={0}
                data={nb8.salvedad as unknown as Record<string, unknown>[]}
                columns={Object.keys(nb8.salvedad[0] ?? {}).map(k => ({
                  key: k,
                  label: k.replace(/_/g, ' '),
                }))}
                maxHeight="260px"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExploradorPage;
