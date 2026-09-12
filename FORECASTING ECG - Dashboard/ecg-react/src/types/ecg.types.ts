export type ModelName = 'LSTM' | 'GRU' | 'CNN-GRU' | 'CNN-LSTM' | 'RF' | 'MLP' | 'DT' | 'SVR_rbf' | 'baseline' | 'LOPO';
export type AlertLevel = 'normal' | 'warning' | 'critical';
export type ArrhythmiaType = 'normal' | 'LBBB' | 'RBBB' | 'APC' | 'PVC';
export type ExperimentType = 'nb1' | 'nb2' | 'nb3' | 'nb4b' | 'nb5' | 'nb5b';

export interface ECGSignal {
  values: number[];
  timestamps: number[];
  patientId: string;
  lead: 'MLII' | 'V1';
  annotations?: { index: number; label: ArrhythmiaType }[];
}

export interface PredictionResult {
  predicted: number[];
  confidence: number[];
  latencyMs: number;
  model: ModelName;
  alertLevel: AlertLevel;
  detectedArrhythmia?: ArrhythmiaType;
}

export interface ModelMetrics {
  model: ModelName;
  mse: number;
  mae: number;
  r2: number;
  dtw: number;
  latencyMs: number;
  sensitivity: number;
  specificity: number;
  epochs?: number;
  trainLoss?: number[];
  valLoss?: number[];
}

export interface MITBIHRecord {
  id: string;
  duration: number;
  samplingRate: 360;
  annotations: number;
  arrhythmiaTypes: ArrhythmiaType[];
}

export interface GradcamActivationRegion {
  start: number;
  end: number;
  intensity: number;
  label: string;
}

export interface GradcamResponse {
  heatmap: number[];
  signal: number[];
  activationRegions: GradcamActivationRegion[];
}

export interface ShapResponse {
  shapValues: number[];
  baseValue: number;
  features: string[];
}

export const MODEL_COLORS: Record<string, string> = {
  LSTM: '#1d4ed8',
  GRU: '#38bdf8',
  'CNN-GRU': '#60a5fa',
  'CNN-LSTM': '#93c5fd',
  RF: '#fbbf24',
  MLP: '#eab308',
  DT: '#d97706',
  SVR_rbf: '#0ea5e9',
  Persistencia: '#94a3b8',
  baseline: '#64748b',
  LOPO: '#f59e0b',
};

export const MODEL_BG: Record<string, string> = {
  LSTM: 'rgba(29,78,216,0.1)',
  GRU: 'rgba(56,189,248,0.1)',
  'CNN-GRU': 'rgba(96,165,250,0.1)',
  'CNN-LSTM': 'rgba(147,197,253,0.1)',
  RF: 'rgba(251,191,36,0.1)',
  MLP: 'rgba(234,179,8,0.1)',
  baseline: 'rgba(100,116,139,0.1)',
  LOPO: 'rgba(245,158,11,0.1)',
};

export const MODEL_BORDER: Record<string, string> = {
  LSTM: 'rgba(29,78,216,0.25)',
  GRU: 'rgba(56,189,248,0.25)',
  'CNN-GRU': 'rgba(96,165,250,0.25)',
  'CNN-LSTM': 'rgba(147,197,253,0.25)',
  RF: 'rgba(251,191,36,0.25)',
  MLP: 'rgba(234,179,8,0.25)',
  baseline: 'rgba(100,116,139,0.25)',
  LOPO: 'rgba(245,158,11,0.25)',
};

export const FILTRO_COLORS: Record<string, string> = {
  F_N: '#2563eb',
  F_MED: '#60a5fa',
  'F_N+MED': '#fbbf24',
  'F_N+PB+MED': '#ef4444',
};

export const EXPERIMENT_LABELS: Record<ExperimentType, { es: string; en: string }> = {
  nb1: { es: 'NB1 - Modelos Tradicionales', en: 'NB1 - Traditional Models' },
  nb2: { es: 'NB2 - Deep Learning', en: 'NB2 - Deep Learning' },
  nb3: { es: 'NB3 - Evaluación Comparativa', en: 'NB3 - Comparative Evaluation' },
  nb4b: { es: 'NB4B - Multi-sujeto', en: 'NB4B - Multi-subject' },
  nb5: { es: 'NB5 - Multi-step LOPO (CNN-GRU-ATTN)', en: 'NB5 - Multi-step LOPO (CNN-GRU-ATTN)' },
  nb5b: { es: 'NB5B - Cross-patient (LOPO)', en: 'NB5B - Cross-patient (LOPO)' },
};

export interface BaseMetrics {
  Modelo: string;
  R2_media: number;
  R2_std?: number;
  MSE_media: number;
  RMSE_media: number;
  MAE_media?: number;
  N: number;
}

export interface IC95Row {
  Modelo: string;
  R2_media: number;
  IC_95_inf: number;
  IC_95_sup: number;
}

export interface NB1WilcoxonRow {
  Modelo: string;
  'ΔR²_vs_Persistencia': number;
  W_stat: number;
  p_valor: number;
  Significativo: string;
}

export interface NB2WilcoxonRow {
  Modelo: string;
  'ΔR²_media': number;
  W_stat: number;
  p_valor: number;
  Significativo: string;
}

/** @deprecated Use NB1WilcoxonRow or NB2WilcoxonRow */
export type WilcoxonRow = NB1WilcoxonRow | NB2WilcoxonRow;

export interface OverfitRow {
  Modelo: string;
  R2_train_media: number;
  R2_test_media: number;
  Diferencia: number;
}

export interface NB1ResumenA {
  Modelo: string;
  R2_media: number;
  R2_std: number;
  MSE_media: number;
  RMSE_media: number;
  MAE_media: number;
  N: number;
}

export interface NB1ResumenB {
  Modelo: string;
  R2_media: number;
  R2_std: number;
  MSE_media: number;
  RMSE_media: number;
  MAE_media: number;
  N: number;
}

export interface NB1RawA {
  Paciente: string;
  Modelo: string;
  Filtro: string;
  Horizonte_seg: number;
  R2: number;
  MSE: number;
  RMSE: number;
  MAE: number;
}

export interface NB1RawB {
  Paciente: string;
  Modelo: string;
  Filtro: string;
  Lookback: number;
  R2: number;
  MSE: number;
  RMSE: number;
  MAE: number;
}

export interface NB1RankingFiltro {
  Filtro: string;
  R2_media: number;
}

export interface NB1RankingHorizonte {
  Horizonte_seg: number;
  R2_media: number;
}

export interface NB1Data {
  resumenA: NB1ResumenA[];
  resumenB: NB1ResumenB[];
  rawA: NB1RawA[];
  rawB: NB1RawB[];
  ic95A: IC95Row[];
  ic95B: IC95Row[];
  wilcoxonA: NB1WilcoxonRow[];
  wilcoxonB: NB1WilcoxonRow[];
  rankingFiltros: NB1RankingFiltro[];
  rankingHorizontes: NB1RankingHorizonte[];
  overfitA: OverfitRow[];
  overfitB: OverfitRow[];
}

export interface NB2ResumenA {
  Modelo: string;
  N: number;
  R2_media: number;
  R2_std: number;
  R2: string;
  MSE_media: number;
  MSE_std: number;
  RMSE_media: number;
  RMSE_std: number;
  MAE_media: number;
  MAE_std: number;
}

export interface NB2ResumenB {
  Modelo: string;
  N: number;
  R2_media: number;
  R2_std: number;
  R2: string;
  MSE_media: number;
  MSE_std: number;
  RMSE_media: number;
  RMSE_std: number;
  MAE_media: number;
  MAE_std: number;
}

export interface NB2RawA {
  Paciente: string;
  Modelo: string;
  Filtro: string;
  Horizonte_seg: number;
  R2: number;
  MSE: number;
  RMSE: number;
  MAE: number;
  Latencia_ms: number;
}

export interface NB2RawB {
  Paciente: string;
  Modelo: string;
  Filtro: string;
  Lookback: number;
  R2: number;
  MSE: number;
  RMSE: number;
  MAE: number;
  Latencia_ms: number;
}

export interface NB2Comparativa {
  Notebook: string;
  Experimento: string;
  Modelo: string;
  R2_train: number;
  R2_test: number;
  MSE: number;
  R2_media: number;
}

export interface NB2Data {
  resumenA: NB2ResumenA[];
  resumenB: NB2ResumenB[];
  rawA: NB2RawA[];
  rawB: NB2RawB[];
  ic95A: IC95Row[];
  ic95B: IC95Row[];
  wilcoxonA: NB2WilcoxonRow[];
  wilcoxonB: NB2WilcoxonRow[];
  comparativa: NB2Comparativa[];
  overfitA: OverfitRow[];
  overfitB: OverfitRow[];
}

export interface NB4BGlobal {
  Modelo: string;
  Filtro: string;
  R2: number;
  R2_train: number;
  MSE: number;
  RMSE: number;
  MAE: number;
  DTW: number;
  Latencia_ms: number;
  t_fit_s: number;
  n_pacientes: number;
  n_ventanas_train: number;
  n_ventanas_test: number;
}

export interface NB4BPorPaciente {
  Paciente: string;
  Modelo: string;
  Filtro: string;
  R2: number;
  MSE?: number;
  RMSE?: number;
  MAE?: number;
  DTW?: number;
  Latencia_ms?: number;
}

export interface NB4BResumen {
  Modelo: string;
  Filtro: string;
  n: number;
  mu_R2: number;
  sigma_R2: number;
  min: number;
  max: number;
}

export interface NB4BIC95 {
  Modelo: string;
  mu_R2: number;
  IC95_inf: number;
  IC95_sup: number;
}

export interface NB4BWilcoxon {
  Modelo_A: string;
  Modelo_B: string;
  W_stat: number;
  p_value: number;
  Sig: string;
}

export interface NB4BOverfit {
  Modelo: string;
  Filtro: string;
  R2_train: number;
  R2_test: number;
  GAP: number;
}

export interface NB4BData {
  global: NB4BGlobal[];
  porPaciente: NB4BPorPaciente[];
  resumen: NB4BResumen[];
  ic95: NB4BIC95[];
  wilcoxon: NB4BWilcoxon[];
  overfit: NB4BOverfit[];
  tdCnnGlobal: NB4BGlobal[];
  tdCnnPorPaciente: NB4BPorPaciente[];
}

export interface NB5BResumen {
  Modelo: string;
  Metrica: string;    // CSV column: 'Métrica' (remapped in store)
  Media: number;
  Std: number;
  IC95_inf: number;
  IC95_sup: number;
  N: number;
}

export interface NB5BRaw {
  Modelo: string;
  paciente_test: string | number;
  R2: number;
  R2_train: number;
  MSE: number;
  RMSE: number;
  MAE: number;
  DTW: number;
  Latencia_ms: number;
  t_fit_s: number;
  epochs_ran: number;
  n_train: number;
  n_test: number;
  n_ft: number;
}

export interface NB5BIncart {
  registro: string;
  R2: number;
  MSE: number;
  RMSE: number;
  MAE: number;
  DTW: number;
  Latencia_ms: number;
  n_test: number;
}

export interface NB5BData {
  resumen: NB5BResumen[];
  raw: NB5BRaw[];
  incart: NB5BIncart[];
}

export interface NB5Resumen {
  Modelo: string;
  N_pacientes: number;
  R2_total_mean: number;
  R2_total_std: number;
  R2_mean_mean: number;
  R2_mean_std: number;
  RMSE_total_mean: number;
  RMSE_total_std: number;
  Shape_Corr_mean: number;
  Slope_MSE_mean: number;
  Amp_Error_mean: number;
  Forecast_Score_mean: number;
}

export interface NB5Raw {
  paciente_test: string | number;
  Modelo: string;
  n_train: number;
  n_test: number;
  n_ft: number;
  t_fit_s: number;
  epochs: number;
  Latencia_ms: number;
  R2_total: number;
  RMSE_total: number;
  MAE_total: number;
  SMAPE_total: number;
  Corr_total: number;
  R2_t1: number;
  RMSE_t1: number;
  R2_t2: number;
  RMSE_t2: number;
  R2_t3: number;
  RMSE_t3: number;
  R2_mean: number;
  Slope_MSE: number;
  Amp_Error: number;
  Shape_Corr: number;
  DTW_mean: number;
  DTW_std: number;
  Forecast_Score: number;
  R2_train?: number;
}

export interface NB5Data {
  resumen: NB5Resumen[];
  raw: NB5Raw[];
}

// ── NB3 Evaluación Comparativa ──────────────────────────────────────────────

/** expA_evaluacion_estandar.csv */
export interface NB3ExpARow {
  Paciente: number;
  Modelo: string;
  R2: number;
  RMSE: number;
  MAE: number;
  n_test: number;
}

/** expB_resumen.csv */
export interface NB3ExpBResumen {
  Paciente: number;
  NB2_propio: number;
  NB2_ajeno_mean: number;
  NB2_ajeno_min: number;
  NB2_ajeno_max: number;
  NB4B: number;
  NB5B: number;
  Caida_NB2: number;
}

/** expB_transferencia_cruzada.csv */
export interface NB3ExpBTransferencia {
  Paciente: number;
  Escenario: string;
  R2: number;
  n_test: number;
}

/** expC_escenario_clinico.csv */
export interface NB3ExpCRow {
  Paciente: number;
  Modelo: string;
  R2: number;
  Disponible: string;
  n_test: number;
}

export interface NB3Data {
  expA: NB3ExpARow[];
  expBResumen: NB3ExpBResumen[];
  expBTransferencia: NB3ExpBTransferencia[];
  expC: NB3ExpCRow[];
}

export interface BarChartData {
  name: string;
  value: number;
  color?: string;
  error?: number;
}

export interface BoxPlotData {
  name: string;
  values: number[];
  color?: string;
}

export interface HeatmapData {
  x: string[];
  y: string[];
  z: number[][];
}

export interface ScatterData {
  x: number | string;
  y: number;
  label?: string;
}

export interface ForestPlotData {
  modelo: string;
  media: number;
  icInf: number;
  icSup: number;
  color?: string;
}

export interface FiltersState {
  experiment: ExperimentType;
  modelo: string | null;
  filtro: string | null;
  horizonte: number | null;
  lookback: number | null;
  paciente: string | null;
}

export interface LoadingState {
  nb1: boolean;
  nb2: boolean;
  nb3: boolean;
  nb4b: boolean;
  nb5: boolean;
  nb5b: boolean;
}

export interface ErrorState {
  nb1: string | null;
  nb2: string | null;
  nb3: string | null;
  nb4b: string | null;
  nb5: string | null;
  nb5b: string | null;
}

export type ExperimentLabel = 'A' | 'B';

export interface PredictionRequest {
  signal: number[];
  model: ModelName;
  experiment: ExperimentLabel;
  paciente: string;
  filtro?: string;
  lookback?: number;
}

export interface PredictionResponse {
  prediction: number[];
  latency_ms: number;
  r2_score?: number;
}
