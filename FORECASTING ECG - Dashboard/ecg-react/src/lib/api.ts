import type { ECGSignal } from "@/types/ecg.types";

// En desarrollo: Vite redirige /api/* → http://localhost:8000/api/* (ver vite.config.ts)
// En Docker:     nginx redirige /api/* → http://api:8000/api/*      (ver nginx.conf)
// VITE_API_URL solo si se necesita apuntar a otro servidor.
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + "/api"
  : "/api";

const TIMEOUT_MS = 15000;
const TIMEOUT_SENAL_MS = 40000; // la señal completa son ~650 000 muestras

/** Error de la API con su código, para que la interfaz pueda distinguir casos. */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function pedir(
  url: string,
  opts?: RequestInit,
  timeoutMs = TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { ...opts, signal: controller.signal });
  } catch (e) {
    const abortado = e instanceof DOMException && e.name === "AbortError";
    throw new ApiError(
      abortado
        ? `El servicio no respondió en ${Math.round(timeoutMs / 1000)} s. ` +
          `Si lleva tiempo inactivo puede estar arrancando; inténtalo de nuevo.`
        : "No se pudo contactar con el servicio de predicción.",
    );
  } finally {
    clearTimeout(timer);
  }

  // Un 4xx o 5xx NO lanza excepción en fetch: hay que comprobarlo.
  if (!res.ok) {
    let detalle = res.statusText;
    try {
      const cuerpo = (await res.json()) as { detail?: string };
      if (cuerpo?.detail) detalle = cuerpo.detail;
    } catch {
      /* el cuerpo no era JSON; se queda con statusText */
    }
    throw new ApiError(`El servicio devolvió ${res.status}: ${detalle}`, res.status);
  }

  // Si el servidor devuelve HTML (por ejemplo el index.html del SPA cuando la
  // ruta no existe), tratarlo como error en vez de dejar que reviente después.
  const tipo = res.headers.get("content-type") ?? "";
  if (!tipo.includes("application/json")) {
    throw new ApiError(
      "El servicio devolvió una respuesta que no es JSON. Comprueba que la API esté activa.",
    );
  }
  return res.json();
}

export interface PatientSignalResponse {
  patientId: string;
  lead: string;
  signal: number[];
  r_peaks: number[];
  fs: number;
  length: number;
}

export interface ProcessResponse {
  signal: number[];
  fs: number;
  filter_type: string;
  r_peaks: number[] | null;
  beats: number[][] | null;
  rr_intervals: number[] | null;
  num_beats: number;
  beat_mu: number | null;
  beat_std: number | null;
  per_beat_mu: number[] | null;
  per_beat_std: number[] | null;
  rr_per_beat: number[] | null; // intervalo RR hacia atrás, en segundos
  processing_time_ms: number;
}

export interface PatientProcessResponse {
  patientId: string;
  lead: string;
  fs: number;
  filter_type: string;
  signal: number[];
  r_peaks: number[];
  beats: number[][] | null;
  rr_intervals: number[] | null;
  num_beats: number;
  beat_mu: number | null;
  beat_std: number | null;
  rr_per_beat: number[] | null;
  processing_time_ms: number;
}

export interface LopoResponse {
  predicted_beat: number[]; // primer latido predicho, 256 muestras
  predicted_beats: number[][]; // los 3 latidos del horizonte: (3, 256)
  model_name: string;
  r2_score: number;
  ci95: [number, number];
  processing_time_ms: number;  // total del servidor
  inference_ms?: number;       // solo la pasada del modelo; ausente en servidores antiguos
  horizon: number;
}

// La cadena del modelo final. NO lleva filtro de mediana: ese atenúa el pico R
// un 76.5 % y por eso la sexta fase lo descartó. Cambiar este valor por defecto
// haría que la señal se procese con una cadena distinta de la del entrenamiento.
export const FILTRO_MODELO = "F_NB6";

export const api = {
  /** Comprueba que el servicio esté vivo. Útil para avisar del arranque en frío. */
  salud: async (): Promise<{ status: string; models_loaded?: number }> =>
    (await pedir(`${API_BASE}/health`)) as { status: string; models_loaded?: number },

  getSignal: async (
    patientId: string,
    lead: ECGSignal["lead"] = "MLII",
    segment60s = false,
  ): Promise<PatientSignalResponse> => {
    const url =
      `${API_BASE}/signal?patientId=${encodeURIComponent(patientId)}` +
      `&lead=${encodeURIComponent(lead)}${segment60s ? "&segment_60s=true" : ""}`;
    const json = (await pedir(url, undefined, TIMEOUT_SENAL_MS)) as Partial<PatientSignalResponse>;
    if (!Array.isArray(json.signal) || json.signal.length === 0) {
      throw new ApiError(`El servicio no devolvió señal para el paciente ${patientId}.`);
    }
    return {
      patientId: json.patientId ?? patientId,
      lead: json.lead ?? lead,
      signal: json.signal,
      r_peaks: json.r_peaks ?? [],
      fs: json.fs ?? 360,
      length: json.length ?? json.signal.length,
    };
  },

  processSignal: async (data: {
    signal: number[];
    fs?: number;
    filter_type?: string;
    detect_peaks?: boolean;
    r_peaks_hint?: number[] | null;
    normalize_global?: boolean;
  }): Promise<ProcessResponse> =>
    (await pedir(`${API_BASE}/process_signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signal: data.signal,
        fs: data.fs ?? 360,
        filter_type: data.filter_type ?? FILTRO_MODELO,
        detect_peaks: data.detect_peaks ?? true,
        r_peaks_hint: data.r_peaks_hint ?? null,
        normalize_global: data.normalize_global ?? false,
      }),
    })) as ProcessResponse,

  processPatient: async (params: {
    patientId: string;
    lead?: string;
    filter_type?: string;
    normalize_global?: boolean;
  }): Promise<PatientProcessResponse> => {
    const qs = new URLSearchParams({
      patientId: params.patientId,
      lead: params.lead ?? "MLII",
      filter_type: params.filter_type ?? FILTRO_MODELO,
      normalize_global: String(params.normalize_global ?? false),
    }).toString();
    return (await pedir(
      `${API_BASE}/process_patient?${qs}`,
      { method: "POST" },
      TIMEOUT_SENAL_MS,
    )) as PatientProcessResponse;
  },

  predictLopo: async (data: {
    beats: number[][];
    lookback?: number;
    beat_mu?: number | null;
    beat_std?: number | null;
    rr_per_beat?: number[] | null;
  }): Promise<LopoResponse> =>
    (await pedir(`${API_BASE}/predict_lopo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })) as LopoResponse,
};
