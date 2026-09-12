/**
 * Experimento 8 — Error por clase de latido y detección de evento.
 *
 * Cuatro bloques, en el orden en que un lector puede creerlos:
 *
 *   1. Reproducción del pipeline. Antes de interpretar ningún error hay que acreditar
 *      que el cuaderno evalúa el mismo modelo del documento. El R² medio de los
 *      pliegues ejecutados se contrasta con el que la sexta fase obtuvo sobre esos
 *      mismos pacientes; las dos mitades declaran su archivo.
 *   2. Error por clase AAMI. Con la razón de MSE como tamaño del efecto y **sin
 *      p-valor**: el del archivo vale 0.0 por desbordamiento numérico, y eso no es un
 *      resultado que se pueda informar.
 *   3. Detección de evento. Acredita que el residuo contiene señal de arritmia, no que
 *      sirva para alertar. La dispersión entre pacientes va en el cuerpo del bloque.
 *   4. La salvedad de derivaciones.
 *
 * Ninguna cifra está escrita en este archivo: todas vienen de `useNB8Results`, que las
 * lee o las calcula sobre los archivos de `public/data/`.
 */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MetricStat, MetricGrid } from '@/components/metrics/MetricStat';
import { DataTable } from '@/components/data/DataTable';
import { PlotlyChart } from '@/components/charts/PlotlyChart';
import { Boton } from '@/components/ui/Boton';
import { tok } from '@/lib/tokens';
import {
  useNB8Results,
  FUENTE_CLASES,
  FUENTE_CONTRASTE,
  FUENTE_RESUMEN_P4,
  FUENTE_DETECCION,
  FUENTE_PROGRESO,
  FUENTE_SALVEDAD,
  FUENTE_CURVA_PR,
  FUENTE_LOPO_NB5,
} from '@/hooks/useNB8Results';
import type { FilaClaseAAMI, FilaDeteccion, ParPaciente } from '@/hooks/useNB8Results';

// ── Formato ───────────────────────────────────────────────────────────────────

const fx = (v: number | null | undefined, d = 4): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d);

const fpct = (v: number | null | undefined, d = 2): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v.toFixed(d)} %`;

const fsigno = (v: number | null | undefined, d = 4): string =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;

const fent = (v: number | null | undefined): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toLocaleString('es');

// ── Piezas de maquetación ─────────────────────────────────────────────────────

function Seccion({
  numero,
  titulo,
  entradilla,
  children,
}: {
  numero: string;
  titulo: string;
  entradilla?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-3xs)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {numero}
        </span>
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-section)',
            fontSize: 'var(--fs-lg)',
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
          }}
        >
          {titulo}
        </h3>
        {entradilla && (
          <p
            style={{
              margin: 0,
              fontSize: 'var(--fs-sm)',
              lineHeight: 1.6,
              color: 'var(--text-sub)',
              maxWidth: '78ch',
            }}
          >
            {entradilla}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

type TonoAviso = 'neutro' | 'ok' | 'atencion' | 'critico';

const COLOR_TONO: Record<TonoAviso, string> = {
  neutro: 'var(--border)',
  ok: 'var(--ok)',
  atencion: 'var(--warn)',
  critico: 'var(--crit)',
};

/** Salvedad enmarcada. El color solo aparece cuando el tono significa algo. */
function Aviso({
  tono = 'neutro',
  titulo,
  children,
}: {
  tono?: TonoAviso;
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="note"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${COLOR_TONO[tono]}`,
        borderRadius: 'var(--radius-sm)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {titulo && (
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-3xs)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: tono === 'neutro' ? 'var(--text-muted)' : COLOR_TONO[tono],
          }}
        >
          {titulo}
        </span>
      )}
      <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, color: 'var(--text-sub)', maxWidth: '80ch' }}>
        {children}
      </div>
    </div>
  );
}

/** Pie de procedencia: qué archivo y con qué n. Va debajo de cada gráfica. */
function Procedencia({ fuente, n, nota }: { fuente: string; n?: number; nota?: string }) {
  return (
    <p
      style={{
        margin: '6px 0 0',
        fontFamily: 'var(--font-data)',
        fontSize: 'var(--fs-3xs)',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
      }}
    >
      {n !== undefined ? `n = ${n.toLocaleString('es')} · ` : ''}
      Fuente: {fuente}
      {nota ? ` · ${nota}` : ''}
    </p>
  );
}

function Marco({ children, alto = 340 }: { children: ReactNode; alto?: number }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 12px 6px',
      }}
    >
      <div style={{ height: alto }}>{children}</div>
    </div>
  );
}

const CONFIG_PLOTLY = { displayModeBar: false, responsive: true };

// ── Componente ────────────────────────────────────────────────────────────────

export function NB8Content() {
  const {
    cargando,
    error,
    clases,
    claseNormal,
    clasesEctopicasOrdenadas,
    contraste,
    resumenP4,
    deteccion,
    dispersion,
    basesDeteccion,
    pacientesSinDeteccion,
    reproduccion,
    salvedad,
  } = useNB8Results();

  const [verPliegues, setVerPliegues] = useState(false);
  const [verDeteccion, setVerDeteccion] = useState(false);

  // ── Gráfica 1: R² del cuaderno 8 frente al de la sexta fase, pliegue a pliegue ──
  const trazasReproduccion = useMemo(() => {
    const pares = reproduccion?.pares ?? [];
    if (pares.length === 0) return [];
    const xs = pares.map((p) => p.r2NB5);
    const ys = pares.map((p) => p.r2NB8);
    const lo = Math.min(...xs, ...ys);
    const hi = Math.max(...xs, ...ys);
    return [
      {
        type: 'scatter',
        mode: 'lines',
        x: [lo, hi],
        y: [lo, hi],
        line: { color: tok('--border'), width: 1, dash: 'dot' },
        hoverinfo: 'skip',
        name: 'identidad',
        showlegend: false,
      },
      {
        type: 'scatter',
        mode: 'markers',
        x: xs,
        y: ys,
        text: pares.map((p) => `Paciente ${p.paciente}`),
        hovertemplate: '%{text}<br>sexta fase %{x:.4f}<br>cuaderno 8 %{y:.4f}<extra></extra>',
        marker: { color: tok('--accent'), size: 7, opacity: 0.85 },
        name: 'pliegue',
        showlegend: false,
      },
    ];
  }, [reproduccion]);

  const ejesReproduccion = useMemo(
    () => ({
      margin: { t: 10, r: 16, b: 46, l: 62 },
      xaxis: {
        title: { text: 'R² sexta fase (LOPO)', font: { size: 11 } },
        gridcolor: tok('--border'),
        zerolinecolor: tok('--border'),
      },
      yaxis: {
        title: { text: 'R² cuaderno 8', font: { size: 11 } },
        gridcolor: tok('--border'),
        zerolinecolor: tok('--border'),
      },
    }),
    [],
  );

  // ── Gráfica 2: MSE medio y correlación de forma por clase AAMI ────────────────
  const trazasClases = useMemo(() => {
    if (clases.length === 0) return [];
    const etiquetas = clases.map((c) => c.clase_aami);
    return [
      {
        type: 'bar',
        x: etiquetas,
        y: clases.map((c) => c.mse_media),
        name: 'MSE medio',
        marker: {
          color: clases.map((c) =>
            c.grupo === 'ectopico' ? tok('--warn') : c.grupo === 'normal' ? tok('--accent') : tok('--text-muted'),
          ),
        },
        hovertemplate: '%{x}<br>MSE %{y:.4f}<extra></extra>',
      },
      {
        type: 'scatter',
        mode: 'markers+lines',
        x: etiquetas,
        y: clases.map((c) => c.shape_corr_media),
        name: 'Correlación de forma',
        yaxis: 'y2',
        marker: { color: tok('--ok'), size: 9 },
        line: { color: tok('--ok'), width: 1 },
        hovertemplate: '%{x}<br>corr %{y:.4f}<extra></extra>',
      },
    ];
  }, [clases]);

  const ejesClases = useMemo(
    () => ({
      margin: { t: 10, r: 58, b: 40, l: 58 },
      showlegend: true,
      legend: { orientation: 'h', y: -0.18, font: { size: 10 } },
      xaxis: { title: { text: 'Clase AAMI', font: { size: 11 } }, gridcolor: tok('--border') },
      yaxis: {
        title: { text: 'MSE medio', font: { size: 11 } },
        gridcolor: tok('--border'),
        zerolinecolor: tok('--border'),
      },
      yaxis2: {
        title: { text: 'Corr. de forma', font: { size: 11 } },
        overlaying: 'y',
        side: 'right',
        range: [0, 1],
        showgrid: false,
      },
    }),
    [],
  );

  // ── Gráfica 3: dispersión entre pacientes de precisión y exhaustividad ────────
  const trazasCajas = useMemo(() => {
    if (deteccion.length === 0) return [];
    const caja = (valores: number[], nombre: string, color: string) => ({
      type: 'box',
      y: valores,
      name: nombre,
      boxpoints: 'all',
      jitter: 0.45,
      pointpos: 0,
      marker: { color, size: 5, opacity: 0.75 },
      line: { color },
      fillcolor: 'transparent',
      hovertemplate: '%{y:.4f}<extra></extra>',
    });
    return [
      caja(deteccion.map((r) => r.precision), 'Precisión', tok('--crit')),
      caja(deteccion.map((r) => r.exhaustividad), 'Exhaustividad', tok('--accent')),
      caja(deteccion.map((r) => r.f1), 'F1', tok('--text-muted')),
      caja(deteccion.map((r) => r.ap), 'AP por paciente', tok('--ok')),
    ];
  }, [deteccion]);

  const ejesCajas = useMemo(
    () => ({
      margin: { t: 10, r: 16, b: 34, l: 56 },
      showlegend: false,
      yaxis: { range: [-0.03, 1.03], gridcolor: tok('--border'), zerolinecolor: tok('--border') },
      xaxis: { gridcolor: tok('--border') },
    }),
    [],
  );

  // ── Gráfica 4: precisión frente a exhaustividad, un punto por paciente ────────
  const trazasNube = useMemo(() => {
    if (deteccion.length === 0) return [];
    const bases = Array.from(new Set(deteccion.map((r) => r.base)));
    const colores = [tok('--accent'), tok('--warn'), tok('--ok'), tok('--crit')];
    return bases.map((base, i) => {
      const filas = deteccion.filter((r) => r.base === base);
      return {
        type: 'scatter',
        mode: 'markers',
        x: filas.map((r) => r.exhaustividad),
        y: filas.map((r) => r.precision),
        name: `${base} (n = ${filas.length})`,
        text: filas.map((r) => `Paciente ${r.paciente}`),
        hovertemplate:
          '%{text}<br>exhaustividad %{x:.4f}<br>precisión %{y:.4f}<extra></extra>',
        marker: { color: colores[i % colores.length], size: 8, opacity: 0.8 },
      };
    });
  }, [deteccion]);

  const ejesNube = useMemo(() => {
    const prev = resumenP4?.prevalencia;
    return {
      margin: { t: 10, r: 16, b: 46, l: 58 },
      showlegend: true,
      legend: { orientation: 'h', y: -0.22, font: { size: 10 } },
      xaxis: {
        title: { text: 'Exhaustividad', font: { size: 11 } },
        range: [-0.03, 1.03],
        gridcolor: tok('--border'),
      },
      yaxis: {
        title: { text: 'Precisión', font: { size: 11 } },
        range: [-0.03, 1.03],
        gridcolor: tok('--border'),
      },
      // La prevalencia es la precisión de un clasificador que dispara al azar: por
      // debajo de esa línea el residuo no aporta nada en ese paciente.
      shapes:
        prev !== undefined && Number.isFinite(prev)
          ? [
              {
                type: 'line',
                xref: 'paper',
                x0: 0,
                x1: 1,
                y0: prev,
                y1: prev,
                line: { color: tok('--text-muted'), width: 1, dash: 'dot' },
              },
            ]
          : [],
    };
  }, [resumenP4]);

  // ── Tablas ───────────────────────────────────────────────────────────────────

  const columnasClases = useMemo(
    () => [
      { key: 'clase_aami', label: 'Clase AAMI' },
      {
        key: 'grupo',
        label: 'Grupo',
        render: (v: unknown) =>
          v === 'normal' ? 'normal' : v === 'ectopico' ? 'ectópico' : 'no clasificable',
      },
      { key: 'n', label: 'Latidos', align: 'right' as const, render: (v: unknown) => fent(v as number) },
      { key: 'pct', label: '% del total', align: 'right' as const, render: (v: unknown) => fpct(v as number) },
      { key: 'mse_media', label: 'MSE medio', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      { key: 'mse_mediana', label: 'MSE mediana', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      { key: 'rmse_media', label: 'RMSE medio', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      { key: 'mae_media', label: 'MAE medio', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      {
        key: 'shape_corr_media',
        label: 'Corr. de forma',
        align: 'right' as const,
        render: (v: unknown) => fx(v as number),
      },
      {
        key: 'razonMseVsNormal',
        label: 'MSE ÷ MSE de N',
        align: 'right' as const,
        render: (v: unknown) => `${fx(v as number, 3)} ×`,
      },
      {
        key: 'deltaCorrVsNormal',
        label: 'Δ corr. vs N',
        align: 'right' as const,
        render: (v: unknown) => fsigno(v as number),
      },
    ],
    [],
  );

  const columnasDeteccion = useMemo(
    () => [
      { key: 'paciente', label: 'Paciente' },
      { key: 'base', label: 'Base' },
      { key: 'umbral', label: 'Umbral', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      { key: 'n', label: 'Latidos', align: 'right' as const, render: (v: unknown) => fent(v as number) },
      { key: 'n_ectopicos', label: 'Ectópicos', align: 'right' as const, render: (v: unknown) => fent(v as number) },
      { key: 'VP', label: 'VP', align: 'right' as const, render: (v: unknown) => fent(v as number) },
      { key: 'FP', label: 'FP', align: 'right' as const, render: (v: unknown) => fent(v as number) },
      { key: 'FN', label: 'FN', align: 'right' as const, render: (v: unknown) => fent(v as number) },
      { key: 'VN', label: 'VN', align: 'right' as const, render: (v: unknown) => fent(v as number) },
      { key: 'precision', label: 'Precisión', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      {
        key: 'exhaustividad',
        label: 'Exhaustividad',
        align: 'right' as const,
        render: (v: unknown) => fx(v as number),
      },
      {
        key: 'especificidad',
        label: 'Especificidad',
        align: 'right' as const,
        render: (v: unknown) => fx(v as number),
      },
      { key: 'f1', label: 'F1', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      { key: 'ap', label: 'AP', align: 'right' as const, render: (v: unknown) => fx(v as number) },
    ],
    [],
  );

  const columnasPliegues = useMemo(
    () => [
      { key: 'paciente', label: 'Paciente' },
      { key: 'r2NB8', label: 'R² cuaderno 8', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      { key: 'r2NB5', label: 'R² sexta fase', align: 'right' as const, render: (v: unknown) => fx(v as number) },
      { key: 'delta', label: 'Δ', align: 'right' as const, render: (v: unknown) => fsigno(v as number) },
      { key: 'latidos', label: 'Latidos', align: 'right' as const, render: (v: unknown) => fent(v as number) },
      { key: 'minutos', label: 'Minutos', align: 'right' as const, render: (v: unknown) => fx(v as number, 2) },
    ],
    [],
  );

  // ── Estados ──────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--fs-sm)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        Cargando los resultados del experimento 8…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          padding: '20px',
          color: 'var(--crit)',
          background: 'var(--surface)',
          border: '1px solid var(--crit)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--fs-sm)',
          lineHeight: 1.6,
        }}
      >
        No se han podido cargar los datos del experimento 8: {error}
      </div>
    );
  }

  const peor = clasesEctopicasOrdenadas[0] ?? null;
  const mejores = clasesEctopicasOrdenadas.slice(1);
  const salvedadEvaluados = reproduccion
    ? salvedad.filter((s) => reproduccion.pacientes.includes(s.paciente))
    : salvedad;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      {/* ══ Bloque 1 ══════════════════════════════════════════════════════════ */}
      <Seccion
        numero="Bloque 1"
        titulo="Reproducción del pipeline"
        entradilla={
          <>
            Antes de interpretar ningún error hay que acreditar que este cuaderno evalúa el mismo
            modelo del documento. El R² medio de los pliegues ejecutados se lee de{' '}
            <code>{FUENTE_PROGRESO}</code>; el valor de contraste <strong>no está en la carpeta del
            experimento 8</strong>: se calcula aquí sobre <code>{FUENTE_LOPO_NB5}</code>,
            filtrando el modelo {reproduccion?.modeloNB5 ?? '—'} y quedándose únicamente con los
            pacientes que aparecen en el progreso. Sin esa restricción se compararían{' '}
            {fent(reproduccion?.nEjecutados)} pliegues contra los 123 del archivo, que es otra
            cohorte.
          </>
        }
      >
        <MetricGrid minimo={190}>
          <MetricStat
            densa
            etiqueta="R² medio · cuaderno 8"
            valor={fx(reproduccion?.r2MedioNB8)}
            n={reproduccion?.n}
            fase="NB8"
            fuente={FUENTE_PROGRESO}
          />
          <MetricStat
            densa
            etiqueta="R² medio · sexta fase"
            valor={fx(reproduccion?.r2MedioNB5)}
            n={reproduccion?.n}
            fase="NB6"
            fuente={reproduccion?.fuenteNB5 ?? FUENTE_LOPO_NB5}
            referencia={`modelo ${reproduccion?.modeloNB5 ?? '—'}, mismos pacientes`}
          />
          <MetricStat
            densa
            etiqueta="Diferencia"
            valor={fsigno(reproduccion?.delta)}
            n={reproduccion?.n}
            fuente="calculado: progreso.json − resultados_lopo.csv"
            nota="Diferencia de medias entre los dos archivos, pliegue a pliegue emparejado."
          />
          <MetricStat
            densa
            etiqueta="R² mediana · cuaderno 8"
            valor={fx(reproduccion?.r2MedianaNB8)}
            n={reproduccion?.nEjecutados}
            fase="NB8"
            fuente={FUENTE_PROGRESO}
            referencia={`recorrido ${fx(reproduccion?.r2MinNB8)} – ${fx(reproduccion?.r2MaxNB8)}`}
          />
          <MetricStat
            densa
            etiqueta="Latidos evaluados"
            valor={fent(reproduccion?.latidosTotales)}
            n={reproduccion?.nEjecutados}
            fase="NB8"
            fuente={FUENTE_PROGRESO}
          />
          <MetricStat
            densa
            etiqueta="Cómputo acumulado"
            valor={fx(reproduccion?.minutosTotales, 1)}
            unidad="min"
            n={reproduccion?.nEjecutados}
            fase="NB8"
            fuente={FUENTE_PROGRESO}
          />
        </MetricGrid>

        <Marco alto={320}>
          <PlotlyChart
            data={trazasReproduccion}
            layout={ejesReproduccion}
            config={CONFIG_PLOTLY}
            vacio="No hay pliegues emparejados que representar."
          />
        </Marco>
        <Procedencia
          fuente={`${FUENTE_PROGRESO} + ${FUENTE_LOPO_NB5}`}
          n={reproduccion?.n}
          nota="cada punto es un paciente; la diagonal punteada es la identidad"
        />

        {reproduccion && reproduccion.pacientesSinContraste.length > 0 && (
          <Aviso tono="atencion" titulo="Pliegues sin valor de contraste">
            {reproduccion.pacientesSinContraste.length} de los {reproduccion.nEjecutados} pacientes
            ejecutados no aparecen en el LOPO de la sexta fase, así que quedan fuera de la
            comparación: {reproduccion.pacientesSinContraste.join(', ')}.
          </Aviso>
        )}

        <div>
          <Boton
            tamano="sm"
            variante="secundario"
            activo={verPliegues}
            onClick={() => setVerPliegues((v) => !v)}
            aria-expanded={verPliegues}
          >
            {verPliegues ? 'Ocultar los pliegues emparejados' : 'Ver los pliegues emparejados'}
          </Boton>
        </div>
        {verPliegues && reproduccion && (
          <DataTable<ParPaciente>
            data={reproduccion.pares}
            columns={columnasPliegues}
            porPagina={25}
            maxHeight="460px"
            fuente={`${FUENTE_PROGRESO} + ${FUENTE_LOPO_NB5}`}
            caption="R² de cada pliegue en el cuaderno 8 y en la sexta fase, con su diferencia."
          />
        )}
      </Seccion>

      {/* ══ Bloque 2 ══════════════════════════════════════════════════════════ */}
      <Seccion
        numero="Bloque 2"
        titulo="Error por clase de latido AAMI"
        entradilla={
          <>
            El error de predicción se descompone por la clase del latido anotada en la base. El
            contraste normal frente a ectópico agrupa {contraste?.clasesEctopicas.join(', ') ?? '—'}{' '}
            como ectópicas y deja fuera {contraste?.clasesExcluidas.join(', ') ?? '—'} (latido no
            clasificable o de marcapasos): {fent(contraste?.nExcluidos)} latidos que no entran en la
            comparación.
          </>
        }
      >
        <MetricGrid minimo={190}>
          <MetricStat
            densa
            etiqueta="MSE · latido normal"
            valor={fx(contraste?.mse_normal)}
            n={contraste?.n_normal}
            fase="NB8"
            fuente={FUENTE_CONTRASTE}
          />
          <MetricStat
            densa
            etiqueta="MSE · latido ectópico"
            valor={fx(contraste?.mse_ectopico)}
            n={contraste?.n_ectopico}
            fase="NB8"
            fuente={FUENTE_CONTRASTE}
            estado="atencion"
          />
          <MetricStat
            densa
            etiqueta="Razón ectópico ÷ normal"
            valor={fx(contraste?.razon)}
            unidad="×"
            n={contraste?.n_total}
            fase="NB8"
            fuente={FUENTE_CONTRASTE}
            estado="atencion"
            nota="Tamaño del efecto. Es la cifra que se informa; el p-valor, no."
          />
          <MetricStat
            densa
            etiqueta="U de Mann-Whitney"
            valor={contraste ? contraste.U.toExponential(4) : null}
            n={contraste?.n_total}
            fase="NB8"
            fuente={FUENTE_CONTRASTE}
            nota="Estadístico del contraste, sin su p-valor asociado."
          />
        </MetricGrid>

        <Aviso tono="critico" titulo="El p-valor no se informa">
          El archivo <code>{FUENTE_CONTRASTE}</code> guarda un p-valor de 0.0 para este contraste.{' '}
          <strong>No se muestra, y no debe citarse.</strong> Un p-valor nunca es cero: con{' '}
          {fent(contraste?.n_total)} latidos en la comparación, la aproximación normal del
          estadístico U cae por debajo de la precisión del punto flotante y el cálculo devuelve un
          cero que es desbordamiento numérico, no un resultado. Con muestras de este tamaño casi
          cualquier diferencia sale «significativa», de modo que la significación no aporta nada
          aquí: lo que informa es el tamaño del efecto, la razón de MSE de{' '}
          {fx(contraste?.razon)} × que sí se muestra arriba.
        </Aviso>

        {contraste && !contraste.contrasteCuadra && (
          <Aviso tono="atencion" titulo="Los n no cuadran">
            Los latidos por clase de <code>{FUENTE_CLASES}</code> no reproducen los n de{' '}
            <code>{FUENTE_CONTRASTE}</code>. La agrupación del contraste no es la que esta tabla
            deja suponer; conviene revisar el cuaderno antes de citar la razón.
          </Aviso>
        )}

        <DataTable<FilaClaseAAMI>
          data={clases}
          columns={columnasClases}
          porPagina={0}
          maxHeight="none"
          fuente={FUENTE_CLASES}
          caption="Error de predicción por clase AAMI. Las dos últimas columnas se calculan tomando la clase N como referencia."
        />

        <Marco alto={330}>
          <PlotlyChart
            data={trazasClases}
            layout={ejesClases}
            config={CONFIG_PLOTLY}
            vacio="No hay clases que representar."
          />
        </Marco>
        <Procedencia
          fuente={FUENTE_CLASES}
          n={clases.reduce((s, c) => s + c.n, 0)}
          nota="barras: MSE medio (eje izquierdo); puntos: correlación de forma (eje derecho)"
        />

        {peor && claseNormal && (
          <Aviso tono="atencion" titulo="El deterioro no es uniforme entre clases ectópicas">
            La razón global de {fx(contraste?.razon)} × esconde que el daño se concentra en una sola
            clase. {peor.clase_aami} tiene un MSE medio de {fx(peor.mse_media)} —{' '}
            {fx(peor.razonMseVsNormal, 2)} × el del latido normal — y su correlación de forma cae a{' '}
            {fx(peor.shape_corr_media)} frente a {fx(claseNormal.shape_corr_media)} de la clase N:{' '}
            {fsigno(peor.deltaCorrVsNormal)}. Ahí la predicción deja de reproducir la morfología, no
            solo la amplitud.{' '}
            {mejores.length > 0 && (
              <>
                Las demás clases ectópicas se comportan mucho más cerca de la normal:{' '}
                {mejores
                  .map(
                    (c) =>
                      `${c.clase_aami} con MSE ${fx(c.mse_media)} (${fx(c.razonMseVsNormal, 2)} ×) y correlación ${fx(c.shape_corr_media)}`,
                  )
                  .join('; ')}
                .{' '}
              </>
            )}
            {clases
              .filter((c) => c.grupo === 'no_clasificable' && c.mse_media < claseNormal.mse_media)
              .map((c) => (
                <span key={c.clase_aami}>
                  Y {c.clase_aami}, que el contraste excluye, sale incluso algo mejor que la clase
                  normal: MSE {fx(c.mse_media)} frente a {fx(claseNormal.mse_media)} y correlación{' '}
                  {fx(c.shape_corr_media)} frente a {fx(claseNormal.shape_corr_media)}.{' '}
                </span>
              ))}
            La conclusión honesta es que el modelo falla ante el latido ventricular, no ante «lo
            ectópico» en bloque.
          </Aviso>
        )}
      </Seccion>

      {/* ══ Bloque 3 ══════════════════════════════════════════════════════════ */}
      <Seccion
        numero="Bloque 3"
        titulo="Detección de evento a partir del residuo"
        entradilla={
          <>
            Si el error crece ante el latido ectópico, el residuo debería servir para ordenar los
            latidos por sospecha. Se puntúa cada latido con su {resumenP4?.puntuacion ?? '—'} y se
            mide el área bajo la curva de precisión-exhaustividad sobre{' '}
            {fent(resumenP4?.n_latidos)} latidos de {fent(resumenP4?.n_pacientes)} pacientes.
          </>
        }
      >
        <MetricGrid minimo={190}>
          <MetricStat
            densa
            etiqueta="AUC-PR"
            valor={fx(resumenP4?.auc_pr)}
            n={resumenP4?.n_latidos}
            fase="NB8"
            fuente={FUENTE_RESUMEN_P4}
          />
          <MetricStat
            densa
            etiqueta="Prevalencia"
            valor={fx(resumenP4?.prevalencia)}
            n={resumenP4?.n_latidos}
            fase="NB8"
            fuente={FUENTE_RESUMEN_P4}
            referencia={`${fent(resumenP4?.n_ectopicos)} ectópicos de ${fent(resumenP4?.n_latidos)}`}
            nota="Es la línea de azar: el AUC-PR que obtendría una puntuación aleatoria."
          />
          <MetricStat
            densa
            etiqueta="Ganancia sobre el azar"
            valor={fx(resumenP4?.ganancia)}
            unidad="×"
            n={resumenP4?.n_latidos}
            fase="NB8"
            fuente={FUENTE_RESUMEN_P4}
            estado="bueno"
            nota="AUC-PR dividido por la prevalencia."
          />
          <MetricStat
            densa
            etiqueta="Precisión · mediana"
            valor={fx(dispersion.precision?.mediana)}
            n={dispersion.precision?.n}
            fase="NB8"
            fuente={FUENTE_DETECCION}
            estado="atencion"
            referencia={`recorrido ${fx(dispersion.precision?.min)} – ${fx(dispersion.precision?.max)}`}
          />
          <MetricStat
            densa
            etiqueta="Exhaustividad · mediana"
            valor={fx(dispersion.exhaustividad?.mediana)}
            n={dispersion.exhaustividad?.n}
            fase="NB8"
            fuente={FUENTE_DETECCION}
            referencia={`recorrido ${fx(dispersion.exhaustividad?.min)} – ${fx(dispersion.exhaustividad?.max)}`}
          />
          <MetricStat
            densa
            etiqueta="F1 · mediana"
            valor={fx(dispersion.f1?.mediana)}
            n={dispersion.f1?.n}
            fase="NB8"
            fuente={FUENTE_DETECCION}
            referencia={`recorrido ${fx(dispersion.f1?.min)} – ${fx(dispersion.f1?.max)}`}
          />
        </MetricGrid>

        <Aviso tono="neutro" titulo="Por qué el área bajo la curva de precisión-exhaustividad y no la ROC">
          Con una prevalencia de {fx(resumenP4?.prevalencia)} — {fent(resumenP4?.n_ectopicos)}{' '}
          latidos ectópicos entre {fent(resumenP4?.n_latidos)} — la clase negativa es abrumadora. La
          ROC cruza la tasa de falsos positivos, que se calcula sobre esa clase negativa enorme:
          miles de falsas alarmas apenas la mueven, y la curva sale engañosamente favorable. La
          precisión, en cambio, divide por los positivos declarados, así que cada falsa alarma se
          paga. Por eso la métrica es el AUC-PR y su referencia de azar es la prevalencia, no el 0.5
          de la ROC.
        </Aviso>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 12,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
            }}
          >
            <img
              src={FUENTE_CURVA_PR}
              alt="Curva de precisión-exhaustividad de la detección de latido ectópico a partir del residuo, con la línea de prevalencia como referencia de azar."
              loading="lazy"
              decoding="async"
              style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}
            />
            <Procedencia
              fuente={FUENTE_CURVA_PR}
              n={resumenP4?.n_latidos}
              nota="curva generada en el cuaderno"
            />
          </div>
          <div>
            <Marco alto={330}>
              <PlotlyChart
                data={trazasCajas}
                layout={ejesCajas}
                config={CONFIG_PLOTLY}
                vacio="No hay pacientes con métricas de detección."
              />
            </Marco>
            <Procedencia
              fuente={FUENTE_DETECCION}
              n={deteccion.length}
              nota="un punto por paciente; la caja es el recorrido intercuartílico"
            />
          </div>
        </div>

        <Aviso tono="critico" titulo="Esto no es un detector clínico utilizable">
          El resultado acredita que el residuo <strong>contiene</strong> señal de arritmia: con una
          ganancia de {fx(resumenP4?.ganancia)} × sobre la prevalencia, ordenar los latidos por error
          de predicción concentra los ectópicos muy por encima del azar. No acredita que sirva para
          alertar. Paciente a paciente, la precisión tiene mediana {fx(dispersion.precision?.mediana)}{' '}
          y va de {fx(dispersion.precision?.min)} a {fx(dispersion.precision?.max)} (recorrido{' '}
          {fx(dispersion.precision?.recorrido)}; intercuartílico {fx(dispersion.precision?.p25)} –{' '}
          {fx(dispersion.precision?.p75)}), y la exhaustividad tiene mediana{' '}
          {fx(dispersion.exhaustividad?.mediana)} con recorrido {fx(dispersion.exhaustividad?.min)} –{' '}
          {fx(dispersion.exhaustividad?.max)}. Esa dispersión es parte del resultado, no una nota al
          pie: hay registros donde la mitad de las alarmas o más serían falsas, de modo que el
          rendimiento agregado no se traslada al paciente concreto. El umbral, además, no es una
          decisión clínica: es un corte sobre la distribución del error, con mediana{' '}
          {fx(dispersion.umbral?.mediana)} y recorrido {fx(dispersion.umbral?.min)} –{' '}
          {fx(dispersion.umbral?.max)} entre los {fent(dispersion.umbral?.n)} pacientes.
        </Aviso>

        <Marco alto={340}>
          <PlotlyChart
            data={trazasNube}
            layout={ejesNube}
            config={CONFIG_PLOTLY}
            vacio="No hay pacientes con métricas de detección."
          />
        </Marco>
        <Procedencia
          fuente={FUENTE_DETECCION}
          n={deteccion.length}
          nota="la línea punteada es la prevalencia global, es decir la precisión del azar"
        />

        {(pacientesSinDeteccion.length > 0 || basesDeteccion.length > 1) && (
          <Aviso tono="atencion" titulo="El n de la detección por paciente no es el de los pliegues">
            {basesDeteccion.length > 0 && (
              <>
                El archivo <code>{FUENTE_DETECCION}</code> trae {deteccion.length} filas, repartidas
                en {basesDeteccion.map((b) => `${b.base}: ${b.n}`).join(', ')}.{' '}
              </>
            )}
            {pacientesSinDeteccion.length > 0 && reproduccion && (
              <>
                Son {pacientesSinDeteccion.length} menos que los {reproduccion.nEjecutados} pliegues
                ejecutados: {pacientesSinDeteccion.join(', ')} no tienen fila, así que la mediana y
                el recorrido de arriba se calculan sobre {deteccion.length} pacientes, no sobre{' '}
                {reproduccion.nEjecutados}.
              </>
            )}
          </Aviso>
        )}

        <div>
          <Boton
            tamano="sm"
            variante="secundario"
            activo={verDeteccion}
            onClick={() => setVerDeteccion((v) => !v)}
            aria-expanded={verDeteccion}
          >
            {verDeteccion ? 'Ocultar la detección por paciente' : 'Ver la detección por paciente'}
          </Boton>
        </div>
        {verDeteccion && (
          <DataTable<FilaDeteccion>
            data={deteccion}
            columns={columnasDeteccion}
            porPagina={25}
            maxHeight="460px"
            fuente={FUENTE_DETECCION}
            caption="Conteos y métricas de detección de cada paciente, con el umbral aplicado."
          />
        )}
      </Seccion>

      {/* ══ Bloque 4 ══════════════════════════════════════════════════════════ */}
      <Seccion
        numero="Bloque 4"
        titulo="Salvedad de las derivaciones"
        entradilla={
          <>
            El pipeline asume la derivación MLII. Estos registros de{' '}
            <code>{FUENTE_SALVEDAD}</code> no la tienen en la posición esperada, de modo que su
            error por clase y su detección no son estrictamente comparables con los demás.
          </>
        }
      >
        {salvedad.length === 0 ? (
          <Aviso tono="neutro">
            El archivo <code>{FUENTE_SALVEDAD}</code> no declara ningún registro con derivaciones
            distintas de las esperadas.
          </Aviso>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
              }}
            >
              {salvedad.map((s) => (
                <div
                  key={s.paciente}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--warn)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: 'var(--fs-3xs)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Paciente
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--fs-md)',
                      fontWeight: 600,
                      color: 'var(--text)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.paciente}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: 'var(--fs-2xs)',
                      color: 'var(--text-sub)',
                    }}
                  >
                    canales: {s.canales.join(' · ')}
                  </span>
                </div>
              ))}
            </div>
            <Aviso tono="atencion" titulo="Qué implica">
              {salvedad.length}{' '}
              {salvedad.length === 1 ? 'registro declara' : 'registros declaran'} una combinación de
              canales distinta de la habitual
              {reproduccion && (
                <>
                  , y {salvedadEvaluados.length} de{' '}
                  {salvedadEvaluados.length === 1 ? 'ese registro está' : 'esos registros están'}{' '}
                  entre los {reproduccion.nEjecutados} pliegues evaluados
                </>
              )}
              . En ellos el canal analizado no es el MLII que el pipeline supone, así que la
              morfología del latido —y con ella el error por clase y la puntuación de detección— se
              mide sobre una señal de otra geometría. Sus filas siguen contando en los agregados de
              los bloques 2 y 3; queda dicho para que no se lean como equivalentes.
            </Aviso>
          </>
        )}
        <Procedencia fuente={FUENTE_SALVEDAD} n={salvedad.length} />
      </Seccion>
    </div>
  );
}

export default NB8Content;
