import { useState, useRef, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useLang } from '@/i18n';
import type { TFn } from '@/i18n';
import {
  ChevronDown, Download, BookOpen, Home, Brain, Activity, FlaskConical,
  Search, BarChart2, Zap, BookText, Monitor, Server, Database, Settings,
  Play, Pause, RotateCcw, Sun, Moon, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Info, FileText, Layers, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────── Helpers / Sub-components ─────────────────────── */

const S = {
  sectionTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-lg)',
    color: 'var(--text)', marginBottom: '8px', scrollMarginTop: '24px',
  } as React.CSSProperties,
  sectionSub: {
    fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)',
    lineHeight: 1.65, marginBottom: '20px',
  } as React.CSSProperties,
  h3: {
    fontFamily: 'var(--font-section)', fontWeight: 600, fontSize: 'var(--fs-base)',
    color: 'var(--text)', marginTop: '24px', marginBottom: '10px',
  } as React.CSSProperties,
  h4: {
    fontFamily: 'var(--font-section)', fontWeight: 600, fontSize: 'var(--fs-sm)',
    color: 'var(--text)', marginTop: '16px', marginBottom: '8px',
  } as React.CSSProperties,
  body: {
    fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)',
    lineHeight: 1.7,
  } as React.CSSProperties,
  mono: {
    fontFamily: 'var(--font-data)', fontSize: 'var(--fs-xs)', background: 'var(--elevated)',
    padding: '2px 6px', borderRadius: '4px', color: 'var(--text)',
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
    fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', fontWeight: 600,
    background: `${color}22`, color, border: `1px solid ${color}44`,
  }) as React.CSSProperties,
  table: {
    width: '100%', borderCollapse: 'collapse' as const, fontFamily: 'var(--font-body)',
    fontSize: 'var(--fs-xs)',
  },
  th: {
    textAlign: 'left' as const, padding: '8px 10px', fontWeight: 600,
    borderBottom: '2px solid var(--border)', color: 'var(--text)', fontSize: 'var(--fs-xs)',
    fontFamily: 'var(--font-data)',
  },
  td: {
    padding: '7px 10px', borderBottom: '1px solid var(--border)',
    color: 'var(--text-sub)', fontSize: 'var(--fs-xs)',
  },
};

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '6px' }}>
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--prediction)', marginTop: '7px', flexShrink: 0 }} />
      <span style={S.body}>{children}</span>
    </div>
  );
}

function NumberedStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)',
        border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', fontWeight: 700, color: 'var(--prediction)',
        flexShrink: 0, marginTop: '1px',
      }}>
        {n}
      </div>
      <span style={S.body}>{children}</span>
    </div>
  );
}

function InfoBox({ children, type = 'info', t }: { children: React.ReactNode; type?: 'info' | 'warning' | 'tip'; t: TFn }) {
  const colors = { info: '#3b82f6', warning: '#f59e0b', tip: '#10b981' };
  const icons = { info: <Info size={14} />, warning: <AlertTriangle size={14} />, tip: <CheckCircle2 size={14} /> };
  const labels = { info: t('Nota', 'Note'), warning: t('Importante', 'Important'), tip: t('Consejo', 'Tip') };
  const c = colors[type];
  return (
    <div style={{
      display: 'flex', gap: '12px', padding: '12px 16px', borderRadius: 'var(--radius-md)',
      background: `${c}08`, border: `1px solid ${c}30`, marginBottom: '14px', alignItems: 'flex-start',
    }}>
      <div style={{ color: c, flexShrink: 0, marginTop: '2px' }}>{icons[type]}</div>
      <div>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {labels[type]}
        </span>
        <div style={{ ...S.body, marginTop: '4px' }}>{children}</div>
      </div>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--fs-sm)',
        color: 'var(--text)', textAlign: 'left',
      }}>
        {title}
        <ChevronDown size={16} color="var(--text-muted)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingBottom: '16px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── Table of Contents data ─────────────────────── */

const getTOC = (t: TFn) => [
  { id: 'overview',      label: t('1. Descripción General del Sistema', '1. System Overview') },
  { id: 'requirements',  label: t('2. Requisitos del Sistema', '2. System Requirements') },
  { id: 'installation',  label: t('3. Instalación y Ejecución', '3. Installation and Execution') },
  { id: 'interface',     label: t('4. Interfaz de Usuario', '4. User Interface') },
  { id: 'home',          label: t('5. Página de Inicio (Home)', '5. Home Page') },
  { id: 'modelos',       label: t('6. Catálogo de Modelos', '6. Model Catalog') },
  { id: 'lopo',          label: t('7. Predicción LOPO', '7. LOPO Prediction') },
  { id: 'experimentos',  label: t('8. Experimentos', '8. Experiments') },
  { id: 'explorador',    label: t('9. Explorador de Resultados', '9. Results Explorer') },

  { id: 'cohorte',       label: t('10. Cohorte y Método', '10. Cohort and Method') },
  { id: 'glosario',      label: t('11. Glosario', '11. Glossary') },
  { id: 'metrics-ref',   label: t('12. Referencia de Métricas', '12. Metrics Reference') },
  { id: 'filters-ref',   label: t('13. Filtros de Preprocesamiento', '13. Preprocessing Filters') },
  { id: 'api',           label: t('14. API Backend', '14. API Backend') },
  { id: 'troubleshoot',  label: t('15. Resolución de Problemas', '15. Troubleshooting') },
  { id: 'faq',           label: t('16. Preguntas Frecuentes', '16. FAQ') },
];

/* ─────────────────────── Main component ─────────────────────── */

export function ManualPage() {
  const [tocOpen, setTocOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const topRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();
  const TOC = getTOC(t);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );

    TOC.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [TOC]);

  return (
    <PageWrapper accentColor="rgba(79,142,247,0.04)">
      <div ref={topRef} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '8px' }}>{t('Documentación Completa', 'Complete Documentation')}</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-xl)', color: 'var(--text)' }}>
            {t('Manual de Usuario', 'User Manual')}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '6px' }}>
            ECG Forecasting Dashboard — {t('Versión', 'Version')} 1.0 · Universidad CESMAG · 2025
          </p>
        </div>
      </div>

      {/* ── Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Columna Izquierda: Menú Lateral Fijo (Escritorio) */}
        <aside className="hidden lg:flex flex-col gap-1 sticky top-[90px] max-h-[calc(100vh-140px)] overflow-y-auto pr-4 border-r border-[var(--border)] select-none">
          <div style={{
            padding: '8px 12px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-sub)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
          }}>
            {t('Contenido', 'Contents')}
          </div>
          {TOC.map(item => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: active ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  color: active ? 'var(--prediction)' : 'var(--text-sub)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--fs-xs)',
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s ease',
                  borderLeft: active ? '3px solid var(--prediction)' : '3px solid transparent',
                  paddingLeft: active ? '9px' : '12px',
                }}
                className="hover:bg-[rgba(6,182,212,0.05)] hover:text-[var(--text)]"
              >
                {item.label}
              </button>
            );
          })}
        </aside>

        {/* Columna Derecha: Contenido del Manual */}
        <div className="min-w-0">
          {/* Tabla de contenidos móvil (oculta en escritorio) */}
          <div className="card block lg:hidden" style={{ marginBottom: '28px' }}>
            <button onClick={() => setTocOpen(!tocOpen)} style={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="var(--prediction)" />
                <span style={{ fontFamily: 'var(--font-section)', fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                  {t('Tabla de Contenidos', 'Table of Contents')}
                </span>
              </div>
              <ChevronDown size={16} color="var(--text-muted)" style={{ transform: tocOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            <AnimatePresence>
              {tocOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '4px 24px', marginTop: '16px' }}>
                    {TOC.map(t => (
                      <button key={t.id} onClick={() => scrollTo(t.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        padding: '5px 0', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)',
                        color: 'var(--text-sub)', transition: 'color 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--prediction)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-sub)')}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 1 — DESCRIPCIÓN GENERAL
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="overview">
        <h2 style={S.sectionTitle}>{t('1. Descripción General del Sistema', '1. System Overview')}</h2>
        <p style={S.sectionSub}>
          {t('El ', 'The ')}<strong>ECG Forecasting Dashboard</strong>{t(' es una aplicación web interactiva desarrollada como parte del proyecto de investigación «Predicción de arritmias cardíacas a partir de señales de electrocardiograma utilizando modelos de forecasting basados en redes neuronales recurrentes», realizado en la ', ' is an interactive web application developed as part of the research project «Prediction of cardiac arrhythmias from electrocardiogram signals using forecasting models based on recurrent neural networks», carried out at ')}<strong>Universidad CESMAG</strong>{t(', programa de Ingeniería de Sistemas (2025-2026).', ', Systems Engineering program (2025-2026).')}
        </p>

        <h3 style={S.h3}>{t('1.1 Propósito', '1.1 Purpose')}</h3>
        <p style={S.body}>
          {t('El sistema permite visualizar, analizar y comparar los resultados de cinco etapas experimentales de predicción de señales ECG, así como realizar predicciones interactivas en tiempo real sobre registros reales de pacientes. Está diseñado para uso académico, investigativo y de demostración ante comités evaluadores.', 'The system allows visualizing, analyzing and comparing the results of five experimental stages of ECG signal prediction, as well as performing interactive real-time predictions on real patient records. It is designed for academic, research and demonstration use before evaluation committees.')}
        </p>

        <h3 style={S.h3}>{t('1.2 Arquitectura', '1.2 Architecture')}</h3>
        <p style={S.body}>{t('La aplicación se compone de dos módulos principales desplegados mediante contenedores Docker:', 'The application consists of two main modules deployed via Docker containers:')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', marginBottom: '14px' }}>
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Monitor size={14} color="var(--prediction)" />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text)' }}>Frontend</span>
            </div>
            <p style={{ ...S.body, fontSize: 'var(--fs-xs)' }}>React 18 + TypeScript + Vite. {t('Interfaz responsiva con tema claro/oscuro. Gráficos interactivos con Plotly.js. Puerto', 'Responsive interface with light/dark theme. Interactive charts with Plotly.js. Port')} <span style={S.mono}>80</span>.</p>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Server size={14} color="#10b981" />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text)' }}>Backend</span>
            </div>
            <p style={{ ...S.body, fontSize: 'var(--fs-xs)' }}>FastAPI (Python). {t('Carga modelos TensorFlow/Keras. Procesa señales ECG, segmenta latidos y genera predicciones. Puerto', 'Loads TensorFlow/Keras models. Processes ECG signals, segments beats and generates predictions. Port')} <span style={S.mono}>8000</span>.</p>
          </div>
        </div>

        <h3 style={S.h3}>{t('1.3 Base de Datos', '1.3 Database')}</h3>
        <p style={S.body}>
          {t('Se utiliza la base de datos ', 'The ')}<strong>MIT-BIH Arrhythmia Database</strong>{t(' de PhysioNet, el estándar de referencia mundial para investigación en ECG. Contiene ', ' from PhysioNet is used, the worldwide reference standard for ECG research. It contains ')}<strong>48 {t('registros', 'records')}</strong>{t(' de aproximadamente 30 minutos cada uno, muestreados a ', ' of approximately 30 minutes each, sampled at ')}<strong>360 Hz</strong>{t(', con anotaciones de arritmia realizadas por cardiólogos expertos. Canal principal: ', ', with arrhythmia annotations by expert cardiologists. Main channel: ')}<strong>MLII</strong>{t('. Adicionalmente, se emplea la base ', '. Additionally, the ')}<strong>INCART</strong>{t(' (75 registros, 257 Hz) como validación externa en el experimento NB5B.', ' database (75 records, 257 Hz) is used as external validation in experiment NB5B.')}
        </p>

        <h3 style={S.h3}>{t('1.4 Etapas Experimentales (Notebooks)', '1.4 Experimental Stages (Notebooks)')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Notebook</th>
                <th style={S.th}>{t('Nombre', 'Name')}</th>
                <th style={S.th}>{t('Descripción', 'Description')}</th>
                <th style={S.th}>{t('Mejor Resultado', 'Best Result')}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={S.td}><span style={S.mono}>NB1</span></td><td style={S.td}>{t('Modelos Tradicionales', 'Traditional Models')}</td><td style={S.td}>{t('RF, SVR, MLP, DT, LinReg, ARIMA — evaluados por paciente individual', 'RF, SVR, MLP, DT, LinReg, ARIMA — evaluated per individual patient')}</td><td style={S.td}>RF: R² = 0.6264 (Exp B)</td></tr>
              <tr><td style={S.td}><span style={S.mono}>NB2</span></td><td style={S.td}>Deep Learning</td><td style={S.td}>{t('LSTM, GRU, CNN-LSTM, CNN-GRU — evaluados por paciente individual', 'LSTM, GRU, CNN-LSTM, CNN-GRU — evaluated per individual patient')}</td><td style={S.td}>GRU/LSTM: R² = 0.6592 (Exp B)</td></tr>
              <tr><td style={S.td}><span style={S.mono}>NB3</span></td><td style={S.td}>{t('Evaluación Cruzada', 'Cross Evaluation')}</td><td style={S.td}>{t('Comparación entre notebooks — Exp A, B y C (escenario clínico)', 'Comparison between notebooks — Exp A, B and C (clinical scenario)')}</td><td style={S.td}>{t('Evaluación integrada', 'Integrated evaluation')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>NB4B</span></td><td style={S.td}>{t('Multi-Sujeto', 'Multi-Subject')}</td><td style={S.td}>{t('GRU entrenado con pool de 48 pacientes (intra-paciente)', 'GRU trained with 48-patient pool (intra-patient)')}</td><td style={S.td}>R² global = 0.7237</td></tr>
              <tr><td style={S.td}><span style={S.mono}>NB5B</span></td><td style={S.td}>Cross-Patient (LOPO)</td><td style={S.td}>{t('Leave-One-Patient-Out — generalización a pacientes no vistos', 'Leave-One-Patient-Out — generalization to unseen patients')}</td><td style={S.td}>GRU_weighted: R² = 0.5311</td></tr>
              <tr><td style={S.td}><span style={S.mono}>NB6</span></td><td style={S.td}>{t('Multi-step Cross-Patient', 'Multi-step Cross-Patient')}</td><td style={S.td}>{t('CNN-GRU-ATTN, LOPO sobre 123 pacientes de MIT-BIH e INCART, horizonte H=3', 'CNN-GRU-ATTN, LOPO over 123 patients from MIT-BIH and INCART, horizon H=3')}</td><td style={S.td}>CNN_GRU_ATTN: R² = 0.6734</td></tr>
              <tr><td style={S.td}><span style={S.mono}>NB7</span></td><td style={S.td}>{t('Hiperparámetros', 'Hyperparameters')}</td><td style={S.td}>{t('20 configuraciones por arquitectura sobre 10 pliegues de la cohorte reducida de 50', '20 configurations per architecture over 10 folds of the reduced 50-patient cohort')}</td><td style={S.td}>{t('Ninguna mejor: p = 1.0000', 'None better: p = 1.0000')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>NB8</span></td><td style={S.td}>{t('Detección de evento', 'Event detection')}</td><td style={S.td}>{t('Error por clase AAMI y detección de latido ectópico sobre el residuo', 'Per-AAMI-class error and ectopic beat detection on the residual')}</td><td style={S.td}>AUC-PR = 0.3808 (3.12×)</td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('1.5 Enfoques Experimentales', '1.5 Experimental Approaches')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text)' }}>{t('Exp A — Ventanas Temporales', 'Exp A — Time Windows')}</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-xs)', marginTop: '6px' }}>
              {t('Señal continua segmentada en ventanas de 5 segundos. Horizontes de predicción: 1, 3 y 5 segundos. Lookback fijo de 5s (1800 muestras a 360 Hz).', 'Continuous signal segmented into 5-second windows. Prediction horizons: 1, 3 and 5 seconds. Fixed lookback of 5s (1800 samples at 360 Hz).')}
            </p>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text)' }}>{t('Exp B — Latido a Latido', 'Exp B — Beat to Beat')}</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-xs)', marginTop: '6px' }}>
              {t('Señal segmentada en latidos individuales de 256 muestras centrados en el pico R. Lookbacks: N = 3, 5 o 10 latidos previos. Obtiene métricas superiores en todos los modelos.', 'Signal segmented into individual beats of 256 samples centered on the R-peak. Lookbacks: N = 3, 5 or 10 previous beats. Achieves superior metrics across all models.')}
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 2 — REQUISITOS
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="requirements">
        <h2 style={S.sectionTitle}>{t('2. Requisitos del Sistema', '2. System Requirements')}</h2>

        <h3 style={S.h3}>{t('2.1 Requisitos de Hardware', '2.1 Hardware Requirements')}</h3>
        <Bullet>{t('Procesador: x86_64 compatible (Intel/AMD)', 'Processor: x86_64 compatible (Intel/AMD)')}</Bullet>
        <Bullet>{t('Memoria RAM: mínimo', 'RAM: minimum')} <strong>6 GB</strong> {t('libres (recomendado 8 GB)', 'free (recommended 8 GB)')}</Bullet>
        <Bullet>{t('Espacio en disco: ~4 GB (imágenes Docker + modelos + datos)', 'Disk space: ~4 GB (Docker images + models + data)')}</Bullet>
        <Bullet>{t('Conexión a internet para la primera descarga de dependencias', 'Internet connection for the first dependency download')}</Bullet>

        <h3 style={S.h3}>{t('2.2 Requisitos de Software', '2.2 Software Requirements')}</h3>
        <Bullet><strong>Docker Desktop</strong> {t('instalado y en ejecución (Windows: WSL 2 habilitado)', 'installed and running (Windows: WSL 2 enabled)')}</Bullet>
        <Bullet>{t('Navegador web moderno: Chrome, Firefox, Edge o Safari (versiones actualizadas)', 'Modern web browser: Chrome, Firefox, Edge or Safari (updated versions)')}</Bullet>
        <Bullet>{t('Git (opcional, solo para clonar el repositorio)', 'Git (optional, only for cloning the repository)')}</Bullet>

        <h3 style={S.h3}>{t('2.3 Puertos Requeridos', '2.3 Required Ports')}</h3>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>{t('Puerto', 'Port')}</th><th style={S.th}>{t('Servicio', 'Service')}</th><th style={S.th}>{t('Descripción', 'Description')}</th></tr>
            </thead>
            <tbody>
              <tr><td style={S.td}><span style={S.mono}>80</span></td><td style={S.td}>Frontend React</td><td style={S.td}>{t('Interfaz web del dashboard', 'Dashboard web interface')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>8000</span></td><td style={S.td}>Backend FastAPI</td><td style={S.td}>{t('API de predicción y procesamiento de señales', 'Prediction and signal processing API')}</td></tr>
            </tbody>
          </table>
        </div>
        <InfoBox type="tip" t={t}>
          {t('Si el puerto 80 está ocupado, edite el archivo', 'If port 80 is in use, edit the file')} <span style={S.mono}>docker-compose.yml</span> {t('y cambie', 'and change')} <span style={S.mono}>"80:80"</span> {t('por', 'to')}
          <span style={S.mono}>"3000:80"</span>. {t('Luego acceda a', 'Then access')} <span style={S.mono}>http://localhost:3000</span>.
        </InfoBox>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 3 — INSTALACIÓN Y EJECUCIÓN
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="installation">
        <h2 style={S.sectionTitle}>{t('3. Instalación y Ejecución', '3. Installation and Execution')}</h2>

        <h3 style={S.h3}>{t('3.1 Pasos de Instalación', '3.1 Installation Steps')}</h3>
        <NumberedStep n={1}>
          {t('Instale', 'Install')} <strong>Docker Desktop</strong> {t('desde', 'from')} <span style={S.mono}>docker.com/products/docker-desktop</span>. {t('En Windows, asegúrese de que WSL 2 esté habilitado.', 'On Windows, make sure WSL 2 is enabled.')}
        </NumberedStep>
        <NumberedStep n={2}>
          {t('Abra Docker Desktop y espere a que el motor Docker se inicie completamente (ícono verde en la bandeja del sistema).', 'Open Docker Desktop and wait for the Docker engine to fully start (green icon in the system tray).')}
        </NumberedStep>
        <NumberedStep n={3}>
          {t('Abra una terminal (PowerShell, CMD o Terminal) y navegue a la carpeta del backend:', 'Open a terminal (PowerShell, CMD or Terminal) and navigate to the backend folder:')}
        </NumberedStep>
        <div style={{ background: 'var(--elevated)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '12px', marginLeft: '34px' }}>
          <code style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-xs)', color: 'var(--prediction)' }}>
            cd "ruta\a\FORECASTING ECG\FORECASTING ECG - Dashboard\ecg_forecast_api"
          </code>
        </div>
        <NumberedStep n={4}>
          {t('Construya e inicie los contenedores con Docker Compose:', 'Build and start the containers with Docker Compose:')}
        </NumberedStep>
        <div style={{ background: 'var(--elevated)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '12px', marginLeft: '34px' }}>
          <code style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-xs)', color: 'var(--prediction)' }}>
            docker compose up --build
          </code>
        </div>
        <NumberedStep n={5}>
          {t('Espere hasta ver el mensaje:', 'Wait until you see the message:')}
        </NumberedStep>
        <div style={{ background: 'var(--elevated)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '12px', marginLeft: '34px' }}>
          <code style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: '#10b981' }}>
            api-1 | INFO: Uvicorn running on http://0.0.0.0:8000 — Application startup complete.
          </code>
        </div>
        <NumberedStep n={6}>
          {t('Abra su navegador en', 'Open your browser at')} <span style={S.mono}>http://localhost</span>. {t('El dashboard estará listo.', 'The dashboard will be ready.')}
        </NumberedStep>

        <InfoBox type="info" t={t}>
          {t('La primera ejecución puede tardar entre 5 y 10 minutos mientras se descargan las dependencias (TensorFlow, etc.). Para ejecuciones posteriores, basta con:', 'The first run may take between 5 and 10 minutes while dependencies are downloaded (TensorFlow, etc.). For subsequent runs, just use:')} <span style={S.mono}>docker compose up</span> ({t('sin', 'without')} <span style={S.mono}>--build</span>).
        </InfoBox>

        <h3 style={S.h3}>{t('3.2 Detener la Aplicación', '3.2 Stop the Application')}</h3>
        <Bullet>{t('En la terminal donde está corriendo, presione', 'In the terminal where it is running, press')} <span style={S.mono}>Ctrl + C</span>.</Bullet>
        <Bullet>{t('O desde otra terminal en la misma carpeta:', 'Or from another terminal in the same folder:')} <span style={S.mono}>docker compose down</span>.</Bullet>

        <h3 style={S.h3}>{t('3.3 Verificar el Funcionamiento', '3.3 Verify Operation')}</h3>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>URL</th><th style={S.th}>{t('Resultado Esperado', 'Expected Result')}</th></tr>
            </thead>
            <tbody>
              <tr><td style={S.td}><span style={S.mono}>http://localhost</span></td><td style={S.td}>{t('Interfaz principal del dashboard', 'Dashboard main interface')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>http://localhost:8000/docs</span></td><td style={S.td}>{t('Documentación interactiva de la API (Swagger)', 'Interactive API documentation (Swagger)')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>http://localhost:8000/api/health</span></td><td style={S.td}>{t('Respuesta JSON:', 'JSON response:')} <span style={S.mono}>{`{"status":"ok"}`}</span></td></tr>
            </tbody>
          </table>
        </div>

        <InfoBox type="warning" t={t}>
          {t('Si el backend no está disponible, el dashboard opera automáticamente con datos de demostración. Las predicciones en vivo requieren que la API esté activa.', 'If the backend is not available, the dashboard automatically operates with demo data. Live predictions require the API to be active.')}
        </InfoBox>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 4 — INTERFAZ DE USUARIO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="interface">
        <h2 style={S.sectionTitle}>{t('4. Interfaz de Usuario', '4. User Interface')}</h2>

        <h3 style={S.h3}>{t('4.1 Barra de Navegación Lateral (Sidebar)', '4.1 Side Navigation Bar (Sidebar)')}</h3>
        <p style={S.body}>
          {t('La barra de navegación lateral es el punto central de acceso a todas las secciones del dashboard. Se ubica en el lado izquierdo de la pantalla y permanece visible en todo momento.', 'The side navigation bar is the central access point to all dashboard sections. It is located on the left side of the screen and remains visible at all times.')}
        </p>
        <h4 style={S.h4}>{t('Elementos de la Sidebar', 'Sidebar Elements')}</h4>
        <Bullet><strong>{t('Logo y marca', 'Logo and branding')}</strong>: {t('Logo «ECG FORECASTING» con subtexto «CESMAG · 2025» en la parte superior.', 'Logo «ECG FORECASTING» with subtext «CESMAG · 2025» at the top.')}</Bullet>
        <Bullet><strong>{t('Botón de colapso', 'Collapse button')}</strong>: {t('Permite alternar entre el modo expandido (220px, muestra ícono + texto) y el modo colapsado (72px, solo ícono).', 'Toggles between expanded mode (220px, shows icon + text) and collapsed mode (72px, icon only).')}</Bullet>
        <Bullet><strong>{t('Enlaces de navegación', 'Navigation links')}</strong>: {t('9 secciones accesibles, cada una con su ícono representativo. El enlace activo se resalta con fondo azul semitransparente e indicador circular azul a la derecha.', '9 accessible sections, each with its representative icon. The active link is highlighted with semi-transparent blue background and circular blue indicator on the right.')}</Bullet>
        <Bullet><strong>{t('Indicador MIT-BIH', 'MIT-BIH indicator')}</strong>: {t('En la parte inferior, un punto verde animado indica que la base de datos está disponible.', 'At the bottom, an animated green dot indicates the database is available.')}</Bullet>
        <Bullet><strong>{t('Botón de tema', 'Theme button')}</strong>: {t('Alterna entre el tema oscuro (predeterminado) y el tema claro.', 'Toggles between the dark theme (default) and the light theme.')}</Bullet>

        <h4 style={S.h4}>{t('Secciones de Navegación', 'Navigation Sections')}</h4>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>{t('Ícono', 'Icon')}</th><th style={S.th}>{t('Sección', 'Section')}</th><th style={S.th}>{t('Descripción', 'Description')}</th></tr>
            </thead>
            <tbody>
              {/* Estas ocho filas son exactamente las de components/layout/Navbar.tsx.
                  La tabla anterior listaba «Predicción» y «Estadísticas», que no existen,
                  y omitía «Cohorte y método», que sí. */}
              <tr><td style={S.td}><Home size={14} /></td><td style={S.td}>Home</td><td style={S.td}>{t('Página de inicio con la visión general del proyecto y los ocho hallazgos principales', 'Home page with the project overview and the eight key findings')}</td><td style={S.td}><span style={S.mono}>/</span></td></tr>
              <tr><td style={S.td}><Brain size={14} /></td><td style={S.td}>{t('Modelos', 'Models')}</td><td style={S.td}>{t('Catálogo de las arquitecturas y tabla comparativa LOPO con su n y su cohorte', 'Catalog of architectures and LOPO comparison table with its n and cohort')}</td><td style={S.td}><span style={S.mono}>/modelos</span></td></tr>
              <tr><td style={S.td}><FlaskConical size={14} /></td><td style={S.td}>{t('Experimentos', 'Experiments')}</td><td style={S.td}>{t('Los ocho experimentos, una pestaña por cada uno', 'The eight experiments, one tab each')}</td><td style={S.td}><span style={S.mono}>/experimentos</span></td></tr>
              <tr><td style={S.td}><Search size={14} /></td><td style={S.td}>{t('Explorador', 'Explorer')}</td><td style={S.td}>{t('Exploración interactiva de los datos crudos, con filtros y exportación a CSV', 'Interactive exploration of the raw data, with filters and CSV export')}</td><td style={S.td}><span style={S.mono}>/explorador</span></td></tr>
              <tr><td style={S.td}><Zap size={14} /></td><td style={S.td}>{t('Predicción LOPO', 'LOPO Prediction')}</td><td style={S.td}>{t('Predicción cross-patient en tiempo real sobre un paciente no visto', 'Real-time cross-patient prediction on an unseen patient')}</td><td style={S.td}><span style={S.mono}>/lopo</span></td></tr>
              <tr><td style={S.td}><Users size={14} /></td><td style={S.td}>{t('Cohorte y método', 'Cohort & method')}</td><td style={S.td}>{t('Quiénes son los pacientes, dónde falla el modelo y por qué se descartó el filtro de mediana', 'Who the patients are, where the model fails, and why the median filter was discarded')}</td><td style={S.td}><span style={S.mono}>/cohorte</span></td></tr>
              <tr><td style={S.td}><BookOpen size={14} /></td><td style={S.td}>{t('Manual', 'User Guide')}</td><td style={S.td}>{t('Esta guía de usuario', 'This user guide')}</td><td style={S.td}><span style={S.mono}>/manual</span></td></tr>
              <tr><td style={S.td}><BookText size={14} /></td><td style={S.td}>{t('Glosario', 'Glossary')}</td><td style={S.td}>{t('Diccionario de términos técnicos', 'Dictionary of technical terms')}</td><td style={S.td}><span style={S.mono}>/glosario</span></td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('4.2 Tema Claro / Oscuro', '4.2 Light / Dark Theme')}</h3>
        <p style={S.body}>
          {t('El dashboard incluye un sistema de temas con dos modos visuales. Para cambiar de tema, utilice el botón con ícono de sol/luna ubicado en la parte inferior de la barra de navegación.', 'The dashboard includes a theme system with two visual modes. To change the theme, use the sun/moon icon button located at the bottom of the navigation bar.')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <Moon size={14} color="var(--prediction)" />
            <span style={{ ...S.body, fontSize: 'var(--fs-xs)' }}><strong>{t('Modo oscuro', 'Dark mode')}</strong> ({t('predeterminado', 'default')}): {t('fondo oscuro, texto claro. Ideal para reducir fatiga visual.', 'dark background, light text. Ideal for reducing eye strain.')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <Sun size={14} color="#f59e0b" />
            <span style={{ ...S.body, fontSize: 'var(--fs-xs)' }}><strong>{t('Modo claro', 'Light mode')}</strong>: {t('fondo blanco, texto oscuro. Adecuado para ambientes con iluminación intensa.', 'white background, dark text. Suitable for brightly lit environments.')}</span>
          </div>
        </div>

        <h3 style={S.h3}>{t('4.3 Diseño Responsivo', '4.3 Responsive Design')}</h3>
        <p style={S.body}>
          {t('La interfaz se adapta automáticamente a diferentes tamaños de pantalla. En dispositivos móviles (ancho ≤ 768px), la barra lateral se convierte en un menú desplegable (drawer) accesible mediante un botón hamburguesa. Los gráficos y tablas se reorganizan verticalmente para facilitar la lectura.', 'The interface automatically adapts to different screen sizes. On mobile devices (width ≤ 768px), the sidebar becomes a dropdown menu (drawer) accessible via a hamburger button. Charts and tables are reorganized vertically for easier reading.')}
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 5 — HOME
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="home">
        <h2 style={S.sectionTitle}>{t('5. Página de Inicio (Home)', '5. Home Page')}</h2>
        <p style={S.sectionSub}>
          {t('La página de inicio presenta una visión general del proyecto y facilita la navegación rápida hacia las secciones principales.', 'The home page presents a project overview and facilitates quick navigation to the main sections.')}
        </p>

        <h3 style={S.h3}>{t('5.1 Secciones de la Página', '5.1 Page Sections')}</h3>

        <h4 style={S.h4}>{t('Hero (Sección Principal)', 'Hero (Main Section)')}</h4>
        <Bullet>{t('Título del proyecto con efecto visual animado y fondo decorativo con gradientes.', 'Project title with animated visual effect and decorative gradient background.')}</Bullet>
        <Bullet><strong>{t('Animación ECG decorativa', 'Decorative ECG animation')}</strong>: {t('Canvas decorativo con un trazado sintético en desplazamiento continuo. Está rotulado como sintético a propósito: no es una señal real de ningún paciente.', 'Decorative canvas with a synthetic trace in continuous scroll. It is labelled as synthetic on purpose: it is not a real signal from any patient.')}</Bullet>
        <Bullet>{t('Afiliación institucional: «Universidad CESMAG · Ingeniería de Sistemas · 2025–2026».', 'Institutional affiliation: «Universidad CESMAG · Systems Engineering · 2025–2026».')}</Bullet>

        <h4 style={S.h4}>{t('Visión General (3 tarjetas)', 'Overview (3 cards)')}</h4>
        <Bullet><strong>{t('Enfoques Experimentales', 'Experimental Approaches')}</strong>: {t('Describe Exp A (ventanas de 5s) y Exp B (latido a latido, 256 muestras).', 'Describes Exp A (5s windows) and Exp B (beat to beat, 256 samples).')}</Bullet>
        <Bullet><strong>{t('Modelos Implementados', 'Implemented Models')}</strong>: {t('Muestra badges de ML Clásico (LinReg, DT, RF, SVR, MLP, ARIMA) y Deep Learning (LSTM, GRU, CNN-LSTM, CNN-GRU).', 'Shows badges for Classic ML (LinReg, DT, RF, SVR, MLP, ARIMA) and Deep Learning (LSTM, GRU, CNN-LSTM, CNN-GRU).')}</Bullet>
        <Bullet><strong>{t('Evaluación', 'Evaluation')}</strong>: {t('KPIs resumen — 48 pacientes, 7 pipelines de preprocesamiento, métricas R², RMSE, MAE, DTW.', 'Summary KPIs — 48 patients, 7 preprocessing pipelines, R², RMSE, MAE, DTW metrics.')}</Bullet>

        <h4 style={S.h4}>{t('Metodología (Pipeline Visual)', 'Methodology (Visual Pipeline)')}</h4>
        <Bullet>{t('Diagrama horizontal de 5 pasos conectados por flechas: MIT-BIH → Preprocesamiento → Segmentación → Entrenamiento → Evaluación.', 'Horizontal diagram of 5 steps connected by arrows: MIT-BIH → Preprocessing → Segmentation → Training → Evaluation.')}</Bullet>

        <h4 style={S.h4}>{t('Resultados Destacados (4 tarjetas)', 'Key Results (4 cards)')}</h4>
        <Bullet>{t('Exp B supera consistentemente a Exp A.', 'Exp B consistently outperforms Exp A.')}</Bullet>
        <Bullet>{t('GRU: mejor modelo Deep Learning (R² = 0.6592).', 'GRU: best Deep Learning model (R² = 0.6592).')}</Bullet>
        <Bullet>{t('Random Forest: mejor modelo tradicional (R² = 0.6264).', 'Random Forest: best traditional model (R² = 0.6264).')}</Bullet>
        <Bullet>{t('El filtro de mediana (F_MED) da el mejor R² en esta fase, pero por aplanar el pico R: el modelo final lo descarta.', 'The median filter (F_MED) gives the best R² in this phase, but by flattening the R peak: the final model discards it.')}</Bullet>

        <h4 style={S.h4}>{t('Navegación Rápida', 'Quick Navigation')}</h4>
        <Bullet>{t('6 tarjetas que llevan a: Modelos, Experimentos, Predicción LOPO, Explorador, Manual y Glosario. La navegación completa, incluida «Cohorte y método», está en el menú lateral.', '6 cards linking to: Models, Experiments, LOPO Prediction, Explorer, User Guide and Glossary. The full navigation, including «Cohort & method», is in the side menu.')}</Bullet>

        <h4 style={S.h4}>{t('Equipo de Investigación', 'Research Team')}</h4>
        <Bullet>{t('3 tarjetas con foto circular, nombre, rol y detalle de cada integrante del equipo.', '3 cards with circular photo, name, role and details of each team member.')}</Bullet>

        <h4 style={S.h4}>{t('Base de Datos', 'Database')}</h4>
        <Bullet>{t('Logo institucional + 3 mini-cards informativas (48 registros, 360 Hz, ~30 min) + chips descriptivos.', 'Institutional logo + 3 informative mini-cards (48 records, 360 Hz, ~30 min) + descriptive chips.')}</Bullet>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 6 — MODELOS
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="modelos">
        <h2 style={S.sectionTitle}>{t('6. Catálogo de Modelos', '6. Models Catalog')}</h2>
        <p style={S.sectionSub}>
          {t('La sección «Modelos» presenta información detallada sobre cada arquitectura de predicción utilizada en el proyecto, organizada en tres categorías.', 'The «Models» section presents detailed information about each prediction architecture used in the project, organized into three categories.')}
        </p>

        <h3 style={S.h3}>{t('6.1 Categorías de Modelos', '6.1 Model Categories')}</h3>
        <p style={S.body}>{t('En la parte superior, tres botones permiten alternar entre las categorías:', 'At the top, three buttons allow switching between categories:')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px', marginBottom: '14px' }}>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--prediction)' }}>Deep Learning</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '4px' }}>LSTM, GRU, CNN-GRU</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: '#10b981' }}>ML Tradicional</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '4px' }}>RF, MLP, SVR (RBF), DT</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: '#f59e0b' }}>Cross-Patient (LOPO)</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '4px' }}>GRU base, CNN GRU, BiGRU MHA, Ensemble</p>
          </div>
        </div>

        <h3 style={S.h3}>{t('6.2 Información por Modelo', '6.2 Model Information')}</h3>
        <p style={S.body}>{t('Al seleccionar un modelo, se despliega una tarjeta detallada con:', 'When selecting a model, a detailed card is displayed with:')}</p>
        <Bullet><strong>{t('Nombre completo y resumen', 'Full name and summary')}</strong>: {t('Descripción concisa de la arquitectura.', 'Concise description of the architecture.')}</Bullet>
        <Bullet><strong>{t('Mecanismo interno', 'Internal mechanism')}</strong>: {t('Explicación técnica del funcionamiento del modelo.', 'Technical explanation of model operation.')}</Bullet>
        <Bullet><strong>{t('Fortalezas', 'Strengths')}</strong>: {t('Ventajas del modelo (marcadas con «+» azul).', 'Model advantages (marked with blue «+»).')}</Bullet>
        <Bullet><strong>{t('Compromisos', 'Trade-offs')}</strong>: {t('Limitaciones o trade-offs (marcados con «~» amarillo).', 'Limitations or trade-offs (marked with yellow «~»).')}</Bullet>
        <Bullet><strong>{t('¿Por qué para ECG?', 'Why for ECG?')}</strong>: {t('Justificación de la elección del modelo para señales electrocardiográficas.', 'Justification for choosing the model for electrocardiographic signals.')}</Bullet>

        <h3 style={S.h3}>{t('6.3 Diagrama de Arquitectura', '6.3 Architecture Diagram')}</h3>
        <p style={S.body}>
          {t('Cada modelo incluye un diagrama SVG interactivo que ilustra su arquitectura interna:', 'Each model includes an interactive SVG diagram illustrating its internal architecture:')}
        </p>
        <Bullet><strong>Deep Learning</strong>: {t('Nodos de flujo (Input → capas recurrentes/convolucionales → Output) con colores diferenciados por tipo de capa.', 'Flow nodes (Input → recurrent/convolutional layers → Output) with colors differentiated by layer type.')}</Bullet>
        <Bullet><strong>{t('ML Tradicional', 'Traditional ML')}</strong>: {t('Diagramas conceptuales personalizados (RF = bosque de árboles → promedio, MLP = capas de neuronas, SVR = kernel RBF, DT = árbol de decisión).', 'Custom conceptual diagrams (RF = tree forest → average, MLP = neuron layers, SVR = RBF kernel, DT = decision tree).')}</Bullet>

        <h3 style={S.h3}>{t('6.4 Tabla Comparativa', '6.4 Comparative Table')}</h3>
        <p style={S.body}>
          {t('En la parte inferior de cada categoría se muestra una tabla comparativa con las métricas clave de todos los modelos de esa categoría, incluyendo R² Exp A, R² Exp B, tipo, framework, velocidad de entrenamiento y observaciones relevantes.', 'At the bottom of each category, a comparative table is shown with the key metrics of all models in that category, including R² Exp A, R² Exp B, type, framework, training speed and relevant observations.')}
        </p>

        <h3 style={S.h3}>{t('6.5 Cómo Usar esta Sección', '6.5 How to Use this Section')}</h3>
        <NumberedStep n={1}>{t('Seleccione una categoría (Deep Learning, ML Tradicional o LOPO).', 'Select a category (Deep Learning, Traditional ML or LOPO).')}</NumberedStep>
        <NumberedStep n={2}>{t('Haga clic en el nombre del modelo deseado en la fila de pestañas.', 'Click on the desired model name in the tab row.')}</NumberedStep>
        <NumberedStep n={3}>{t('Observe la descripción, diagrama, hiperparámetros y fortalezas del modelo.', 'Observe the description, diagram, hyperparameters and strengths of the model.')}</NumberedStep>
        <NumberedStep n={4}>{t('Consulte la tabla comparativa al final para comparar con otros modelos de la misma categoría.', 'Check the comparative table at the bottom to compare with other models in the same category.')}</NumberedStep>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 7 — PREDICCIÓN LOPO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="lopo">
        <h2 style={S.sectionTitle}>{t('7. Predicción LOPO (Cross-Patient)', '7. LOPO Prediction (Cross-Patient)')}</h2>
        <p style={S.sectionSub}>
          {t('La sección LOPO (Leave-One-Patient-Out) permite realizar predicciones utilizando un modelo entrenado con 47 pacientes y evaluado sobre el paciente excluido. Mide la capacidad de generalización del modelo a pacientes nunca vistos durante el entrenamiento.', 'The LOPO (Leave-One-Patient-Out) section allows making predictions using a model trained with 47 patients and evaluated on the excluded patient. It measures the model\'s generalization capability to patients never seen during training.')}
        </p>

        <h3 style={S.h3}>{t('7.1 Modelo LOPO', '7.1 LOPO Model')}</h3>
        <div style={{ overflowX: 'auto', marginTop: '8px', marginBottom: '14px' }}>
          <table style={S.table}>
            <thead><tr><th style={S.th}>{t('Parámetro', 'Parameter')}</th><th style={S.th}>{t('Valor', 'Value')}</th></tr></thead>
            <tbody>
              <tr><td style={S.td}>{t('Modelo', 'Model')}</td><td style={S.td}>GRU_weighted</td></tr>
              <tr><td style={S.td}>{t('Filtro', 'Filter')}</td><td style={S.td}>F_N+PB+MED (Notch + {t('Pasabanda', 'Bandpass')} + {t('Mediana', 'Median')})</td></tr>
              <tr><td style={S.td}>Lookback</td><td style={S.td}>{t('5 latidos', '5 beats')}</td></tr>
              <tr><td style={S.td}>{t('R² medio LOPO', 'R² mean LOPO')}</td><td style={S.td}>0.5311</td></tr>
              <tr><td style={S.td}>IC 95%</td><td style={S.td}>[0.4534, 0.6128]</td></tr>
              <tr><td style={S.td}>{t('Característica especial', 'Special feature')}</td><td style={S.td}>{t('Incluye intervalos RR como feature adicional', 'Includes RR intervals as additional feature')}</td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('7.2 Configuración', '7.2 Configuration')}</h3>
        <p style={S.body}>{t('La interfaz se organiza en tres bloques: la fuente de la señal, el modo de predicción y la visualización de resultados.', 'The interface has three blocks: the signal source, the prediction mode and the results view.')}</p>

        <h4 style={S.h4}>{t('Fuente de Señal', 'Signal Source')}</h4>
        <Bullet>{t('Selector de paciente en dos grupos: MIT-BIH e INCART. Los pacientes marcados en verde tienen señal disponible en el servicio; el resto se atiende con la señal de demostración. No hay carga de archivos propios.', 'Patient selector in two groups: MIT-BIH and INCART. Patients marked green have their signal available from the service; the rest fall back to the demonstration signal. There is no upload of your own files.')}</Bullet>

        <h4 style={S.h4}>{t('Modo de Predicción', 'Prediction Mode')}</h4>
        <p style={S.body}>{t('Dos modos disponibles:', 'Two available modes:')}</p>
        <Bullet><strong>{t('Prospectivo', 'Prospective')}</strong>: {t('Predicción rolling latido a latido. Parámetros ajustables: latidos a predecir, posiciones, ancla y filtrar ruido.', 'Rolling beat-by-beat prediction. Adjustable parameters: beats to predict, positions, anchor and noise filter.')}</Bullet>
        <Bullet><strong>{t('Futuro', 'Future')}</strong> ({t('exclusivo de LOPO', 'LOPO exclusive')}): {t('Modo de generación autoregresiva que simula la continuación de la señal ECG más allá de los datos disponibles.', 'Autoregressive generation mode that simulates the continuation of the ECG signal beyond available data.')}</Bullet>

        <h3 style={S.h3}>{t('7.3 Modo Futuro — Generación Autoregresiva', '7.3 Future Mode — Autoregressive Generation')}</h3>
        <p style={S.body}>
          {t('Este modo exclusivo simula la continuación de la señal ECG del paciente de forma autoregresiva: la predicción de cada latido se utiliza como entrada para predecir el siguiente, generando así una señal futura continua.', 'This exclusive mode simulates the continuation of the patient\'s ECG signal autoregressively: each beat\'s prediction is used as input to predict the next one, thus generating a continuous future signal.')}
        </p>
        <Bullet><strong>{t('Duración', 'Duration')}</strong>: {t('Ajustable mediante un slider (en minutos) que controla la cantidad de señal futura a generar.', 'Adjustable via a slider (in minutes) that controls the amount of future signal to generate.')}</Bullet>
        <Bullet><strong>{t('Monitor ECG', 'ECG Monitor')}</strong>: {t('Visualización tipo monitor clínico con indicador «LIVE» rojo pulsante y la señal generada en tiempo real.', 'Clinical monitor-style visualization with pulsing red «LIVE» indicator and the generated signal in real time.')}</Bullet>
        <Bullet><strong>{t('Alertas clínicas', 'Clinical alerts')}</strong>: {t('Sistema de detección automática de anomalías durante la generación, con categorías:', 'Automatic anomaly detection system during generation, with categories:')}</Bullet>
        <div style={{ marginLeft: '28px' }}>
          <Bullet><span style={S.badge('#ef4444')}>{t('Morfología', 'Morphology')}</span> — {t('Cambios en la forma del latido', 'Changes in beat shape')}</Bullet>
          <Bullet><span style={S.badge('#f59e0b')}>{t('Amplitud', 'Amplitude')}</span> — {t('Variaciones anormales de amplitud', 'Abnormal amplitude variations')}</Bullet>
          <Bullet><span style={S.badge('#3b82f6')}>{t('Ritmo', 'Rhythm')}</span> — {t('Irregularidades en el intervalo R-R', 'R-R interval irregularities')}</Bullet>
          <Bullet><span style={S.badge('#8b5cf6')}>Flatline</span> — {t('Detección de señal plana', 'Flat signal detection')}</Bullet>
        </div>
        <Bullet><strong>{t('Métricas de estabilidad', 'Stability metrics')}</strong>: {t('R² morfológico, R² auto-similaridad, estabilidad de amplitud, DTW, RMSE, MAE, amplitud QRS.', 'Morphological R², auto-similarity R², amplitude stability, DTW, RMSE, MAE, QRS amplitude.')}</Bullet>

        <InfoBox type="warning" t={t}>
          {t('La normalización LOPO es', 'LOPO normalization is')} <strong>per-beat instance</strong> ({t('no global como NB4B', 'not global like NB4B')}). {t('Esto significa que cada latido se normaliza individualmente. El modelo GRU_weighted también utiliza los intervalos RR como entrada adicional para mejorar la generalización.', 'This means each beat is normalized individually. The GRU_weighted model also uses RR intervals as additional input to improve generalization.')}
        </InfoBox>

        <h3 style={S.h3}>{t('7.4 Flujo de Uso Paso a Paso', '7.4 Step-by-Step Usage Flow')}</h3>
        <NumberedStep n={1}>{t('Seleccione la fuente de señal y el paciente.', 'Select the signal source and patient.')}</NumberedStep>
        <NumberedStep n={2}>{t('Elija el modo:', 'Choose the mode:')} <strong>{t('Prospectivo', 'Prospective')}</strong> ({t('evaluación directa', 'direct evaluation')}) {t('o', 'or')} <strong>{t('Futuro', 'Future')}</strong> ({t('generación continua', 'continuous generation')}).</NumberedStep>
        <NumberedStep n={3}>{t('Configure los parámetros del modo seleccionado.', 'Configure the selected mode parameters.')}</NumberedStep>
        <NumberedStep n={4}>{t('Haga clic en', 'Click')} <strong>{t('Iniciar', 'Start')}</strong> {t('para comenzar.', 'to begin.')}</NumberedStep>
        <NumberedStep n={5}>{t('En modo Futuro, observe las alertas clínicas y las métricas de estabilidad.', 'In Future mode, observe the clinical alerts and stability metrics.')}</NumberedStep>
        <NumberedStep n={6}>{t('Use', 'Use')} <strong>{t('Detener', 'Stop')}</strong> {t('o', 'or')} <strong>Reset</strong> {t('según sea necesario.', 'as needed.')}</NumberedStep>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 8 — EXPERIMENTOS
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="experimentos">
        <h2 style={S.sectionTitle}>{t('8. Experimentos', '8. Experiments')}</h2>
        <p style={S.sectionSub}>
          {t('La sección de Experimentos presenta los resultados completos de los ocho cuadernos del proyecto. Cada pestaña declara su cuaderno, su base de datos y su partición, y cada cifra lleva el archivo del que sale.', 'The Experiments section presents the complete results of the eight project notebooks. Each tab declares its notebook, database and split, and every figure carries the file it comes from.')}
        </p>

        <h3 style={S.h3}>{t('8.1 Navegación por Pestañas', '8.1 Tab Navigation')}</h3>
        <p style={S.body}>
          {t('Arriba hay ocho pestañas, rótuladas «Exp. 1» a «Exp. 8». El orden es el de los experimentos, que no coincide con el alfabético de los cuadernos: NB5B es el quinto y NB6 el sexto.', 'There are eight tabs at the top, labelled «Exp. 1» to «Exp. 8». The order is that of the experiments, which does not match the notebooks’ alphabetical order: NB5B is the fifth and NB6 the sixth.')}
        </p>
        <div style={{ overflowX: 'auto', marginTop: '8px', marginBottom: '14px' }}>
          <table style={S.table}>
            <thead><tr><th style={S.th}>{t('Pestaña', 'Tab')}</th><th style={S.th}>{t('Nombre', 'Name')}</th><th style={S.th}>{t('Contenido Principal', 'Main Content')}</th></tr></thead>
            <tbody>
              <tr><td style={S.td}><span style={S.badge('#3b82f6')}>Exp. 1 · NB1</span></td><td style={S.td}>{t('Tradicionales', 'Traditional')}</td><td style={S.td}>RF, SVR, MLP, DT, LinReg, ARIMA — Exp A {t('y', 'and')} Exp B</td></tr>
              <tr><td style={S.td}><span style={S.badge('#8b5cf6')}>Exp. 2 · NB2</span></td><td style={S.td}>Deep Learning</td><td style={S.td}>LSTM, GRU, CNN-LSTM, CNN-GRU — Exp A {t('y', 'and')} Exp B</td></tr>
              <tr><td style={S.td}><span style={S.badge('#10b981')}>Exp. 3 · NB3</span></td><td style={S.td}>{t('Evaluación', 'Evaluation')}</td><td style={S.td}>{t('Comparación cruzada entre notebooks', 'Cross-comparison between notebooks')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#f59e0b')}>Exp. 4 · NB4B</span></td><td style={S.td}>{t('Multi-sujeto', 'Multi-subject')}</td><td style={S.td}>{t('Modelo GRU pool de 48 pacientes', 'GRU model 48-patient pool')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#ef4444')}>Exp. 5 · NB5B</span></td><td style={S.td}>Cross-patient</td><td style={S.td}>{t('LOPO sobre 48 pacientes de MIT-BIH, con fine-tuning y validación externa en INCART', 'LOPO over 48 MIT-BIH patients, with fine-tuning and external INCART validation')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#06b6d4')}>Exp. 6 · NB6</span></td><td style={S.td}>{t('Multi-step LOPO', 'Multi-step LOPO')}</td><td style={S.td}>{t('CNN-GRU-ATTN sobre los 123 pacientes de MIT-BIH e INCART, horizonte H=3 — el modelo final', 'CNN-GRU-ATTN over the 123 MIT-BIH and INCART patients, horizon H=3 — the final model')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#a855f7')}>Exp. 7 · NB7</span></td><td style={S.td}>{t('Hiperparámetros', 'Hyperparameters')}</td><td style={S.td}>{t('Búsqueda sistemática y análisis de sensibilidad; también el efecto del filtro de mediana', 'Systematic search and sensitivity analysis; also the median filter effect')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#14b8a6')}>Exp. 8 · NB8</span></td><td style={S.td}>{t('Detección de evento', 'Event detection')}</td><td style={S.td}>{t('Error por clase AAMI y detección de latido ectópico ordenando por el residuo', 'Per-AAMI-class error and ectopic beat detection by ranking on the residual')}</td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('8.2 NB1 — Modelos Tradicionales de ML', '8.2 NB1 — Traditional ML Models')}</h3>
        <p style={S.body}>{t('Presenta los resultados de los modelos de Machine Learning clásico entrenados por paciente individual.', 'Presents the results of classic Machine Learning models trained per individual patient.')}</p>
        <h4 style={S.h4}>{t('Elementos visuales', 'Visual elements')}</h4>
        <Bullet><strong>{t('Banner de encabezado', 'Header banner')}</strong>: {t('Título, subtexto y metadata (dataset, partición, evaluaciones totales, modelos y pipelines).', 'Title, subtext and metadata (dataset, split, total evaluations, models and pipelines).')}</Bullet>
        <Bullet><strong>{t('4 tarjetas KPI', '4 KPI cards')}</strong>: {t('Mejor R² Exp A, Mejor R² Exp B, Mejora A→B (%), Filtro óptimo.', 'Best R² Exp A, Best R² Exp B, Improvement A→B (%), Optimal filter.')}</Bullet>
        <Bullet><strong>{t('Gráfico de barras', 'Bar chart')}</strong>: {t('R² por modelo para Exp A y Exp B.', 'R² per model for Exp A and Exp B.')}</Bullet>
        <Bullet><strong>Forest Plot</strong>: {t('Intervalos de confianza al 95% para cada modelo.', '95% confidence intervals for each model.')}</Bullet>
        <Bullet><strong>Heatmaps</strong>: {t('Mapas de calor Filtro × Horizonte (Exp A) y Filtro × Lookback (Exp B).', 'Filter × Horizon (Exp A) and Filter × Lookback (Exp B) heatmaps.')}</Bullet>
        <Bullet><strong>{t('Tabla de resultados', 'Results table')}</strong>: {t('Resumen completo con todas las métricas por modelo y configuración.', 'Complete summary with all metrics per model and configuration.')}</Bullet>
        <Bullet><strong>{t('Pruebas de Wilcoxon', 'Wilcoxon tests')}</strong>: {t('Significancia estadística de cada modelo vs. persistencia (modelo base).', 'Statistical significance of each model vs. persistence (baseline model).')}</Bullet>
        <Bullet><strong>{t('Análisis de sobreajuste', 'Overfitting analysis')}</strong>: {t('Gap R² (diferencia entre train y test).', 'R² Gap (difference between train and test).')}</Bullet>
        <Bullet><strong>{t('Interpretación', 'Interpretation')}</strong>: {t('Análisis textual de los resultados. Sale completo al entrar; ya no hay que desplegarlo.', 'Textual analysis of the results. It is shown in full on entry; no longer collapsed.')}</Bullet>

        <h3 style={S.h3}>{t('8.3 NB2 — Deep Learning', '8.3 NB2 — Deep Learning')}</h3>
        <p style={S.body}>
          {t('Estructura idéntica a NB1, aplicada a los modelos de aprendizaje profundo. Incluye los mismos elementos (KPIs, barras, forest plot, heatmaps, tabla, Wilcoxon, sobreajuste) para LSTM, GRU, CNN-LSTM y CNN-GRU.', 'Identical structure to NB1, applied to deep learning models. Includes the same elements (KPIs, bars, forest plot, heatmaps, table, Wilcoxon, overfitting) for LSTM, GRU, CNN-LSTM and CNN-GRU.')}
        </p>

        <h3 style={S.h3}>{t('8.4 NB3 — Evaluación Cruzada', '8.4 NB3 — Cross Evaluation')}</h3>
        <p style={S.body}>
          {t('Compara los resultados de NB1 y NB2 bajo un mismo marco de evaluación. Los datos provienen del notebook de evaluación cruzada', 'Compares results from NB1 and NB2 under the same evaluation framework. Data comes from the cross-evaluation notebook')} <span style={S.mono}>03_evaluation.ipynb</span>.
        </p>

        <h3 style={S.h3}>{t('8.5 NB4B — Multi-Sujeto', '8.5 NB4B — Multi-Subject')}</h3>
        <p style={S.body}>
          {t('Presenta los resultados del modelo GRU entrenado con datos de los 48 pacientes simultáneamente (pool intra-paciente). Incluye métricas globales y desglose por paciente individual para evaluar la variabilidad.', 'Presents the results of the GRU model trained with data from all 48 patients simultaneously (intra-patient pool). Includes global metrics and per-patient breakdown to assess variability.')}
        </p>

        <h3 style={S.h3}>{t('8.6 NB5B — Cross-Patient (LOPO)', '8.6 NB5B — Cross-Patient (LOPO)')}</h3>
        <p style={S.body}>
          {t('La pestaña más completa. Presenta los resultados de la validación Leave-One-Patient-Out con múltiples visualizaciones:', 'The most complete tab. Presents the results of Leave-One-Patient-Out validation with multiple visualizations:')}
        </p>
        <Bullet><strong>{t('6 tarjetas KPI', '6 KPI cards')}</strong>: {t('R² medio, R² mediana, R² máximo, mejor modelo, IC 95%, número de pacientes evaluados.', 'R² mean, R² median, R² maximum, best model, 95% CI, number of evaluated patients.')}</Bullet>
        <Bullet><strong>{t('Interpretación', 'Interpretation')}</strong>: {t('análisis detallado, visible desde el primer momento.', 'detailed analysis, visible from the start.')}</Bullet>
        <Bullet><strong>{t('Tabla comprehensiva', 'Comprehensive table')}</strong>: {t('Resultados por paciente y modelo con todas las métricas.', 'Results per patient and model with all metrics.')}</Bullet>
        <Bullet><strong>Boxplots R²</strong>: {t('Distribución del R² por modelo.', 'R² distribution per model.')}</Bullet>
        <Bullet><strong>{t('R² Promedio por Paciente', 'R² Average per Patient')}</strong>: {t('Gráfico de barras con etiquetas individuales.', 'Bar chart with individual labels.')}</Bullet>
        <Bullet><strong>{t('Efecto del Fine-Tuning', 'Fine-Tuning Effect')}</strong>: {t('Comparación R² LOPO vs. R² Fine-Tuned.', 'Comparison R² LOPO vs. R² Fine-Tuned.')}</Bullet>
        <Bullet><strong>Forest Plot IC95%</strong>: {t('Intervalos de confianza por modelo.', 'Confidence intervals per model.')}</Bullet>
        <Bullet><strong>Scatter n_test vs R²</strong>: {t('Relación entre tamaño de muestra de test y rendimiento.', 'Relationship between test sample size and performance.')}</Bullet>
        <Bullet><strong>{t('Radar multi-métrica', 'Multi-metric radar')}</strong>: {t('Comparación de modelos en 4 dimensiones (R², RMSE, MAE, DTW).', 'Model comparison in 4 dimensions (R², RMSE, MAE, DTW).')}</Bullet>
        <Bullet><strong>Gap train-test</strong>: {t('Análisis de sobreajuste por modelo.', 'Overfitting analysis per model.')}</Bullet>
        <Bullet><strong>{t('Top/Bottom pacientes', 'Top/Bottom patients')}</strong>: {t('Los pacientes con mejor y peor rendimiento.', 'The patients with best and worst performance.')}</Bullet>
        <Bullet><strong>{t('Validación INCART', 'INCART Validation')}</strong>: {t('Resultados de validación externa con la base de datos INCART (75 registros, 257 Hz).', 'External validation results with the INCART database (75 records, 257 Hz).')}</Bullet>
        <Bullet><strong>{t('Hallazgos clave', 'Key findings')}</strong>: {t('Tarjetas de resumen con los hallazgos más relevantes.', 'Summary cards with the most relevant findings.')}</Bullet>
        <Bullet><strong>{t('Galería de imágenes', 'Image gallery')}</strong>: {t('Visualizaciones adicionales del notebook.', 'Additional notebook visualizations.')}</Bullet>

        <h3 style={S.h3}>{t('8.7 NB6 — Multi-step LOPO, el modelo final', '8.7 NB6 — Multi-step LOPO, the final model')}</h3>
        <p style={S.body}>
          {t('El experimento del que sale el resultado principal de la tesis. CNN-GRU-ATTN evaluado con Leave-One-Patient-Out sobre los 123 pacientes de MIT-BIH e INCART, prediciendo tres latidos por delante. R² medio de 0.6734 sobre los 123 pliegues.', 'The experiment the main thesis result comes from. CNN-GRU-ATTN evaluated with Leave-One-Patient-Out over the 123 MIT-BIH and INCART patients, predicting three beats ahead. Mean R² of 0.6734 across the 123 folds.')}
        </p>
        <Bullet>{t('Ojo con la carpeta: en disco se llama', 'Careful with the folder: on disk it is called')} <span style={S.mono}>public/data/nb5/</span>{t(', pero guarda el experimento 6. El nombre de la carpeta está mal, no el del experimento.', ', but it holds experiment 6. The folder name is wrong, not the experiment’s.')}</Bullet>
        <Bullet>{t('Distribución por paciente, contraste entre bases y degradación por horizonte, cada bloque con su n y su archivo.', 'Per-patient distribution, between-database contrast and per-horizon degradation, each block with its n and its file.')}</Bullet>

        <h3 style={S.h3}>{t('8.8 NB7 — Búsqueda de hiperparámetros', '8.8 NB7 — Hyperparameter search')}</h3>
        <p style={S.body}>
          {t('Veinte configuraciones por arquitectura, evaluadas sobre los mismos 10 pliegues LOPO de una cohorte reducida de 50 pacientes. El resultado es contraintuitivo y conviene leerlo despacio: para CNN-GRU-ATTN la búsqueda NO encontró ninguna configuración mejor que la que el proyecto ya usaba (Wilcoxon p = 1.0000). Eso no es un fracaso del experimento, es su conclusión: el R² publicado no depende de una configuración afortunada.', 'Twenty configurations per architecture, evaluated over the same 10 LOPO folds of a reduced 50-patient cohort. The result is counter-intuitive and worth reading slowly: for CNN-GRU-ATTN the search found NO configuration better than the one already in use (Wilcoxon p = 1.0000). That is not a failure of the experiment, it is its conclusion: the published R² does not depend on a lucky configuration.')}
        </p>
        <Bullet>{t('Análisis de sensibilidad por hiperparámetro, con el recorrido de R² de cada uno.', 'Per-hyperparameter sensitivity analysis, with each one’s R² range.')}</Bullet>
        <Bullet>{t('El GRU optimizado sí mejora de forma significativa, y la pestaña explica en tres puntos por qué eso no justifica cambiar el modelo final.', 'The optimized GRU does improve significantly, and the tab explains in three points why that does not justify changing the final model.')}</Bullet>
        <Bullet>{t('También aquí se mide el efecto del filtro de mediana sobre el pico R.', 'The median filter’s effect on the R peak is also measured here.')}</Bullet>

        <h3 style={S.h3}>{t('8.9 NB8 — Detección de evento', '8.9 NB8 — Event detection')}</h3>
        <p style={S.body}>
          {t('Responde a la pregunta que el resto del trabajo deja abierta: ¿sirve de algo el error de predicción? Ordenando los 316 740 latidos de 50 pacientes por su error, el área bajo la curva de precisión-exhaustividad es 0.3808, que es 3.12 veces la prevalencia de latidos ectópicos (12.22 %).', 'It answers the question the rest of the work leaves open: is the prediction error good for anything? Ranking the 316,740 beats of 50 patients by their error, the area under the precision-recall curve is 0.3808, which is 3.12 times the ectopic beat prevalence (12.22 %).')}
        </p>
        <Bullet>{t('Error por clase AAMI: el MSE medio de los latidos ectópicos es 3.16 veces el de los normales.', 'Per-AAMI-class error: the mean MSE of ectopic beats is 3.16 times that of normal ones.')}</Bullet>
        <Bullet>{t('Detección paciente a paciente, sin promediar: hay pliegues con precisión casi nula junto a pliegues altos, y una media los taparía.', 'Per-patient detection, unaveraged: there are folds with near-zero precision next to high ones, and a mean would hide them.')}</Bullet>
        <Bullet>{t('Es una señal, no un detector clínico. La pestaña lo dice y aquí se repite.', 'It is a signal, not a clinical detector. The tab says so and it bears repeating here.')}</Bullet>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 9 — EXPLORADOR
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="explorador">
        <h2 style={S.sectionTitle}>{t('9. Explorador de Resultados', '9. Results Explorer')}</h2>
        <p style={S.sectionSub}>
          {t('El Explorador permite filtrar, cruzar y visualizar libremente los datos de cualquier notebook. Es la herramienta más flexible del dashboard para análisis personalizado.', 'The Explorer allows freely filtering, cross-referencing and visualizing data from any notebook. It is the most flexible dashboard tool for custom analysis.')}
        </p>

        <h3 style={S.h3}>{t('9.1 Las ocho pestañas', '9.1 The eight tabs')}</h3>
        <p style={S.body}>
          {t('Arriba hay una pestaña por experimento, rotuladas «Exp. 1» a «Exp. 8», en el mismo orden que en la sección de Experimentos. Debajo, un panel declara el título del experimento, su cuaderno y una línea de qué contiene. Al cambiar de pestaña se limpian los filtros, para que no arrastre un filtro de la anterior y parezca que faltan datos.', 'At the top there is one tab per experiment, labelled «Exp. 1» to «Exp. 8», in the same order as in the Experiments section. Below, a panel declares the experiment title, its notebook and one line about its contents. Switching tabs clears the filters, so a filter from the previous tab does not carry over and make data look missing.')}
        </p>

        <h3 style={S.h3}>{t('9.2 Filtros', '9.2 Filters')}</h3>
        <p style={S.body}>{t('Cada pestaña ofrece los que tienen sentido para sus datos; no hay un panel único para todas:', 'Each tab offers those that make sense for its data; there is no single panel for all of them:')}</p>
        <Bullet><strong>{t('Buscar paciente', 'Search patient')}</strong>: {t('caja de texto que filtra por identificador de paciente. Presente donde hay una fila por paciente.', 'text box filtering by patient identifier. Present wherever there is one row per patient.')}</Bullet>
        <Bullet><strong>{t('Modelo', 'Model')}</strong>, <strong>{t('Filtro', 'Filter')}</strong>, <strong>{t('Métrica', 'Metric')}</strong>: {t('desplegables de un solo valor, con «Todos» como primera opción.', 'single-value dropdowns, with «All» as the first option.')}</Bullet>
        <Bullet><strong>{t('Arquitectura', 'Architecture')}</strong> ({t('solo Exp. 7', 'Exp. 7 only')}): {t('CNN_GRU_ATTN o GRU. Cambia la tabla de configuraciones y la de sensibilidad, porque cada arquitectura tuvo su propia búsqueda.', 'CNN_GRU_ATTN or GRU. It changes the configurations and sensitivity tables, because each architecture had its own search.')}</Bullet>
        <Bullet><strong>{t('Base', 'Database')}</strong> ({t('solo Exp. 8', 'Exp. 8 only')}): {t('MIT-BIH, INCART o todas.', 'MIT-BIH, INCART or all.')}</Bullet>

        <h3 style={S.h3}>{t('9.3 Qué trae cada pestaña', '9.3 What each tab contains')}</h3>
        <Bullet><strong>{t('Tarjetas de métrica', 'Metric cards')}</strong>: {t('las cifras de cabecera, cada una con su tamaño de muestra y el archivo del que sale. Sin el archivo una cifra no es comprobable, y aquí eso es lo primero que se pregunta.', 'the headline figures, each with its sample size and the file it comes from. Without the file a figure is not verifiable, and here that is the first thing anyone asks.')}</Bullet>
        <Bullet><strong>{t('Tablas', 'Tables')}</strong>: {t('ordenables pulsando en la cabecera y paginadas a 50 filas. La paginación no es un capricho: sin ella una sola tabla llegaba a 45 390 celdas y el navegador tardaba en responder.', 'sortable by clicking the header and paginated at 50 rows. Pagination is not a whim: without it a single table reached 45,390 cells and the browser became slow to respond.')}</Bullet>
        <Bullet><strong>{t('Secciones plegables', 'Collapsible sections')}</strong>: {t('«Datos crudos» y «Gráficas» vienen abiertas; las más pesadas vienen cerradas y se abren pulsando su encabezado. Están plegadas por la misma razón de rendimiento.', '«Raw data» and «Charts» come open; the heaviest ones come closed and open by clicking their header. They are collapsed for the same performance reason.')}</Bullet>
        <Bullet><strong>{t('Exportar CSV', 'Export CSV')}</strong>: {t('descarga lo que hay en pantalla con los filtros aplicados, no el archivo entero.', 'downloads what is on screen with the filters applied, not the whole file.')}</Bullet>

        <h3 style={S.h3}>{t('9.4 Las dos pestañas nuevas', '9.4 The two new tabs')}</h3>
        <Bullet><strong>Exp. 7</strong>: {t('las 20 configuraciones evaluadas con sus hiperparámetros columna a columna, la sensibilidad valor a valor, y la comparación por paciente de los modelos tradicionales. La configuración que el proyecto ya usaba viene marcada «en uso».', 'the 20 evaluated configurations with their hyperparameters column by column, sensitivity value by value, and the per-patient comparison of the traditional models. The configuration already in use is marked «en uso».')}</Bullet>
        <Bullet><strong>Exp. 8</strong>: {t('el error por clase AAMI y la detección pliegue a pliegue con sus verdaderos y falsos positivos. Mírela por filas y no por la media: la precisión varía muchísimo entre pacientes.', 'the per-AAMI-class error and per-fold detection with its true and false positives. Read it row by row rather than by the mean: precision varies a great deal between patients.')}</Bullet>

        <h3 style={S.h3}>{t('9.5 Flujo de uso', '9.5 Usage flow')}</h3>
        <NumberedStep n={1}>{t('Elija el experimento en las pestañas de arriba.', 'Choose the experiment in the tabs at the top.')}</NumberedStep>
        <NumberedStep n={2}>{t('Lea las tarjetas de cabecera y fíjese en el n y el archivo de cada una.', 'Read the header cards and note the n and the file of each one.')}</NumberedStep>
        <NumberedStep n={3}>{t('Acote con los filtros que ofrezca esa pestaña.', 'Narrow down with the filters that tab offers.')}</NumberedStep>
        <NumberedStep n={4}>{t('Abra las secciones plegadas si necesita el detalle.', 'Open the collapsed sections if you need the detail.')}</NumberedStep>
        <NumberedStep n={5}>{t('Ordene la tabla por la columna que le interese pulsando su cabecera.', 'Sort the table by the column you care about by clicking its header.')}</NumberedStep>
        <NumberedStep n={6}>{t('Exporte a CSV lo que quede filtrado.', 'Export the filtered result to CSV.')}</NumberedStep>

        <InfoBox type="info" t={t}>
          {t('La primera ejecución puede tardar entre 5 y 10 minutos mientras se descargan las dependencias (TensorFlow, etc.). Para ejecuciones posteriores, basta con:', 'The first run may take between 5 and 10 minutes while dependencies are downloaded (TensorFlow, etc.). For subsequent runs, just use:')} <span style={S.mono}>docker compose up</span> ({t('sin', 'without')} <span style={S.mono}>--build</span>).
        </InfoBox>

        <h3 style={S.h3}>{t('3.2 Detener la Aplicación', '3.2 Stop the Application')}</h3>
        <Bullet>{t('En la terminal donde está corriendo, presione', 'In the terminal where it is running, press')} <span style={S.mono}>Ctrl + C</span>.</Bullet>
        <Bullet>{t('O desde otra terminal en la misma carpeta:', 'Or from another terminal in the same folder:')} <span style={S.mono}>docker compose down</span>.</Bullet>

        <h3 style={S.h3}>{t('3.3 Verificar el Funcionamiento', '3.3 Verify Operation')}</h3>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>URL</th><th style={S.th}>{t('Resultado Esperado', 'Expected Result')}</th></tr>
            </thead>
            <tbody>
              <tr><td style={S.td}><span style={S.mono}>http://localhost</span></td><td style={S.td}>{t('Interfaz principal del dashboard', 'Dashboard main interface')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>http://localhost:8000/docs</span></td><td style={S.td}>{t('Documentación interactiva de la API (Swagger)', 'Interactive API documentation (Swagger)')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>http://localhost:8000/api/health</span></td><td style={S.td}>{t('Respuesta JSON:', 'JSON response:')} <span style={S.mono}>{`{"status":"ok"}`}</span></td></tr>
            </tbody>
          </table>
        </div>

        <InfoBox type="warning" t={t}>
          {t('Si el backend no está disponible, el dashboard opera automáticamente con datos de demostración. Las predicciones en vivo requieren que la API esté activa.', 'If the backend is not available, the dashboard automatically operates with demo data. Live predictions require the API to be active.')}
        </InfoBox>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 4 — INTERFAZ DE USUARIO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="interface">
        <h2 style={S.sectionTitle}>{t('4. Interfaz de Usuario', '4. User Interface')}</h2>

        <h3 style={S.h3}>{t('4.1 Barra de Navegación Lateral (Sidebar)', '4.1 Side Navigation Bar (Sidebar)')}</h3>
        <p style={S.body}>
          {t('La barra de navegación lateral es el punto central de acceso a todas las secciones del dashboard. Se ubica en el lado izquierdo de la pantalla y permanece visible en todo momento.', 'The side navigation bar is the central access point to all dashboard sections. It is located on the left side of the screen and remains visible at all times.')}
        </p>
        <h4 style={S.h4}>{t('Elementos de la Sidebar', 'Sidebar Elements')}</h4>
        <Bullet><strong>{t('Logo y marca', 'Logo and branding')}</strong>: {t('Logo «ECG FORECASTING» con subtexto «CESMAG · 2025» en la parte superior.', 'Logo «ECG FORECASTING» with subtext «CESMAG · 2025» at the top.')}</Bullet>
        <Bullet><strong>{t('Botón de colapso', 'Collapse button')}</strong>: {t('Permite alternar entre el modo expandido (220px, muestra ícono + texto) y el modo colapsado (72px, solo ícono).', 'Toggles between expanded mode (220px, shows icon + text) and collapsed mode (72px, icon only).')}</Bullet>
        <Bullet><strong>{t('Enlaces de navegación', 'Navigation links')}</strong>: {t('9 secciones accesibles, cada una con su ícono representativo. El enlace activo se resalta con fondo azul semitransparente e indicador circular azul a la derecha.', '9 accessible sections, each with its representative icon. The active link is highlighted with semi-transparent blue background and circular blue indicator on the right.')}</Bullet>
        <Bullet><strong>{t('Indicador MIT-BIH', 'MIT-BIH indicator')}</strong>: {t('En la parte inferior, un punto verde animado indica que la base de datos está disponible.', 'At the bottom, an animated green dot indicates the database is available.')}</Bullet>
        <Bullet><strong>{t('Botón de tema', 'Theme button')}</strong>: {t('Alterna entre el tema oscuro (predeterminado) y el tema claro.', 'Toggles between the dark theme (default) and the light theme.')}</Bullet>

        <h4 style={S.h4}>{t('Secciones de Navegación', 'Navigation Sections')}</h4>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>{t('Ícono', 'Icon')}</th><th style={S.th}>{t('Sección', 'Section')}</th><th style={S.th}>{t('Descripción', 'Description')}</th></tr>
            </thead>
            <tbody>
              {/* Estas ocho filas son exactamente las de components/layout/Navbar.tsx.
                  La tabla anterior listaba «Predicción» y «Estadísticas», que no existen,
                  y omitía «Cohorte y método», que sí. */}
              <tr><td style={S.td}><Home size={14} /></td><td style={S.td}>Home</td><td style={S.td}>{t('Página de inicio con la visión general del proyecto y los ocho hallazgos principales', 'Home page with the project overview and the eight key findings')}</td><td style={S.td}><span style={S.mono}>/</span></td></tr>
              <tr><td style={S.td}><Brain size={14} /></td><td style={S.td}>{t('Modelos', 'Models')}</td><td style={S.td}>{t('Catálogo de las arquitecturas y tabla comparativa LOPO con su n y su cohorte', 'Catalog of architectures and LOPO comparison table with its n and cohort')}</td><td style={S.td}><span style={S.mono}>/modelos</span></td></tr>
              <tr><td style={S.td}><FlaskConical size={14} /></td><td style={S.td}>{t('Experimentos', 'Experiments')}</td><td style={S.td}>{t('Los ocho experimentos, una pestaña por cada uno', 'The eight experiments, one tab each')}</td><td style={S.td}><span style={S.mono}>/experimentos</span></td></tr>
              <tr><td style={S.td}><Search size={14} /></td><td style={S.td}>{t('Explorador', 'Explorer')}</td><td style={S.td}>{t('Exploración interactiva de los datos crudos, con filtros y exportación a CSV', 'Interactive exploration of the raw data, with filters and CSV export')}</td><td style={S.td}><span style={S.mono}>/explorador</span></td></tr>
              <tr><td style={S.td}><Zap size={14} /></td><td style={S.td}>{t('Predicción LOPO', 'LOPO Prediction')}</td><td style={S.td}>{t('Predicción cross-patient en tiempo real sobre un paciente no visto', 'Real-time cross-patient prediction on an unseen patient')}</td><td style={S.td}><span style={S.mono}>/lopo</span></td></tr>
              <tr><td style={S.td}><Users size={14} /></td><td style={S.td}>{t('Cohorte y método', 'Cohort & method')}</td><td style={S.td}>{t('Quiénes son los pacientes, dónde falla el modelo y por qué se descartó el filtro de mediana', 'Who the patients are, where the model fails, and why the median filter was discarded')}</td><td style={S.td}><span style={S.mono}>/cohorte</span></td></tr>
              <tr><td style={S.td}><BookOpen size={14} /></td><td style={S.td}>{t('Manual', 'User Guide')}</td><td style={S.td}>{t('Esta guía de usuario', 'This user guide')}</td><td style={S.td}><span style={S.mono}>/manual</span></td></tr>
              <tr><td style={S.td}><BookText size={14} /></td><td style={S.td}>{t('Glosario', 'Glossary')}</td><td style={S.td}>{t('Diccionario de términos técnicos', 'Dictionary of technical terms')}</td><td style={S.td}><span style={S.mono}>/glosario</span></td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('4.2 Tema Claro / Oscuro', '4.2 Light / Dark Theme')}</h3>
        <p style={S.body}>
          {t('El dashboard incluye un sistema de temas con dos modos visuales. Para cambiar de tema, utilice el botón con ícono de sol/luna ubicado en la parte inferior de la barra de navegación.', 'The dashboard includes a theme system with two visual modes. To change the theme, use the sun/moon icon button located at the bottom of the navigation bar.')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <Moon size={14} color="var(--prediction)" />
            <span style={{ ...S.body, fontSize: 'var(--fs-xs)' }}><strong>{t('Modo oscuro', 'Dark mode')}</strong> ({t('predeterminado', 'default')}): {t('fondo oscuro, texto claro. Ideal para reducir fatiga visual.', 'dark background, light text. Ideal for reducing eye strain.')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <Sun size={14} color="#f59e0b" />
            <span style={{ ...S.body, fontSize: 'var(--fs-xs)' }}><strong>{t('Modo claro', 'Light mode')}</strong>: {t('fondo blanco, texto oscuro. Adecuado para ambientes con iluminación intensa.', 'white background, dark text. Suitable for brightly lit environments.')}</span>
          </div>
        </div>

        <h3 style={S.h3}>{t('4.3 Diseño Responsivo', '4.3 Responsive Design')}</h3>
        <p style={S.body}>
          {t('La interfaz se adapta automáticamente a diferentes tamaños de pantalla. En dispositivos móviles (ancho ≤ 768px), la barra lateral se convierte en un menú desplegable (drawer) accesible mediante un botón hamburguesa. Los gráficos y tablas se reorganizan verticalmente para facilitar la lectura.', 'The interface automatically adapts to different screen sizes. On mobile devices (width ≤ 768px), the sidebar becomes a dropdown menu (drawer) accessible via a hamburger button. Charts and tables are reorganized vertically for easier reading.')}
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 5 — HOME
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="home">
        <h2 style={S.sectionTitle}>{t('5. Página de Inicio (Home)', '5. Home Page')}</h2>
        <p style={S.sectionSub}>
          {t('La página de inicio presenta una visión general del proyecto y facilita la navegación rápida hacia las secciones principales.', 'The home page presents a project overview and facilitates quick navigation to the main sections.')}
        </p>

        <h3 style={S.h3}>{t('5.1 Secciones de la Página', '5.1 Page Sections')}</h3>

        <h4 style={S.h4}>{t('Hero (Sección Principal)', 'Hero (Main Section)')}</h4>
        <Bullet>{t('Título del proyecto con efecto visual animado y fondo decorativo con gradientes.', 'Project title with animated visual effect and decorative gradient background.')}</Bullet>
        <Bullet><strong>{t('Animación ECG decorativa', 'Decorative ECG animation')}</strong>: {t('Canvas decorativo con un trazado sintético en desplazamiento continuo. Está rotulado como sintético a propósito: no es una señal real de ningún paciente.', 'Decorative canvas with a synthetic trace in continuous scroll. It is labelled as synthetic on purpose: it is not a real signal from any patient.')}</Bullet>
        <Bullet>{t('Afiliación institucional: «Universidad CESMAG · Ingeniería de Sistemas · 2025–2026».', 'Institutional affiliation: «Universidad CESMAG · Systems Engineering · 2025–2026».')}</Bullet>

        <h4 style={S.h4}>{t('Visión General (3 tarjetas)', 'Overview (3 cards)')}</h4>
        <Bullet><strong>{t('Enfoques Experimentales', 'Experimental Approaches')}</strong>: {t('Describe Exp A (ventanas de 5s) y Exp B (latido a latido, 256 muestras).', 'Describes Exp A (5s windows) and Exp B (beat to beat, 256 samples).')}</Bullet>
        <Bullet><strong>{t('Modelos Implementados', 'Implemented Models')}</strong>: {t('Muestra badges de ML Clásico (LinReg, DT, RF, SVR, MLP, ARIMA) y Deep Learning (LSTM, GRU, CNN-LSTM, CNN-GRU).', 'Shows badges for Classic ML (LinReg, DT, RF, SVR, MLP, ARIMA) and Deep Learning (LSTM, GRU, CNN-LSTM, CNN-GRU).')}</Bullet>
        <Bullet><strong>{t('Evaluación', 'Evaluation')}</strong>: {t('KPIs resumen — 48 pacientes, 7 pipelines de preprocesamiento, métricas R², RMSE, MAE, DTW.', 'Summary KPIs — 48 patients, 7 preprocessing pipelines, R², RMSE, MAE, DTW metrics.')}</Bullet>

        <h4 style={S.h4}>{t('Metodología (Pipeline Visual)', 'Methodology (Visual Pipeline)')}</h4>
        <Bullet>{t('Diagrama horizontal de 5 pasos conectados por flechas: MIT-BIH → Preprocesamiento → Segmentación → Entrenamiento → Evaluación.', 'Horizontal diagram of 5 steps connected by arrows: MIT-BIH → Preprocessing → Segmentation → Training → Evaluation.')}</Bullet>

        <h4 style={S.h4}>{t('Resultados Destacados (4 tarjetas)', 'Key Results (4 cards)')}</h4>
        <Bullet>{t('Exp B supera consistentemente a Exp A.', 'Exp B consistently outperforms Exp A.')}</Bullet>
        <Bullet>{t('GRU: mejor modelo Deep Learning (R² = 0.6592).', 'GRU: best Deep Learning model (R² = 0.6592).')}</Bullet>
        <Bullet>{t('Random Forest: mejor modelo tradicional (R² = 0.6264).', 'Random Forest: best traditional model (R² = 0.6264).')}</Bullet>
        <Bullet>{t('El filtro de mediana (F_MED) da el mejor R² en esta fase, pero por aplanar el pico R: el modelo final lo descarta.', 'The median filter (F_MED) gives the best R² in this phase, but by flattening the R peak: the final model discards it.')}</Bullet>

        <h4 style={S.h4}>{t('Navegación Rápida', 'Quick Navigation')}</h4>
        <Bullet>{t('6 tarjetas que llevan a: Modelos, Experimentos, Predicción LOPO, Explorador, Manual y Glosario. La navegación completa, incluida «Cohorte y método», está en el menú lateral.', '6 cards linking to: Models, Experiments, LOPO Prediction, Explorer, User Guide and Glossary. The full navigation, including «Cohort & method», is in the side menu.')}</Bullet>

        <h4 style={S.h4}>{t('Equipo de Investigación', 'Research Team')}</h4>
        <Bullet>{t('3 tarjetas con foto circular, nombre, rol y detalle de cada integrante del equipo.', '3 cards with circular photo, name, role and details of each team member.')}</Bullet>

        <h4 style={S.h4}>{t('Base de Datos', 'Database')}</h4>
        <Bullet>{t('Logo institucional + 3 mini-cards informativas (48 registros, 360 Hz, ~30 min) + chips descriptivos.', 'Institutional logo + 3 informative mini-cards (48 records, 360 Hz, ~30 min) + descriptive chips.')}</Bullet>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 6 — MODELOS
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="modelos">
        <h2 style={S.sectionTitle}>{t('6. Catálogo de Modelos', '6. Models Catalog')}</h2>
        <p style={S.sectionSub}>
          {t('La sección «Modelos» presenta información detallada sobre cada arquitectura de predicción utilizada en el proyecto, organizada en tres categorías.', 'The «Models» section presents detailed information about each prediction architecture used in the project, organized into three categories.')}
        </p>

        <h3 style={S.h3}>{t('6.1 Categorías de Modelos', '6.1 Model Categories')}</h3>
        <p style={S.body}>{t('En la parte superior, tres botones permiten alternar entre las categorías:', 'At the top, three buttons allow switching between categories:')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px', marginBottom: '14px' }}>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--prediction)' }}>Deep Learning</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '4px' }}>LSTM, GRU, CNN-GRU</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: '#10b981' }}>ML Tradicional</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '4px' }}>RF, MLP, SVR (RBF), DT</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: '#f59e0b' }}>Cross-Patient (LOPO)</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '4px' }}>GRU base, CNN GRU, BiGRU MHA, Ensemble</p>
          </div>
        </div>

        <h3 style={S.h3}>{t('6.2 Información por Modelo', '6.2 Model Information')}</h3>
        <p style={S.body}>{t('Al seleccionar un modelo, se despliega una tarjeta detallada con:', 'When selecting a model, a detailed card is displayed with:')}</p>
        <Bullet><strong>{t('Nombre completo y resumen', 'Full name and summary')}</strong>: {t('Descripción concisa de la arquitectura.', 'Concise description of the architecture.')}</Bullet>
        <Bullet><strong>{t('Mecanismo interno', 'Internal mechanism')}</strong>: {t('Explicación técnica del funcionamiento del modelo.', 'Technical explanation of model operation.')}</Bullet>
        <Bullet><strong>{t('Fortalezas', 'Strengths')}</strong>: {t('Ventajas del modelo (marcadas con «+» azul).', 'Model advantages (marked with blue «+»).')}</Bullet>
        <Bullet><strong>{t('Compromisos', 'Trade-offs')}</strong>: {t('Limitaciones o trade-offs (marcados con «~» amarillo).', 'Limitations or trade-offs (marked with yellow «~»).')}</Bullet>
        <Bullet><strong>{t('¿Por qué para ECG?', 'Why for ECG?')}</strong>: {t('Justificación de la elección del modelo para señales electrocardiográficas.', 'Justification for choosing the model for electrocardiographic signals.')}</Bullet>

        <h3 style={S.h3}>{t('6.3 Diagrama de Arquitectura', '6.3 Architecture Diagram')}</h3>
        <p style={S.body}>
          {t('Cada modelo incluye un diagrama SVG interactivo que ilustra su arquitectura interna:', 'Each model includes an interactive SVG diagram illustrating its internal architecture:')}
        </p>
        <Bullet><strong>Deep Learning</strong>: {t('Nodos de flujo (Input → capas recurrentes/convolucionales → Output) con colores diferenciados por tipo de capa.', 'Flow nodes (Input → recurrent/convolutional layers → Output) with colors differentiated by layer type.')}</Bullet>
        <Bullet><strong>{t('ML Tradicional', 'Traditional ML')}</strong>: {t('Diagramas conceptuales personalizados (RF = bosque de árboles → promedio, MLP = capas de neuronas, SVR = kernel RBF, DT = árbol de decisión).', 'Custom conceptual diagrams (RF = tree forest → average, MLP = neuron layers, SVR = RBF kernel, DT = decision tree).')}</Bullet>

        <h3 style={S.h3}>{t('6.4 Tabla Comparativa', '6.4 Comparative Table')}</h3>
        <p style={S.body}>
          {t('En la parte inferior de cada categoría se muestra una tabla comparativa con las métricas clave de todos los modelos de esa categoría, incluyendo R² Exp A, R² Exp B, tipo, framework, velocidad de entrenamiento y observaciones relevantes.', 'At the bottom of each category, a comparative table is shown with the key metrics of all models in that category, including R² Exp A, R² Exp B, type, framework, training speed and relevant observations.')}
        </p>

        <h3 style={S.h3}>{t('6.5 Cómo Usar esta Sección', '6.5 How to Use this Section')}</h3>
        <NumberedStep n={1}>{t('Seleccione una categoría (Deep Learning, ML Tradicional o LOPO).', 'Select a category (Deep Learning, Traditional ML or LOPO).')}</NumberedStep>
        <NumberedStep n={2}>{t('Haga clic en el nombre del modelo deseado en la fila de pestañas.', 'Click on the desired model name in the tab row.')}</NumberedStep>
        <NumberedStep n={3}>{t('Observe la descripción, diagrama, hiperparámetros y fortalezas del modelo.', 'Observe the description, diagram, hyperparameters and strengths of the model.')}</NumberedStep>
        <NumberedStep n={4}>{t('Consulte la tabla comparativa al final para comparar con otros modelos de la misma categoría.', 'Check the comparative table at the bottom to compare with other models in the same category.')}</NumberedStep>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 7 — PREDICCIÓN LOPO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="lopo">
        <h2 style={S.sectionTitle}>{t('7. Predicción LOPO (Cross-Patient)', '7. LOPO Prediction (Cross-Patient)')}</h2>
        <p style={S.sectionSub}>
          {t('La sección LOPO (Leave-One-Patient-Out) permite realizar predicciones utilizando un modelo entrenado con 47 pacientes y evaluado sobre el paciente excluido. Mide la capacidad de generalización del modelo a pacientes nunca vistos durante el entrenamiento.', 'The LOPO (Leave-One-Patient-Out) section allows making predictions using a model trained with 47 patients and evaluated on the excluded patient. It measures the model\'s generalization capability to patients never seen during training.')}
        </p>

        <h3 style={S.h3}>{t('7.1 Modelo LOPO', '7.1 LOPO Model')}</h3>
        <div style={{ overflowX: 'auto', marginTop: '8px', marginBottom: '14px' }}>
          <table style={S.table}>
            <thead><tr><th style={S.th}>{t('Parámetro', 'Parameter')}</th><th style={S.th}>{t('Valor', 'Value')}</th></tr></thead>
            <tbody>
              <tr><td style={S.td}>{t('Modelo', 'Model')}</td><td style={S.td}>GRU_weighted</td></tr>
              <tr><td style={S.td}>{t('Filtro', 'Filter')}</td><td style={S.td}>F_N+PB+MED (Notch + {t('Pasabanda', 'Bandpass')} + {t('Mediana', 'Median')})</td></tr>
              <tr><td style={S.td}>Lookback</td><td style={S.td}>{t('5 latidos', '5 beats')}</td></tr>
              <tr><td style={S.td}>{t('R² medio LOPO', 'R² mean LOPO')}</td><td style={S.td}>0.5311</td></tr>
              <tr><td style={S.td}>IC 95%</td><td style={S.td}>[0.4534, 0.6128]</td></tr>
              <tr><td style={S.td}>{t('Característica especial', 'Special feature')}</td><td style={S.td}>{t('Incluye intervalos RR como feature adicional', 'Includes RR intervals as additional feature')}</td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('7.2 Configuración', '7.2 Configuration')}</h3>
        <p style={S.body}>{t('La interfaz se organiza en tres bloques: la fuente de la señal, el modo de predicción y la visualización de resultados.', 'The interface has three blocks: the signal source, the prediction mode and the results view.')}</p>

        <h4 style={S.h4}>{t('Fuente de Señal', 'Signal Source')}</h4>
        <Bullet>{t('Selector de paciente en dos grupos: MIT-BIH e INCART. Los pacientes marcados en verde tienen señal disponible en el servicio; el resto se atiende con la señal de demostración. No hay carga de archivos propios.', 'Patient selector in two groups: MIT-BIH and INCART. Patients marked green have their signal available from the service; the rest fall back to the demonstration signal. There is no upload of your own files.')}</Bullet>

        <h4 style={S.h4}>{t('Modo de Predicción', 'Prediction Mode')}</h4>
        <p style={S.body}>{t('Dos modos disponibles:', 'Two available modes:')}</p>
        <Bullet><strong>{t('Prospectivo', 'Prospective')}</strong>: {t('Predicción rolling latido a latido. Parámetros ajustables: latidos a predecir, posiciones, ancla y filtrar ruido.', 'Rolling beat-by-beat prediction. Adjustable parameters: beats to predict, positions, anchor and noise filter.')}</Bullet>
        <Bullet><strong>{t('Futuro', 'Future')}</strong> ({t('exclusivo de LOPO', 'LOPO exclusive')}): {t('Modo de generación autoregresiva que simula la continuación de la señal ECG más allá de los datos disponibles.', 'Autoregressive generation mode that simulates the continuation of the ECG signal beyond available data.')}</Bullet>

        <h3 style={S.h3}>{t('7.3 Modo Futuro — Generación Autoregresiva', '7.3 Future Mode — Autoregressive Generation')}</h3>
        <p style={S.body}>
          {t('Este modo exclusivo simula la continuación de la señal ECG del paciente de forma autoregresiva: la predicción de cada latido se utiliza como entrada para predecir el siguiente, generando así una señal futura continua.', 'This exclusive mode simulates the continuation of the patient\'s ECG signal autoregressively: each beat\'s prediction is used as input to predict the next one, thus generating a continuous future signal.')}
        </p>
        <Bullet><strong>{t('Duración', 'Duration')}</strong>: {t('Ajustable mediante un slider (en minutos) que controla la cantidad de señal futura a generar.', 'Adjustable via a slider (in minutes) that controls the amount of future signal to generate.')}</Bullet>
        <Bullet><strong>{t('Monitor ECG', 'ECG Monitor')}</strong>: {t('Visualización tipo monitor clínico con indicador «LIVE» rojo pulsante y la señal generada en tiempo real.', 'Clinical monitor-style visualization with pulsing red «LIVE» indicator and the generated signal in real time.')}</Bullet>
        <Bullet><strong>{t('Alertas clínicas', 'Clinical alerts')}</strong>: {t('Sistema de detección automática de anomalías durante la generación, con categorías:', 'Automatic anomaly detection system during generation, with categories:')}</Bullet>
        <div style={{ marginLeft: '28px' }}>
          <Bullet><span style={S.badge('#ef4444')}>{t('Morfología', 'Morphology')}</span> — {t('Cambios en la forma del latido', 'Changes in beat shape')}</Bullet>
          <Bullet><span style={S.badge('#f59e0b')}>{t('Amplitud', 'Amplitude')}</span> — {t('Variaciones anormales de amplitud', 'Abnormal amplitude variations')}</Bullet>
          <Bullet><span style={S.badge('#3b82f6')}>{t('Ritmo', 'Rhythm')}</span> — {t('Irregularidades en el intervalo R-R', 'R-R interval irregularities')}</Bullet>
          <Bullet><span style={S.badge('#8b5cf6')}>Flatline</span> — {t('Detección de señal plana', 'Flat signal detection')}</Bullet>
        </div>
        <Bullet><strong>{t('Métricas de estabilidad', 'Stability metrics')}</strong>: {t('R² morfológico, R² auto-similaridad, estabilidad de amplitud, DTW, RMSE, MAE, amplitud QRS.', 'Morphological R², auto-similarity R², amplitude stability, DTW, RMSE, MAE, QRS amplitude.')}</Bullet>

        <InfoBox type="warning" t={t}>
          {t('La normalización LOPO es', 'LOPO normalization is')} <strong>per-beat instance</strong> ({t('no global como NB4B', 'not global like NB4B')}). {t('Esto significa que cada latido se normaliza individualmente. El modelo GRU_weighted también utiliza los intervalos RR como entrada adicional para mejorar la generalización.', 'This means each beat is normalized individually. The GRU_weighted model also uses RR intervals as additional input to improve generalization.')}
        </InfoBox>

        <h3 style={S.h3}>{t('7.4 Flujo de Uso Paso a Paso', '7.4 Step-by-Step Usage Flow')}</h3>
        <NumberedStep n={1}>{t('Seleccione la fuente de señal y el paciente.', 'Select the signal source and patient.')}</NumberedStep>
        <NumberedStep n={2}>{t('Elija el modo:', 'Choose the mode:')} <strong>{t('Prospectivo', 'Prospective')}</strong> ({t('evaluación directa', 'direct evaluation')}) {t('o', 'or')} <strong>{t('Futuro', 'Future')}</strong> ({t('generación continua', 'continuous generation')}).</NumberedStep>
        <NumberedStep n={3}>{t('Configure los parámetros del modo seleccionado.', 'Configure the selected mode parameters.')}</NumberedStep>
        <NumberedStep n={4}>{t('Haga clic en', 'Click')} <strong>{t('Iniciar', 'Start')}</strong> {t('para comenzar.', 'to begin.')}</NumberedStep>
        <NumberedStep n={5}>{t('En modo Futuro, observe las alertas clínicas y las métricas de estabilidad.', 'In Future mode, observe the clinical alerts and stability metrics.')}</NumberedStep>
        <NumberedStep n={6}>{t('Use', 'Use')} <strong>{t('Detener', 'Stop')}</strong> {t('o', 'or')} <strong>Reset</strong> {t('según sea necesario.', 'as needed.')}</NumberedStep>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 8 — EXPERIMENTOS
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="experimentos">
        <h2 style={S.sectionTitle}>{t('8. Experimentos', '8. Experiments')}</h2>
        <p style={S.sectionSub}>
          {t('La sección de Experimentos presenta los resultados completos de los ocho cuadernos del proyecto. Cada pestaña declara su cuaderno, su base de datos y su partición, y cada cifra lleva el archivo del que sale.', 'The Experiments section presents the complete results of the eight project notebooks. Each tab declares its notebook, database and split, and every figure carries the file it comes from.')}
        </p>

        <h3 style={S.h3}>{t('8.1 Navegación por Pestañas', '8.1 Tab Navigation')}</h3>
        <p style={S.body}>
          {t('Arriba hay ocho pestañas, rótuladas «Exp. 1» a «Exp. 8». El orden es el de los experimentos, que no coincide con el alfabético de los cuadernos: NB5B es el quinto y NB6 el sexto.', 'There are eight tabs at the top, labelled «Exp. 1» to «Exp. 8». The order is that of the experiments, which does not match the notebooks’ alphabetical order: NB5B is the fifth and NB6 the sixth.')}
        </p>
        <div style={{ overflowX: 'auto', marginTop: '8px', marginBottom: '14px' }}>
          <table style={S.table}>
            <thead><tr><th style={S.th}>{t('Pestaña', 'Tab')}</th><th style={S.th}>{t('Nombre', 'Name')}</th><th style={S.th}>{t('Contenido Principal', 'Main Content')}</th></tr></thead>
            <tbody>
              <tr><td style={S.td}><span style={S.badge('#3b82f6')}>Exp. 1 · NB1</span></td><td style={S.td}>{t('Tradicionales', 'Traditional')}</td><td style={S.td}>RF, SVR, MLP, DT, LinReg, ARIMA — Exp A {t('y', 'and')} Exp B</td></tr>
              <tr><td style={S.td}><span style={S.badge('#8b5cf6')}>Exp. 2 · NB2</span></td><td style={S.td}>Deep Learning</td><td style={S.td}>LSTM, GRU, CNN-LSTM, CNN-GRU — Exp A {t('y', 'and')} Exp B</td></tr>
              <tr><td style={S.td}><span style={S.badge('#10b981')}>Exp. 3 · NB3</span></td><td style={S.td}>{t('Evaluación', 'Evaluation')}</td><td style={S.td}>{t('Comparación cruzada entre notebooks', 'Cross-comparison between notebooks')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#f59e0b')}>Exp. 4 · NB4B</span></td><td style={S.td}>{t('Multi-sujeto', 'Multi-subject')}</td><td style={S.td}>{t('Modelo GRU pool de 48 pacientes', 'GRU model 48-patient pool')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#ef4444')}>Exp. 5 · NB5B</span></td><td style={S.td}>Cross-patient</td><td style={S.td}>{t('LOPO sobre 48 pacientes de MIT-BIH, con fine-tuning y validación externa en INCART', 'LOPO over 48 MIT-BIH patients, with fine-tuning and external INCART validation')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#06b6d4')}>Exp. 6 · NB6</span></td><td style={S.td}>{t('Multi-step LOPO', 'Multi-step LOPO')}</td><td style={S.td}>{t('CNN-GRU-ATTN sobre los 123 pacientes de MIT-BIH e INCART, horizonte H=3 — el modelo final', 'CNN-GRU-ATTN over the 123 MIT-BIH and INCART patients, horizon H=3 — the final model')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#a855f7')}>Exp. 7 · NB7</span></td><td style={S.td}>{t('Hiperparámetros', 'Hyperparameters')}</td><td style={S.td}>{t('Búsqueda sistemática y análisis de sensibilidad; también el efecto del filtro de mediana', 'Systematic search and sensitivity analysis; also the median filter effect')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#14b8a6')}>Exp. 8 · NB8</span></td><td style={S.td}>{t('Detección de evento', 'Event detection')}</td><td style={S.td}>{t('Error por clase AAMI y detección de latido ectópico ordenando por el residuo', 'Per-AAMI-class error and ectopic beat detection by ranking on the residual')}</td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('8.2 NB1 — Modelos Tradicionales de ML', '8.2 NB1 — Traditional ML Models')}</h3>
        <p style={S.body}>{t('Presenta los resultados de los modelos de Machine Learning clásico entrenados por paciente individual.', 'Presents the results of classic Machine Learning models trained per individual patient.')}</p>
        <h4 style={S.h4}>{t('Elementos visuales', 'Visual elements')}</h4>
        <Bullet><strong>{t('Banner de encabezado', 'Header banner')}</strong>: {t('Título, subtexto y metadata (dataset, partición, evaluaciones totales, modelos y pipelines).', 'Title, subtext and metadata (dataset, split, total evaluations, models and pipelines).')}</Bullet>
        <Bullet><strong>{t('4 tarjetas KPI', '4 KPI cards')}</strong>: {t('Mejor R² Exp A, Mejor R² Exp B, Mejora A→B (%), Filtro óptimo.', 'Best R² Exp A, Best R² Exp B, Improvement A→B (%), Optimal filter.')}</Bullet>
        <Bullet><strong>{t('Gráfico de barras', 'Bar chart')}</strong>: {t('R² por modelo para Exp A y Exp B.', 'R² per model for Exp A and Exp B.')}</Bullet>
        <Bullet><strong>Forest Plot</strong>: {t('Intervalos de confianza al 95% para cada modelo.', '95% confidence intervals for each model.')}</Bullet>
        <Bullet><strong>Heatmaps</strong>: {t('Mapas de calor Filtro × Horizonte (Exp A) y Filtro × Lookback (Exp B).', 'Filter × Horizon (Exp A) and Filter × Lookback (Exp B) heatmaps.')}</Bullet>
        <Bullet><strong>{t('Tabla de resultados', 'Results table')}</strong>: {t('Resumen completo con todas las métricas por modelo y configuración.', 'Complete summary with all metrics per model and configuration.')}</Bullet>
        <Bullet><strong>{t('Pruebas de Wilcoxon', 'Wilcoxon tests')}</strong>: {t('Significancia estadística de cada modelo vs. persistencia (modelo base).', 'Statistical significance of each model vs. persistence (baseline model).')}</Bullet>
        <Bullet><strong>{t('Análisis de sobreajuste', 'Overfitting analysis')}</strong>: {t('Gap R² (diferencia entre train y test).', 'R² Gap (difference between train and test).')}</Bullet>
        <Bullet><strong>{t('Interpretación', 'Interpretation')}</strong>: {t('Análisis textual de los resultados. Sale completo al entrar; ya no hay que desplegarlo.', 'Textual analysis of the results. It is shown in full on entry; no longer collapsed.')}</Bullet>

        <h3 style={S.h3}>{t('8.3 NB2 — Deep Learning', '8.3 NB2 — Deep Learning')}</h3>
        <p style={S.body}>
          {t('Estructura idéntica a NB1, aplicada a los modelos de aprendizaje profundo. Incluye los mismos elementos (KPIs, barras, forest plot, heatmaps, tabla, Wilcoxon, sobreajuste) para LSTM, GRU, CNN-LSTM y CNN-GRU.', 'Identical structure to NB1, applied to deep learning models. Includes the same elements (KPIs, bars, forest plot, heatmaps, table, Wilcoxon, overfitting) for LSTM, GRU, CNN-LSTM and CNN-GRU.')}
        </p>

        <h3 style={S.h3}>{t('8.4 NB3 — Evaluación Cruzada', '8.4 NB3 — Cross Evaluation')}</h3>
        <p style={S.body}>
          {t('Compara los resultados de NB1 y NB2 bajo un mismo marco de evaluación. Los datos provienen del notebook de evaluación cruzada', 'Compares results from NB1 and NB2 under the same evaluation framework. Data comes from the cross-evaluation notebook')} <span style={S.mono}>03_evaluation.ipynb</span>.
        </p>

        <h3 style={S.h3}>{t('8.5 NB4B — Multi-Sujeto', '8.5 NB4B — Multi-Subject')}</h3>
        <p style={S.body}>
          {t('Presenta los resultados del modelo GRU entrenado con datos de los 48 pacientes simultáneamente (pool intra-paciente). Incluye métricas globales y desglose por paciente individual para evaluar la variabilidad.', 'Presents the results of the GRU model trained with data from all 48 patients simultaneously (intra-patient pool). Includes global metrics and per-patient breakdown to assess variability.')}
        </p>

        <h3 style={S.h3}>{t('8.6 NB5B — Cross-Patient (LOPO)', '8.6 NB5B — Cross-Patient (LOPO)')}</h3>
        <p style={S.body}>
          {t('La pestaña más completa. Presenta los resultados de la validación Leave-One-Patient-Out con múltiples visualizaciones:', 'The most complete tab. Presents the results of Leave-One-Patient-Out validation with multiple visualizations:')}
        </p>
        <Bullet><strong>{t('6 tarjetas KPI', '6 KPI cards')}</strong>: {t('R² medio, R² mediana, R² máximo, mejor modelo, IC 95%, número de pacientes evaluados.', 'R² mean, R² median, R² maximum, best model, 95% CI, number of evaluated patients.')}</Bullet>
        <Bullet><strong>{t('Interpretación', 'Interpretation')}</strong>: {t('análisis detallado, visible desde el primer momento.', 'detailed analysis, visible from the start.')}</Bullet>
        <Bullet><strong>{t('Tabla comprehensiva', 'Comprehensive table')}</strong>: {t('Resultados por paciente y modelo con todas las métricas.', 'Results per patient and model with all metrics.')}</Bullet>
        <Bullet><strong>Boxplots R²</strong>: {t('Distribución del R² por modelo.', 'R² distribution per model.')}</Bullet>
        <Bullet><strong>{t('R² Promedio por Paciente', 'R² Average per Patient')}</strong>: {t('Gráfico de barras con etiquetas individuales.', 'Bar chart with individual labels.')}</Bullet>
        <Bullet><strong>{t('Efecto del Fine-Tuning', 'Fine-Tuning Effect')}</strong>: {t('Comparación R² LOPO vs. R² Fine-Tuned.', 'Comparison R² LOPO vs. R² Fine-Tuned.')}</Bullet>
        <Bullet><strong>Forest Plot IC95%</strong>: {t('Intervalos de confianza por modelo.', 'Confidence intervals per model.')}</Bullet>
        <Bullet><strong>Scatter n_test vs R²</strong>: {t('Relación entre tamaño de muestra de test y rendimiento.', 'Relationship between test sample size and performance.')}</Bullet>
        <Bullet><strong>{t('Radar multi-métrica', 'Multi-metric radar')}</strong>: {t('Comparación de modelos en 4 dimensiones (R², RMSE, MAE, DTW).', 'Model comparison in 4 dimensions (R², RMSE, MAE, DTW).')}</Bullet>
        <Bullet><strong>Gap train-test</strong>: {t('Análisis de sobreajuste por modelo.', 'Overfitting analysis per model.')}</Bullet>
        <Bullet><strong>{t('Top/Bottom pacientes', 'Top/Bottom patients')}</strong>: {t('Los pacientes con mejor y peor rendimiento.', 'The patients with best and worst performance.')}</Bullet>
        <Bullet><strong>{t('Validación INCART', 'INCART Validation')}</strong>: {t('Resultados de validación externa con la base de datos INCART (75 registros, 257 Hz).', 'External validation results with the INCART database (75 records, 257 Hz).')}</Bullet>
        <Bullet><strong>{t('Hallazgos clave', 'Key findings')}</strong>: {t('Tarjetas de resumen con los hallazgos más relevantes.', 'Summary cards with the most relevant findings.')}</Bullet>
        <Bullet><strong>{t('Galería de imágenes', 'Image gallery')}</strong>: {t('Visualizaciones adicionales del notebook.', 'Additional notebook visualizations.')}</Bullet>

        <h3 style={S.h3}>{t('8.7 NB6 — Multi-step LOPO, el modelo final', '8.7 NB6 — Multi-step LOPO, the final model')}</h3>
        <p style={S.body}>
          {t('El experimento del que sale el resultado principal de la tesis. CNN-GRU-ATTN evaluado con Leave-One-Patient-Out sobre los 123 pacientes de MIT-BIH e INCART, prediciendo tres latidos por delante. R² medio de 0.6734 sobre los 123 pliegues.', 'The experiment the main thesis result comes from. CNN-GRU-ATTN evaluated with Leave-One-Patient-Out over the 123 MIT-BIH and INCART patients, predicting three beats ahead. Mean R² of 0.6734 across the 123 folds.')}
        </p>
        <Bullet>{t('Ojo con la carpeta: en disco se llama', 'Careful with the folder: on disk it is called')} <span style={S.mono}>public/data/nb5/</span>{t(', pero guarda el experimento 6. El nombre de la carpeta está mal, no el del experimento.', ', but it holds experiment 6. The folder name is wrong, not the experiment’s.')}</Bullet>
        <Bullet>{t('Distribución por paciente, contraste entre bases y degradación por horizonte, cada bloque con su n y su archivo.', 'Per-patient distribution, between-database contrast and per-horizon degradation, each block with its n and its file.')}</Bullet>

        <h3 style={S.h3}>{t('8.8 NB7 — Búsqueda de hiperparámetros', '8.8 NB7 — Hyperparameter search')}</h3>
        <p style={S.body}>
          {t('Veinte configuraciones por arquitectura, evaluadas sobre los mismos 10 pliegues LOPO de una cohorte reducida de 50 pacientes. El resultado es contraintuitivo y conviene leerlo despacio: para CNN-GRU-ATTN la búsqueda NO encontró ninguna configuración mejor que la que el proyecto ya usaba (Wilcoxon p = 1.0000). Eso no es un fracaso del experimento, es su conclusión: el R² publicado no depende de una configuración afortunada.', 'Twenty configurations per architecture, evaluated over the same 10 LOPO folds of a reduced 50-patient cohort. The result is counter-intuitive and worth reading slowly: for CNN-GRU-ATTN the search found NO configuration better than the one already in use (Wilcoxon p = 1.0000). That is not a failure of the experiment, it is its conclusion: the published R² does not depend on a lucky configuration.')}
        </p>
        <Bullet>{t('Análisis de sensibilidad por hiperparámetro, con el recorrido de R² de cada uno.', 'Per-hyperparameter sensitivity analysis, with each one’s R² range.')}</Bullet>
        <Bullet>{t('El GRU optimizado sí mejora de forma significativa, y la pestaña explica en tres puntos por qué eso no justifica cambiar el modelo final.', 'The optimized GRU does improve significantly, and the tab explains in three points why that does not justify changing the final model.')}</Bullet>
        <Bullet>{t('También aquí se mide el efecto del filtro de mediana sobre el pico R.', 'The median filter’s effect on the R peak is also measured here.')}</Bullet>

        <h3 style={S.h3}>{t('8.9 NB8 — Detección de evento', '8.9 NB8 — Event detection')}</h3>
        <p style={S.body}>
          {t('Responde a la pregunta que el resto del trabajo deja abierta: ¿sirve de algo el error de predicción? Ordenando los 316 740 latidos de 50 pacientes por su error, el área bajo la curva de precisión-exhaustividad es 0.3808, que es 3.12 veces la prevalencia de latidos ectópicos (12.22 %).', 'It answers the question the rest of the work leaves open: is the prediction error good for anything? Ranking the 316,740 beats of 50 patients by their error, the area under the precision-recall curve is 0.3808, which is 3.12 times the ectopic beat prevalence (12.22 %).')}
        </p>
        <Bullet>{t('Error por clase AAMI: el MSE medio de los latidos ectópicos es 3.16 veces el de los normales.', 'Per-AAMI-class error: the mean MSE of ectopic beats is 3.16 times that of normal ones.')}</Bullet>
        <Bullet>{t('Detección paciente a paciente, sin promediar: hay pliegues con precisión casi nula junto a pliegues altos, y una media los taparía.', 'Per-patient detection, unaveraged: there are folds with near-zero precision next to high ones, and a mean would hide them.')}</Bullet>
        <Bullet>{t('Es una señal, no un detector clínico. La pestaña lo dice y aquí se repite.', 'It is a signal, not a clinical detector. The tab says so and it bears repeating here.')}</Bullet>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 9 — EXPLORADOR
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="explorador">
        <h2 style={S.sectionTitle}>{t('9. Explorador de Resultados', '9. Results Explorer')}</h2>
        <p style={S.sectionSub}>
          {t('El Explorador permite filtrar, cruzar y visualizar libremente los datos de cualquier notebook. Es la herramienta más flexible del dashboard para análisis personalizado.', 'The Explorer allows freely filtering, cross-referencing and visualizing data from any notebook. It is the most flexible dashboard tool for custom analysis.')}
        </p>

        <h3 style={S.h3}>{t('9.1 Panel de Filtros (Lateral Izquierdo)', '9.1 Filters Panel (Left Sidebar)')}</h3>
        <p style={S.body}>{t('Un panel adhesivo de 280px con los siguientes controles:', 'A sticky 280px panel with the following controls:')}</p>
        <Bullet><strong>Notebook</strong>: {t('Seleccione NB1, NB2, NB4B o NB5B.', 'Select NB1, NB2, NB4B or NB5B.')}</Bullet>
        <Bullet><strong>{t('Experimento', 'Experiment')}</strong>: {t('Elija Exp A (ventanas de tiempo) o Exp B (latido a latido).', 'Choose Exp A (time windows) or Exp B (beat to beat).')}</Bullet>
        <Bullet><strong>{t('Modelos', 'Models')}</strong>: {t('Lista multi-selección con todos los modelos disponibles del notebook elegido.', 'Multi-select list with all available models from the chosen notebook.')}</Bullet>
        <Bullet><strong>{t('Filtros', 'Filters')}</strong>: {t('Lista multi-selección con los 7 pipelines de preprocesamiento.', 'Multi-select list with the 7 preprocessing pipelines.')}</Bullet>
        <Bullet><strong>{t('Horizonte/Lookback', 'Horizon/Lookback')}</strong>: {t('Dropdown con valores disponibles + opción «Todos».', 'Dropdown with available values + «All» option.')}</Bullet>
        <Bullet><strong>{t('Mostrar línea base Persistencia', 'Show Persistence baseline')}</strong>: {t('Checkbox para incluir el modelo base como referencia.', 'Checkbox to include the baseline model as reference.')}</Bullet>
        <Bullet><strong>{t('Mostrar análisis sobreajuste', 'Show overfitting analysis')}</strong>: {t('Checkbox para incluir columnas de Gap R².', 'Checkbox to include R² Gap columns.')}</Bullet>
        <Bullet><strong>{t('Análisis por paciente', 'Per-patient analysis')}</strong>: {t('Checkbox que habilita visualización adicional por paciente y selector de métrica (R², RMSE, MAE).', 'Checkbox that enables additional per-patient visualization and metric selector (R², RMSE, MAE).')}</Bullet>

        <h3 style={S.h3}>{t('9.2 Área de Resultados', '9.2 Results Area')}</h3>
        <h4 style={S.h4}>KPI Grid ({t('4 tarjetas', '4 cards')})</h4>
        <Bullet>{t('Evaluaciones totales | Pacientes evaluados | R² medio global | Mejor modelo.', 'Total evaluations | Evaluated patients | Global mean R² | Best model.')}</Bullet>

        <h4 style={S.h4}>{t('Tabla de Resultados', 'Results Table')}</h4>
        <Bullet>{t('Columnas: Notebook, Modelo, Filtro, Horizonte/Lookback, R² medio, R² std, RMSE, MAE.', 'Columns: Notebook, Model, Filter, Horizon/Lookback, R² mean, R² std, RMSE, MAE.')}</Bullet>
        <Bullet>{t('Botón', 'Button')} <strong>{t('Exportar CSV', 'Export CSV')}</strong>: {t('Descarga directa del dataset filtrado.', 'Direct download of the filtered dataset.')}</Bullet>

        <h4 style={S.h4}>{t('Gráficos', 'Charts')}</h4>
        <Bullet><strong>{t('R² medio por modelo', 'R² mean per model')}</strong>: {t('Barras horizontales con barras de error.', 'Horizontal bars with error bars.')}</Bullet>
        <Bullet><strong>{t('Heatmap Modelo × Filtro', 'Heatmap Model × Filter')}</strong>: {t('Visible cuando hay ≥2 modelos y ≥2 filtros seleccionados.', 'Visible when ≥2 models and ≥2 filters are selected.')}</Bullet>

        <h4 style={S.h4}>{t('Análisis por Paciente (cuando se activa)', 'Per-Patient Analysis (when enabled)')}</h4>
        <Bullet><strong>Scatter plot</strong>: {t('Métrica media por paciente y modelo.', 'Mean metric per patient and model.')}</Bullet>
        <Bullet><strong>Violin plot</strong>: {t('Distribución de la métrica por modelo.', 'Metric distribution per model.')}</Bullet>
        <Bullet><strong>{t('Top/Bottom N pacientes', 'Top/Bottom N patients')}</strong>: {t('Los pacientes con mayor y menor rendimiento.', 'The patients with highest and lowest performance.')}</Bullet>

        <h3 style={S.h3}>{t('9.3 Flujo de Uso', '9.3 Usage Flow')}</h3>
        <NumberedStep n={1}>{t('Seleccione el notebook y el experimento de interés en el panel de filtros.', 'Select the notebook and experiment of interest in the filters panel.')}</NumberedStep>
        <NumberedStep n={2}>{t('Elija uno o más modelos y filtros para comparar.', 'Choose one or more models and filters to compare.')}</NumberedStep>
        <NumberedStep n={3}>{t('Ajuste el horizonte o lookback si desea un análisis más específico.', 'Adjust the horizon or lookback for a more specific analysis.')}</NumberedStep>
        <NumberedStep n={4}>{t('Revise la tabla de resultados y los gráficos generados automáticamente.', 'Review the results table and automatically generated charts.')}</NumberedStep>
        <NumberedStep n={5}>{t('Active «Análisis por paciente» para un desglose granular.', 'Enable «Per-patient analysis» for a granular breakdown.')}</NumberedStep>
        <NumberedStep n={6}>{t('Exporte los datos a CSV con el botón de descarga.', 'Export the data to CSV with the download button.')}</NumberedStep>
      </div>



      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 10 — COHORTE Y MÉTODO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="cohorte">
        <h2 style={S.sectionTitle}>{t('10. Cohorte y Método', '10. Cohort and Method')}</h2>
        <p style={S.sectionSub}>
          {t(
            'Esta página responde a tres preguntas que un tribunal hace siempre: quiénes son los pacientes, dónde falla el modelo y por qué se descartó el filtro de mediana. Todas sus cifras se leen de archivos de resultados y cada bloque declara su tamaño de muestra y su archivo de procedencia.',
            'This page answers three questions a committee always asks: who the patients are, where the model fails, and why the median filter was discarded. Every figure is read from result files, and each block declares its sample size and source file.',
          )}
        </p>

        <h3 style={S.h3}>{t('10.1 Población y muestra', '10.1 Population and sample')}</h3>
        <Bullet>{t('Composición de los 123 pacientes: 48 de MIT-BIH a 360 Hz y 75 de INCART a 257 Hz.', 'Composition of the 123 patients: 48 from MIT-BIH at 360 Hz and 75 from INCART at 257 Hz.')}</Bullet>
        <Bullet>{t('Distribución de latidos por clase AAMI, proporción de ectópicos y razón de desbalance.', 'Beat distribution by AAMI class, proportion of ectopic beats and imbalance ratio.')}</Bullet>

        <h3 style={S.h3}>{t('10.2 Dispersión entre pacientes', '10.2 Between-patient spread')}</h3>
        <Bullet>{t('Los 123 valores de R² ordenados, con los negativos a la vista en lugar de escondidos.', 'The 123 R² values sorted, with the negative ones shown rather than hidden.')}</Bullet>
        <Bullet>{t('La desviación típica entre pacientes y su razón frente al ancho del intervalo de confianza de la media, ambas calculadas sobre los datos cargados.', 'The between-patient standard deviation and its ratio to the width of the confidence interval of the mean, both computed from the loaded data.')}</Bullet>

        <h3 style={S.h3}>{t('10.3 Generalización entre bases', '10.3 Between-database generalization')}</h3>
        <Bullet>{t('Tabla por base con n, media, desviación, mediana y porcentajes de R² ≥ 0.80 y R² < 0.', 'Per-database table with n, mean, standard deviation, median and the percentages of R² ≥ 0.80 and R² < 0.')}</Bullet>
        <Bullet>{t('Contraste de Mann-Whitney entre MIT-BIH e INCART, acompañado de su tamaño de efecto. Se lee de', 'Mann-Whitney test between MIT-BIH and INCART, together with its effect size. Read from')} <span style={S.mono}>public/data/nb7/nb6_contraste_bases.json</span>.</Bullet>

        <h3 style={S.h3}>{t('10.4 Efecto del filtro de mediana', '10.4 Effect of the median filter')}</h3>
        <Bullet>{t('Por qué el filtro de mediana no forma parte del preprocesamiento del modelo final, con la evidencia por paciente.', 'Why the median filter is not part of the final preprocessing, with per-patient evidence.')}</Bullet>
      </div>


      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 11 — GLOSARIO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="glosario">
        <h2 style={S.sectionTitle}>{t('11. Glosario', '11. Glossary')}</h2>
        <p style={S.sectionSub}>
          {t('El Glosario es un diccionario de referencia rápida con más de 50 términos técnicos organizados por categoría y ordenados alfabéticamente.', 'The Glossary is a quick reference dictionary with more than 50 technical terms organized by category and sorted alphabetically.')}
        </p>

        <h3 style={S.h3}>{t('11.1 Búsqueda y Filtrado', '11.1 Search and Filtering')}</h3>
        <Bullet><strong>{t('Barra de búsqueda', 'Search bar')}</strong>: {t('Escriba cualquier término o parte de su definición para filtrar la lista en tiempo real.', 'Type any term or part of its definition to filter the list in real time.')}</Bullet>
        <Bullet><strong>{t('Filtros por categoría', 'Category filters')}</strong>: {t('5 botones — Todos, Clínico, Modelo, Métrica, Preprocesamiento.', '5 buttons — All, Clinical, Model, Metric, Preprocessing.')}</Bullet>
        <Bullet><strong>{t('Contador', 'Counter')}</strong>: {t('Muestra el número de términos encontrados según los filtros activos.', 'Shows the number of terms found according to the active filters.')}</Bullet>

        <h3 style={S.h3}>{t('11.2 Categorías', '11.2 Categories')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <span style={S.badge('#ef4444')}>Clínico</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '6px' }}>~17 términos: Arritmia, APC, Bradicardia, ECG, LBBB, MIT-BIH, Onda P/T, PVC, QRS, RBBB, Taquicardia, etc.</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <span style={S.badge('#1e40af')}>Modelo</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '6px' }}>86 términos en cuatro categorías: clínicos, modelos, métricas y preprocesamiento. Incluye el vocabulario de los dos experimentos nuevos — AAMI, AUC-PR, precisión, exhaustividad, prevalencia, Wilcoxon y Mann-Whitney.</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <span style={S.badge('#3b82f6')}>Métrica</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '6px' }}>~6 términos: DTW, Gap R², MAE, MSE, R², RMSE.</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <span style={S.badge('#06b6d4')}>Preprocesamiento</span>
            <p style={{ ...S.body, fontSize: 'var(--fs-2xs)', marginTop: '6px' }}>~11 términos: Exp A, Exp B, F_MED, F_NOTCH, Lookback, Horizonte, Normalización Z-score, etc.</p>
          </div>
        </div>

        <h3 style={S.h3}>{t('11.3 Presentación de Términos', '11.3 Term Presentation')}</h3>
        <Bullet>{t('Cada término se muestra como una tarjeta con: nombre en negrita, badge de categoría coloreado y definición completa.', 'Each term is displayed as a card with: bold name, colored category badge and complete definition.')}</Bullet>
        <Bullet>{t('Los términos se agrupan alfabéticamente por letra inicial (A, B, C...) con separadores visuales.', 'Terms are grouped alphabetically by initial letter (A, B, C...) with visual separators.')}</Bullet>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 12 — REFERENCIA DE MÉTRICAS
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="metrics-ref">
        <h2 style={S.sectionTitle}>{t('12. Referencia de Métricas', '12. Metrics Reference')}</h2>
        <p style={S.sectionSub}>
          {t('Las siguientes métricas se utilizan a lo largo del dashboard para evaluar la calidad de las predicciones.', 'The following metrics are used throughout the dashboard to evaluate prediction quality.')}
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>{t('Métrica', 'Metric')}</th>
                <th style={S.th}>{t('Nombre Completo', 'Full Name')}</th>
                <th style={S.th}>{t('Rango', 'Range')}</th>
                <th style={S.th}>{t('Interpretación', 'Interpretation')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.td}><span style={S.mono}>R²</span></td>
                <td style={S.td}>{t('Coeficiente de determinación', 'Coefficient of determination')}</td>
                <td style={S.td}>(-∞, 1]</td>
                <td style={S.td}>{t('Proporción de la varianza explicada por el modelo. 1 = predicción perfecta, 0 = equivalente al promedio, negativo = peor que el promedio.', 'Proportion of variance explained by the model. 1 = perfect prediction, 0 = equivalent to the mean, negative = worse than the mean.')}</td>
              </tr>
              <tr>
                <td style={S.td}><span style={S.mono}>RMSE</span></td>
                <td style={S.td}>Root Mean Squared Error</td>
                <td style={S.td}>[0, ∞)</td>
                <td style={S.td}>{t('Error promedio en las mismas unidades de la señal. Más sensible a errores grandes. Menor es mejor.', 'Average error in the same signal units. More sensitive to large errors. Lower is better.')}</td>
              </tr>
              <tr>
                <td style={S.td}><span style={S.mono}>MAE</span></td>
                <td style={S.td}>Mean Absolute Error</td>
                <td style={S.td}>[0, ∞)</td>
                <td style={S.td}>{t('Error absoluto promedio. Robusto a valores atípicos (outliers). Menor es mejor.', 'Average absolute error. Robust to outliers. Lower is better.')}</td>
              </tr>
              <tr>
                <td style={S.td}><span style={S.mono}>DTW</span></td>
                <td style={S.td}>Dynamic Time Warping</td>
                <td style={S.td}>[0, ∞)</td>
                <td style={S.td}>{t('Mide similitud morfológica entre señales, permitiendo desfases temporales. Menor es mejor. <0.08 excelente, <0.20 aceptable.', 'Measures morphological similarity between signals, allowing temporal offsets. Lower is better. <0.08 excellent, <0.20 acceptable.')}</td>
              </tr>
              <tr>
                <td style={S.td}><span style={S.mono}>MSE</span></td>
                <td style={S.td}>Mean Squared Error</td>
                <td style={S.td}>[0, ∞)</td>
                <td style={S.td}>{t('Error cuadrático medio. Penaliza más los errores grandes. RMSE = √MSE.', 'Mean squared error. Penalizes large errors more. RMSE = √MSE.')}</td>
              </tr>
              <tr>
                <td style={S.td}><span style={S.mono}>Gap R²</span></td>
                <td style={S.td}>{t('Diferencia R² train − test', 'R² train − test difference')}</td>
                <td style={S.td}>[0, ∞)</td>
                <td style={S.td}>{t('Indicador de sobreajuste. > 0.1 sugiere que el modelo memoriza datos de entrenamiento en lugar de generalizar.', 'Overfitting indicator. > 0.1 suggests the model memorizes training data instead of generalizing.')}</td>
              </tr>
              <tr>
                <td style={S.td}><span style={S.mono}>IC 95%</span></td>
                <td style={S.td}>{t('Intervalo de Confianza al 95%', '95% Confidence Interval')}</td>
                <td style={S.td}>{t('Rango', 'Range')}</td>
                <td style={S.td}>{t('Rango donde se espera que caiga el valor real con un 95% de probabilidad. Intervalos más estrechos = mayor confianza.', 'Range where the true value is expected to fall with 95% probability. Narrower intervals = higher confidence.')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('Mejores Resultados del Proyecto', 'Best Project Results')}</h3>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>{t('Categoría', 'Category')}</th><th style={S.th}>{t('Modelo', 'Model')}</th><th style={S.th}>R²</th><th style={S.th}>{t('Experimento', 'Experiment')}</th></tr>
            </thead>
            <tbody>
              <tr><td style={S.td}>{t('ML Tradicional', 'Traditional ML')}</td><td style={S.td}>Random Forest (RF)</td><td style={S.td}><strong>0.6264</strong></td><td style={S.td}>Exp B</td></tr>
              <tr><td style={S.td}>Deep Learning</td><td style={S.td}>GRU / LSTM</td><td style={S.td}><strong>0.6592</strong></td><td style={S.td}>Exp B</td></tr>
              <tr><td style={S.td}>{t('Multi-Sujeto', 'Multi-Subject')}</td><td style={S.td}>GRU + F_MED</td><td style={S.td}><strong>0.7237</strong></td><td style={S.td}>NB4B Global</td></tr>
              <tr><td style={S.td}>Cross-Patient</td><td style={S.td}>GRU_weighted</td><td style={S.td}><strong>0.5311</strong></td><td style={S.td}>NB5B LOPO</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 13 — FILTROS DE PREPROCESAMIENTO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="filters-ref">
        <h2 style={S.sectionTitle}>{t('13. Filtros de Preprocesamiento', '13. Preprocessing Filters')}</h2>
        <p style={S.sectionSub}>
          {t('Los experimentos evalúan 7 pipelines de preprocesamiento diferentes para determinar cuál produce las mejores predicciones.', 'The experiments evaluate 7 different preprocessing pipelines to determine which produces the best predictions.')}
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>{t('Código', 'Code')}</th><th style={S.th}>{t('Filtros Aplicados', 'Applied Filters')}</th><th style={S.th}>{t('Descripción', 'Description')}</th></tr>
            </thead>
            <tbody>
              <tr><td style={S.td}><span style={S.mono}>F_SIN</span></td><td style={S.td}>{t('Ninguno', 'None')}</td><td style={S.td}>{t('Señal cruda sin filtrar. Sirve como línea base.', 'Raw unfiltered signal. Serves as baseline.')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>F_N</span></td><td style={S.td}>Notch 60 Hz</td><td style={S.td}>{t('Elimina interferencia de la red eléctrica (60 Hz).', 'Removes power line interference (60 Hz).')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>F_PB</span></td><td style={S.td}>{t('Pasabanda 0.5–40 Hz', 'Bandpass 0.5–40 Hz')}</td><td style={S.td}>{t('Preserva el rango relevante del ECG, elimina ruido de alta y baja frecuencia.', 'Preserves the relevant ECG range, removes high and low frequency noise.')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>F_N+PB</span></td><td style={S.td}>{t('Notch + Pasabanda', 'Notch + Bandpass')}</td><td style={S.td}>{t('Combinación del filtro notch y pasabanda.', 'Combination of notch and bandpass filters.')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>F_MED</span></td><td style={S.td}>{t('Mediana', 'Median')}</td><td style={S.td}>{t('Filtro de mediana. Dio el mejor R² en NB1, NB2 y NB4B, pero por aplanar el pico R (76.5 % de atenuación): el modelo final lo descarta.', 'Median filter. It gave the best R² in NB1, NB2 and NB4B, but by flattening the R peak (76.5 % attenuation): the final model discards it.')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>F_N+MED</span></td><td style={S.td}>{t('Notch + Mediana', 'Notch + Median')}</td><td style={S.td}>{t('Combinación del filtro notch y mediana.', 'Combination of notch and median filters.')}</td></tr>
              <tr><td style={S.td}><span style={S.mono}>F_N+PB+MED</span></td><td style={S.td}>{t('Notch + Pasabanda + Mediana', 'Notch + Bandpass + Median')}</td><td style={S.td}>{t('Pipeline completo con los tres filtros. Utilizado en NB5B (LOPO).', 'Complete pipeline with all three filters. Used in NB5B (LOPO).')}</td></tr>
            </tbody>
          </table>
        </div>

        <InfoBox type="tip" t={t}>
          {t('El filtro', 'The filter')} <span style={S.mono}>F_MED</span> ({t('mediana', 'median')}) {t('obtuvo el mejor R² en los experimentos NB1 y NB2, si bien el NB7 demostró después que ese resultado se debe al aplanamiento del pico R (76.5 % de atenuación) y no a una mejor predicción. El modelo final (NB6) usa F_NB6, sin mediana. Para el modelo LOPO intermedio (NB5B) se había seleccionado', 'obtained the best R² in experiments NB1 and NB2, though NB7 later showed that result comes from flattening the R peak (76.5 % attenuation) rather than from better prediction. The final model (NB6) uses F_NB6, without median. For the intermediate LOPO model (NB5B),')} <span style={S.mono}>F_N+PB+MED</span> {t('como el pipeline óptimo.', 'was selected as the optimal pipeline.')}
        </InfoBox>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 14 — API BACKEND
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="api">
        <h2 style={S.sectionTitle}>{t('14. API Backend', '14. Backend API')}</h2>
        <p style={S.sectionSub}>
          {t('El backend FastAPI proporciona los servicios de predicción, procesamiento de señales y consulta de datos. La documentación interactiva está disponible en', 'The FastAPI backend provides prediction services, signal processing and data querying. Interactive documentation is available at')} <span style={S.mono}>http://localhost:8000/docs</span>.
        </p>

        <h3 style={S.h3}>{t('14.1 Endpoints Principales', '14.1 Main Endpoints')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>{t('Método', 'Method')}</th><th style={S.th}>{t('Ruta', 'Route')}</th><th style={S.th}>{t('Descripción', 'Description')}</th></tr>
            </thead>
            <tbody>
              <tr><td style={S.td}><span style={S.badge('#10b981')}>GET</span></td><td style={S.td}><span style={S.mono}>/api/health</span></td><td style={S.td}>{t('Estado del servidor: status, versión, modelos cargados, tiempo de actividad.', 'Server status: status, version, loaded models, uptime.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#10b981')}>GET</span></td><td style={S.td}><span style={S.mono}>/api/patients</span></td><td style={S.td}>{t('Lista de pacientes MIT-BIH disponibles.', 'List of available MIT-BIH patients.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#10b981')}>GET</span></td><td style={S.td}><span style={S.mono}>/api/signal</span></td><td style={S.td}>{t('Señal ECG de un paciente. Parámetros: patientId, lead (MLII), segment_60s.', 'ECG signal of a patient. Parameters: patientId, lead (MLII), segment_60s.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#10b981')}>GET</span></td><td style={S.td}><span style={S.mono}>/api/models</span></td><td style={S.td}>{t('Registro de modelos disponibles con sus métricas.', 'Registry of available models with their metrics.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#3b82f6')}>POST</span></td><td style={S.td}><span style={S.mono}>/api/predict</span></td><td style={S.td}>{t('Predicción de un latido. Entrada: beats (Z-score), arquitectura, filtro.', 'Single beat prediction. Input: beats (Z-score), architecture, filter.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#3b82f6')}>POST</span></td><td style={S.td}><span style={S.mono}>/api/predict_batch</span></td><td style={S.td}>{t('Predicción en lote de múltiples latidos.', 'Batch prediction of multiple beats.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#3b82f6')}>POST</span></td><td style={S.td}><span style={S.mono}>/api/predict_lopo</span></td><td style={S.td}>{t('Predicción LOPO cross-patient. Incluye intervalos RR opcionales.', 'LOPO cross-patient prediction. Includes optional RR intervals.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#3b82f6')}>POST</span></td><td style={S.td}><span style={S.mono}>/api/process_signal</span></td><td style={S.td}>{t('Filtrado y segmentación de señal ECG.', 'ECG signal filtering and segmentation.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#3b82f6')}>POST</span></td><td style={S.td}><span style={S.mono}>/api/explainability/gradcam</span></td><td style={S.td}>{t('Mapa de saliencia Grad-CAM sobre la señal.', 'Grad-CAM saliency map on the signal.')}</td></tr>
              <tr><td style={S.td}><span style={S.badge('#3b82f6')}>POST</span></td><td style={S.td}><span style={S.mono}>/api/explainability/shap</span></td><td style={S.td}>{t('Valores SHAP e importancia de features.', 'SHAP values and feature importance.')}</td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={S.h3}>{t('14.2 Timeouts y Fallback', '14.2 Timeouts and Fallback')}</h3>
        <Bullet><strong>{t('Timeout por defecto', 'Default timeout')}</strong>: {t('15 segundos para la mayoría de peticiones.', '15 seconds for most requests.')}</Bullet>
        <Bullet><strong>{t('Timeout extendido', 'Extended timeout')}</strong>: {t('30 segundos para carga de señales.', '30 seconds for signal loading.')}</Bullet>
        <Bullet><strong>{t('Si la API no responde', 'If the API does not respond')}</strong>: {t('la interfaz muestra el error concreto y no dibuja nada. Ya no existe ningún modo de datos simulados: se retiró porque, en la entrega de una tesis, una gráfica con datos inventados es peor que una gráfica ausente.', 'the interface shows the specific error and draws nothing. There is no longer any simulated-data mode: it was removed because, in a thesis deliverable, a chart with fabricated data is worse than no chart at all.')}</Bullet>

        <InfoBox type="info" t={t}>
          {t('Acceda a la documentación interactiva Swagger en', 'Access the interactive Swagger documentation at')} <span style={S.mono}>http://localhost:8000/docs</span> {t('para probar los endpoints directamente desde el navegador.', 'to test the endpoints directly from the browser.')}
        </InfoBox>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 15 — RESOLUCIÓN DE PROBLEMAS
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="troubleshoot">
        <h2 style={S.sectionTitle}>{t('15. Resolución de Problemas', '15. Troubleshooting')}</h2>

        <Accordion title={t('Error: "Port 80 already in use"', 'Error: "Port 80 already in use"')}>
          <p style={S.body}>
            {t('El puerto 80 está siendo utilizado por otro servicio. Soluciones:', 'Port 80 is being used by another service. Solutions:')}
          </p>
          <NumberedStep n={1}>{t('Identifique y detenga el proceso que ocupa el puerto 80.', 'Identify and stop the process using port 80.')}</NumberedStep>
          <NumberedStep n={2}>{t('O bien, edite', 'Or edit')} <span style={S.mono}>docker-compose.yml</span> {t('y cambie', 'and change')} <span style={S.mono}>{'"80:80"'}</span> {t('por', 'to')} <span style={S.mono}>{'"3000:80"'}</span>.</NumberedStep>
          <NumberedStep n={3}>{t('Luego acceda al dashboard en', 'Then access the dashboard at')} <span style={S.mono}>http://localhost:3000</span>.</NumberedStep>
        </Accordion>

        <Accordion title={t('Error: "Cannot connect to Docker daemon"', 'Error: "Cannot connect to Docker daemon"')}>
          <p style={S.body}>
            {t('Docker Desktop no está iniciado. Abra Docker Desktop y espere a que el motor cargue completamente (ícono verde en la bandeja del sistema). En Windows, asegúrese de que WSL 2 esté habilitado en la configuración de Docker.', 'Docker Desktop is not started. Open Docker Desktop and wait for the engine to fully load (green icon in the system tray). On Windows, make sure WSL 2 is enabled in Docker settings.')}
          </p>
        </Accordion>

        <Accordion title={t('Error 500 en predicción / Los modelos no cargan', 'Error 500 in prediction / Models don\'t load')}>
          <p style={S.body}>
            {t('Verifique que existan los archivos de modelos en las siguientes rutas:', 'Verify that model files exist in the following paths:')}
          </p>
          <Bullet><span style={S.mono}>results/NB4B/modelos/</span> — {t('Modelos', 'Models')} <span style={S.mono}>.keras</span> {t('para predicción normal.', 'for normal prediction.')}</Bullet>
          <Bullet><span style={S.mono}>results/NB5B/modelos/</span> — {t('Modelo LOPO', 'LOPO model')} <span style={S.mono}>.keras</span>.</Bullet>
          <p style={{ ...S.body, marginTop: '8px' }}>
            {t('Si los archivos no existen, es necesario ejecutar los notebooks correspondientes para generarlos.', 'If the files don\'t exist, you need to run the corresponding notebooks to generate them.')}
          </p>
        </Accordion>

        <Accordion title={t('La primera carga de señal es muy lenta (~30s)', 'The first signal load is very slow (~30s)')}>
          <p style={S.body}>
            {t('Esto es normal. TensorFlow necesita cargar los modelos en memoria la primera vez. Las llamadas posteriores son instantáneas. Espere a que se complete la carga inicial.', 'This is normal. TensorFlow needs to load the models into memory the first time. Subsequent calls are instantaneous. Wait for the initial load to complete.')}
          </p>
        </Accordion>

        <Accordion title={t('El dashboard muestra "datos de demostración"', 'The dashboard shows "demo data"')}>
          <p style={S.body}>
            {t('Cuando la API backend no está disponible, el frontend cambia automáticamente a modo demostración con datos simulados. Para utilizar datos reales, asegúrese de que los contenedores Docker estén corriendo y que', 'When the backend API is not available, the frontend automatically switches to demo mode with simulated data. To use real data, make sure Docker containers are running and that')} <span style={S.mono}>http://localhost:8000/api/health</span> {t('responda correctamente.', 'responds correctly.')}
          </p>
        </Accordion>

        <Accordion title={t('Los gráficos muestran "Cargando datos..."', 'Charts show "Loading data..."')}>
          <p style={S.body}>
            {t('Los datos se cargan directamente desde archivos CSV estáticos ubicados en', 'Data is loaded directly from static CSV files located in')} <span style={S.mono}>public/data/</span>.
            {t('Verifique que existan los archivos CSV correspondientes:', 'Verify that the corresponding CSV files exist:')}
          </p>
          <Bullet><span style={S.mono}>public/data/nb1/</span> — {t('CSVs de NB1 (resumen, resultados, IC95, Wilcoxon, etc.)', 'NB1 CSVs (summary, results, CI95, Wilcoxon, etc.)')}</Bullet>
          <Bullet><span style={S.mono}>public/data/nb2/</span> — {t('CSVs de NB2', 'NB2 CSVs')}</Bullet>
          <Bullet><span style={S.mono}>public/data/nb3/</span> — {t('CSVs de NB3', 'NB3 CSVs')}</Bullet>
          <Bullet><span style={S.mono}>public/data/nb4b/</span> — {t('CSV de NB4B', 'NB4B CSV')}</Bullet>
          <Bullet><span style={S.mono}>public/data/nb5b/</span> — {t('CSVs de NB5B (LOPO, resumen, validación INCART)', 'NB5B CSVs (LOPO, summary, INCART validation)')}</Bullet>
        </Accordion>

        <Accordion title={t('Los gráficos no se renderizan o aparecen en blanco', 'Charts don\'t render or appear blank')}>
          <p style={S.body}>
            {t('Verifique que su navegador esté actualizado (Chrome, Firefox, Edge o Safari recientes). Limpie la caché con', 'Verify your browser is up to date (recent Chrome, Firefox, Edge or Safari). Clear the cache with')} <span style={S.mono}>Ctrl + Shift + R</span>.
            {t('Si el problema persiste, pruebe en modo incógnito para descartar extensiones conflictivas.', 'If the problem persists, try incognito mode to rule out conflicting extensions.')}
          </p>
        </Accordion>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECCIÓN 16 — PREGUNTAS FRECUENTES
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '20px' }} id="faq">
        <h2 style={S.sectionTitle}>{t('16. Preguntas Frecuentes', '16. Frequently Asked Questions')}</h2>

        <Accordion title={t('¿Qué significa una alerta roja en la predicción?', 'What does a red alert in prediction mean?')}>
          <p style={S.body}>
            {t('Una alerta roja indica que el modelo detectó una irregularidad en el segmento de señal analizado. Las categorías anotadas en MIT-BIH incluyen: LBBB (bloqueo de rama izquierda), RBBB (bloqueo de rama derecha), APC (contracción auricular prematura) y PVC (contracción ventricular prematura). Las alertas se clasifican por severidad en', 'A red alert indicates the model detected an irregularity in the analyzed signal segment. Categories annotated in MIT-BIH include: LBBB (left bundle branch block), RBBB (right bundle branch block), APC (atrial premature contraction) and PVC (premature ventricular contraction). Alerts are classified by severity as')} <span style={S.badge('#f59e0b')}>warning</span> {t('y', 'and')} <span style={S.badge('#ef4444')}>critical</span>.
          </p>
        </Accordion>

        <Accordion title={t('¿Puedo usar esta herramienta para diagnóstico médico?', 'Can I use this tool for medical diagnosis?')}>
          <p style={S.body}>
            <strong>No.</strong> {t('Este dashboard es una herramienta de investigación académica. Los resultados de predicción NO deben utilizarse para diagnóstico clínico. El mejor modelo explica ~66% de la varianza de la señal (R² = 0.6592 en Exp B por paciente), lo cual es insuficiente para uso clínico. Siempre se recomienda confirmación médica profesional.', 'This dashboard is an academic research tool. Prediction results should NOT be used for clinical diagnosis. The best model explains ~66% of the signal variance (R² = 0.6592 in Exp B per patient), which is insufficient for clinical use. Professional medical confirmation is always recommended.')}
          </p>
        </Accordion>

        <Accordion title={t('¿Qué diferencia hay entre Exp A y Exp B?', 'What is the difference between Exp A and Exp B?')}>
          <p style={S.body}>
            <strong>Exp A</strong> {t('usa ventanas temporales fijas de la señal continua (lookback de 5 segundos + horizontes de 1, 3 o 5 segundos).', 'uses fixed temporal windows from the continuous signal (5-second lookback + 1, 3 or 5-second horizons).')}
            {' '}<strong>Exp B</strong> {t('segmenta la señal en latidos individuales de 256 muestras centrados en el pico R, con lookback de N = 3, 5 o 10 latidos previos. Exp B obtiene métricas superiores en todos los modelos porque la morfología latido-a-latido es más consistente.', 'segments the signal into individual beats of 256 samples centered on the R peak, with lookback of N = 3, 5 or 10 previous beats. Exp B achieves superior metrics across all models because beat-to-beat morphology is more consistent.')}
          </p>
        </Accordion>


        <Accordion title={t('¿Qué base de datos se utilizó?', 'What database was used?')}>
          <p style={S.body}>
            <strong>MIT-BIH Arrhythmia Database</strong> {t('de PhysioNet: 48 registros de ~30 minutos cada uno, muestreados a 360 Hz, con anotaciones de arritmia realizadas por cardiólogos expertos. Es el estándar de referencia mundial para investigación en ECG. Adicionalmente, la base', 'from PhysioNet: 48 records of ~30 minutes each, sampled at 360 Hz, with arrhythmia annotations by expert cardiologists. It is the world reference standard for ECG research. Additionally, the')} <strong>INCART</strong> {t('(75 registros, 257 Hz, 12 derivaciones) se usa como validación externa en NB5B.', '(75 records, 257 Hz, 12 leads) is used as external validation in NB5B.')}
          </p>
        </Accordion>

        <Accordion title={t('¿Por qué el R² de LOPO es menor que el de NB4B?', 'Why is the LOPO R² lower than NB4B?')}>
          <p style={S.body}>
            {t('El modelo LOPO predice sobre pacientes', 'The LOPO model predicts on patients')} <em>{t('completamente nuevos', 'completely new')}</em> {t('que nunca formaron parte del entrenamiento, lo cual es un reto significativamente mayor. La variabilidad inter-paciente en señales ECG es alta (diferencias de morfología, frecuencia, patologías). Un R² de 0.5311 en LOPO es un resultado relevante que demuestra capacidad de generalización, aunque inferior al R² de 0.7237 de NB4B donde el modelo sí vio datos del paciente durante el entrenamiento.', 'that were never part of training, which is a significantly greater challenge. Inter-patient variability in ECG signals is high (morphology, frequency, pathology differences). An R² of 0.5311 in LOPO is a relevant result demonstrating generalization capability, although lower than the NB4B R² of 0.7237 where the model did see patient data during training.')}
          </p>
        </Accordion>

        <Accordion title={t('¿Puedo cargar mis propias señales ECG?', 'Can I upload my own ECG signals?')}>
          <p style={S.body}>
            {t(
              'No desde la interfaz: el panel no incluye ninguna carga de archivos. Las señales que se muestran proceden de MIT-BIH e INCART a través del servicio, o de la señal de demostración cuando el servicio no responde. Para procesar una señal propia hay que llamar directamente al punto de entrada /process del API, que acepta un vector de valores y su frecuencia de muestreo.',
              'Not from the interface: the dashboard has no file upload. The signals shown come from MIT-BIH and INCART through the service, or from the demonstration signal when the service is unavailable. To process your own signal, call the API /process endpoint directly, which takes an array of values and its sampling rate.',
            )}
          </p>
        </Accordion>

        <Accordion title={t('¿Qué significan los colores en los heatmaps y gráficos?', 'What do the colors in heatmaps and charts mean?')}>
          <p style={S.body}>
            {t('En los heatmaps, los colores más cálidos (rojos/naranjas) representan valores más altos de R², mientras que los colores fríos (azules) representan valores más bajos. En los forest plots, las líneas horizontales representan intervalos de confianza al 95%: si el intervalo no cruza el cero, el resultado es estadísticamente significativo. Los boxplots muestran la distribución completa con mediana, cuartiles y valores atípicos.', 'In heatmaps, warmer colors (reds/oranges) represent higher R² values, while cool colors (blues) represent lower values. In forest plots, horizontal lines represent 95% confidence intervals: if the interval does not cross zero, the result is statistically significant. Boxplots show the complete distribution with median, quartiles and outliers.')}
          </p>
        </Accordion>

        <Accordion title={t('¿Cómo exporto datos del dashboard?', 'How do I export data from the dashboard?')}>
          <p style={S.body}>
            {t('En la sección «Explorador de Resultados», el botón', 'In the Results Explorer section, the')} <strong>{t('Exportar CSV', 'Export CSV')}</strong> {t('descarga directamente el dataset filtrado como un archivo CSV compatible con Excel, Python, R o cualquier herramienta de análisis. Los gráficos de Plotly también permiten descargarse como imagen PNG haciendo clic en el ícono de cámara en la barra de herramientas del gráfico.', 'button directly downloads the filtered dataset as a CSV file compatible with Excel, Python, R or any analysis tool. Plotly charts can also be downloaded as PNG images by clicking the camera icon in the chart toolbar.')}
          </p>
        </Accordion>

        <Accordion title={t('¿Es necesario tener conexión a internet?', 'Is an internet connection required?')}>
          <p style={S.body}>
            {t('No, después de la primera instalación. El dashboard funciona completamente de forma local. Todas las señales, modelos y datos están contenidos en los volúmenes Docker. Solo se requiere internet para la primera descarga de las imágenes Docker y dependencias.', 'No, after the first installation. The dashboard works completely locally. All signals, models and data are contained in Docker volumes. Internet is only required for the first download of Docker images and dependencies.')}
          </p>
        </Accordion>
      </div>

      {/* ── Footer ── */}
      <div style={{
        textAlign: 'center', padding: '24px 0', borderTop: '1px solid var(--border)', marginTop: '20px',
      }}>
        <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)', marginBottom: '6px' }}>
          ECG Forecasting Dashboard · {t('Manual de Usuario', 'User Manual')} · {t('Versión', 'Version')} 1.0
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
          Universidad CESMAG · {t('Programa de Ingeniería de Sistemas', 'Systems Engineering Program')} · 2025–2026
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Darwin David Burbano Guerrero · Darío Esteban Gómez Ordóñez · Mg. Héctor Andrés Mora Paz
        </p>
      </div>
        </div> {/* Cierra Columna Derecha */}
      </div> {/* Cierra Grid Layout */}

      {/* ── Back to Top ── */}
      <button
        onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '40px', height: '40px',
          borderRadius: '50%', background: 'var(--prediction)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59,130,246,0.3)', zIndex: 50,
        }}
        title={t('Volver arriba', 'Back to top')}
      >
        <ChevronLeft size={18} color="#fff" style={{ transform: 'rotate(90deg)' }} />
      </button>
    </PageWrapper>
  );
}
