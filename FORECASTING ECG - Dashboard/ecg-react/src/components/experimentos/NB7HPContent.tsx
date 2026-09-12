/**
 * Experimento 7 — Busqueda sistematica de hiperparametros.
 *
 * El resultado que esta vista tiene que contar es contraintuitivo: la busqueda NO
 * encontro ninguna configuracion mejor que la que el proyecto ya usaba. Eso no es un
 * fracaso del experimento, es su conclusion: el R2 publicado no depende de una
 * configuracion afortunada, y el analisis de sensibilidad lo respalda.
 *
 * Todas las cifras vienen del hook `useNB7HPResults`, que las lee de archivos. Aqui
 * solo se formatean. Cada tabla y cada tarjeta declara su archivo de procedencia y su
 * n, para que cualquier cifra de la pantalla se pueda comprobar abriendo el archivo.
 *
 * La unica cifra que se queda fuera a proposito: la prueba de Wilcoxon emparejada
 * ENTRE arquitecturas (CNN_GRU_ATTN optimizada frente a GRU optimizado). No esta en
 * ningun archivo de resultados, asi que no se muestra; en su lugar se presentan las
 * diferencias emparejadas y el conteo de pliegues, que si se calculan sobre los
 * vectores de hp_dl_resumen.json.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MetricStat, MetricGrid } from '@/components/metrics/MetricStat';
import { DataTable } from '@/components/data/DataTable';
import { PlotlyChart } from '@/components/charts/PlotlyChart';
import { Boton, GrupoBotones } from '@/components/ui/Boton';
import { useIsDark } from '@/hooks/useIsDark';
import { tok } from '@/lib/tokens';
import {
  FUENTES_NB7HP,
  type ArquitecturaHP,
  type NB7HPResultado,
} from '@/hooks/useNB7HPResults';

/* ───────────────────────────── formateo ──────────────────────────────────── */

const dec = (x: number | null | undefined, n = 4): string =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(n);

/** Un valor p con la precision que merece: 1.0000 arriba, 3 cifras cuando es chico. */
const decP = (p: number | null | undefined): string => {
  if (p === null || p === undefined || !Number.isFinite(p)) return '—';
  return p >= 0.01 ? p.toFixed(4) : p.toPrecision(3);
};

const conSigno = (x: number | null | undefined, n = 4): string => {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  return `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(n)}`;
};

const ETIQUETA_ARQ: Record<ArquitecturaHP, string> = {
  CNN_GRU_ATTN: 'CNN GRU ATTN',
  GRU: 'GRU',
};

/* ─────────────────────── piezas de presentacion ──────────────────────────── */

function Seccion({
  numero,
  titulo,
  bajada,
  children,
}: {
  numero: string;
  titulo: string;
  bajada?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', marginBottom: '6px' }}>
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-3xs)',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: '3px',
            padding: '1px 5px',
            flex: 'none',
          }}
        >
          {numero}
        </span>
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-md)',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          {titulo}
        </h3>
      </div>
      {bajada && (
        <p
          style={{
            margin: '0 0 12px 0',
            fontSize: 'var(--fs-sm)',
            lineHeight: 1.6,
            color: 'var(--text-sub)',
            maxWidth: '76ch',
          }}
        >
          {bajada}
        </p>
      )}
      {children}
    </section>
  );
}

function Subtitulo({ children, nota }: { children: ReactNode; nota?: ReactNode }) {
  return (
    <div style={{ margin: '18px 0 8px 0' }}>
      <h4
        style={{
          margin: 0,
          fontSize: 'var(--fs-sm)',
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '0.01em',
        }}
      >
        {children}
      </h4>
      {nota && (
        <p style={{ margin: '3px 0 0 0', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
          {nota}
        </p>
      )}
    </div>
  );
}

type TonoAviso = 'neutro' | 'atencion' | 'critico';

const TONOS: Record<TonoAviso, { borde: string; fondo: string; titulo: string }> = {
  neutro: { borde: 'var(--border)', fondo: 'var(--surface)', titulo: 'var(--accent)' },
  atencion: { borde: 'var(--warn)', fondo: 'var(--warn-tint)', titulo: 'var(--warn)' },
  critico: { borde: 'var(--crit)', fondo: 'var(--crit-tint)', titulo: 'var(--crit)' },
};

function Aviso({
  tono = 'neutro',
  titulo,
  children,
}: {
  tono?: TonoAviso;
  titulo: string;
  children: ReactNode;
}) {
  const t = TONOS[tono];
  return (
    <div
      role="note"
      style={{
        border: `1px solid ${t.borde}`,
        background: t.fondo,
        borderRadius: 'var(--radius-sm)',
        padding: '12px 14px',
        marginBottom: '14px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-data)',
          fontSize: 'var(--fs-3xs)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: t.titulo,
          marginBottom: '5px',
        }}
      >
        {titulo}
      </div>
      <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, color: 'var(--text)' }}>
        {children}
      </div>
    </div>
  );
}

/** Lista numerada de salvedades, cada una con su archivo de procedencia al pie. */
function Salvedad({
  numero,
  titulo,
  fuente,
  children,
}: {
  numero: number;
  titulo: string;
  fuente?: string;
  children: ReactNode;
}) {
  return (
    <li
      style={{
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 14px',
        listStyle: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '9px', alignItems: 'baseline' }}>
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-2xs)',
            color: 'var(--warn)',
            flex: 'none',
          }}
        >
          {numero}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)' }}>
            {titulo}
          </div>
          <div
            style={{
              fontSize: 'var(--fs-sm)',
              lineHeight: 1.6,
              color: 'var(--text-sub)',
              marginTop: '3px',
            }}
          >
            {children}
          </div>
          {fuente && (
            <div
              style={{
                marginTop: '7px',
                paddingTop: '5px',
                borderTop: '1px solid var(--border)',
                fontFamily: 'var(--font-data)',
                fontSize: 'var(--fs-3xs)',
                color: 'var(--text-muted)',
              }}
            >
              Fuente: {fuente}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Ficha({ titulo, datos }: { titulo: string; datos: [string, string][] }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-data)',
          fontSize: 'var(--fs-3xs)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '7px',
        }}
      >
        {titulo}
      </div>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px' }}>
        {datos.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>{k}</dt>
            <dd
              style={{
                margin: 0,
                fontFamily: 'var(--font-data)',
                fontSize: 'var(--fs-2xs)',
                color: 'var(--text)',
                fontVariantNumeric: 'tabular-nums',
                overflowWrap: 'anywhere',
              }}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Envoltorio({ children }: { children: ReactNode }) {
  return <div className="card" style={{ padding: '16px', marginBottom: '14px' }}>{children}</div>;
}

/* ──────────────────────────── el componente ──────────────────────────────── */

export function NB7HPContent({ datos, cargando, error }: NB7HPResultado) {
  const [arq, setArq] = useState<ArquitecturaHP>('CNN_GRU_ATTN');
  const esOscuro = useIsDark();

  // Los colores de Plotly se escriben como atributos del SVG, donde var(--x) no
  // resuelve: hay que pasarlos por tok(). Se recalculan al cambiar el tema.
  const color = useMemo(
    () => ({
      texto: tok('--text'),
      tenue: tok('--text-muted'),
      borde: tok('--border'),
      acento: tok('--accent'),
      ok: tok('--ok'),
      warn: tok('--warn'),
      crit: tok('--crit'),
    }),
    [esOscuro],
  );

  const ejeComun = useMemo(
    () => ({
      gridcolor: color.borde,
      zerolinecolor: color.borde,
      linecolor: color.borde,
      tickfont: { color: color.tenue, size: 10 },
      titlefont: { color: color.tenue, size: 11 },
    }),
    [color],
  );

  /* ── estados de carga y de error ────────────────────────────────────────── */

  if (cargando) {
    return (
      <Envoltorio>
        <div
          role="status"
          aria-live="polite"
          style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}
        >
          Cargando los resultados de la búsqueda de hiperparámetros…
        </div>
        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden
              style={{
                height: '54px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      </Envoltorio>
    );
  }

  if (error || !datos) {
    return (
      <Envoltorio>
        <Aviso tono="critico" titulo="No se pudieron cargar los datos">
          {error ?? 'El hook no devolvió datos.'}
          <div
            style={{
              marginTop: '8px',
              fontFamily: 'var(--font-data)',
              fontSize: 'var(--fs-2xs)',
              color: 'var(--text-sub)',
            }}
          >
            Se esperaban, entre otros: {FUENTES_NB7HP.dlResumen}, {FUENTES_NB7HP.tradResumen}.
          </div>
        </Aviso>
      </Envoltorio>
    );
  }

  const {
    dl,
    configs,
    hpColumnas,
    sensibilidad,
    recorridos,
    mejorConfig,
    configBase,
    lrMinima,
    minutosTotales,
    trad,
    tradPorPaciente,
    tradModelos,
    pliegueCritico,
    contraste,
    epocasDefinitivo,
    nPlieguesDefinitivo,
  } = datos;

  const attn = dl.CNN_GRU_ATTN;
  const gru = dl.GRU;
  const sel = dl[arq];
  const fuenteConfigs = FUENTES_NB7HP.dlConfigs[arq];
  const fuenteSens = FUENTES_NB7HP.dlSensibilidad[arq];
  const dominante = recorridos[arq][0] ?? null;
  const dominanteAttn = recorridos.CNN_GRU_ATTN[0] ?? null;

  /* ── tabla: resumen de las dos busquedas ───────────────────────────────── */

  const filasResumenDL = (['CNN_GRU_ATTN', 'GRU'] as ArquitecturaHP[]).map((a) => ({
    arquitectura: ETIQUETA_ARQ[a],
    r2_base: dl[a].r2_base_media,
    std_base: dl[a].r2_base_std,
    r2_opt: dl[a].r2_opt_media,
    std_opt: dl[a].r2_opt_std,
    delta: dl[a].delta_medio,
    mejora_pct: dl[a].mejora_relativa_pct,
    mejorados: `${dl[a].pacientes_mejorados} / ${dl[a].n_pacientes}`,
    W: dl[a].wilcoxon_W,
    p: dl[a].wilcoxon_p,
    significativo: dl[a].significativo_005 ? 'sí' : 'no',
  }));

  /* ── tabla: configuracion en uso frente a la ganadora ──────────────────── */

  const clavesConfig = Array.from(
    new Set([...Object.keys(sel.config_base), ...Object.keys(sel.config_optimizada)]),
  );
  const filasConfig = clavesConfig.map((k) => ({
    hiperparametro: k,
    base: sel.config_base[k] ?? '—',
    optimizada: sel.config_optimizada[k] ?? '—',
    cambio: (sel.config_base[k] ?? '') === (sel.config_optimizada[k] ?? '') ? '=' : '≠',
  }));

  /* ── tabla y grafica: las configuraciones evaluadas ────────────────────── */

  const filasEvaluadas = configs[arq].map((f) => ({
    combinacion: f.combinacion,
    marca: f.esBase ? 'en uso' : '',
    r2_val_medio: f.r2ValMedio,
    r2_val_std: f.r2ValStd,
    minutos: f.minutos,
    ...f.hp,
  }));

  const ordenadas = [...configs[arq]].sort((a, b) => b.r2ValMedio - a.r2ValMedio);
  const r2Base = configBase[arq]?.r2ValMedio ?? null;

  const trazasEvaluadas = [
    {
      type: 'scatter',
      mode: 'markers',
      name: 'configuración probada',
      x: ordenadas.filter((f) => !f.esBase).map((f) => `#${f.combinacion}`),
      y: ordenadas.filter((f) => !f.esBase).map((f) => f.r2ValMedio),
      marker: { color: color.tenue, size: 8, symbol: 'circle' },
      hovertemplate: 'combinación %{x}<br>R² val = %{y:.5f}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: 'configuración en uso',
      x: ordenadas.filter((f) => f.esBase).map((f) => `#${f.combinacion}`),
      y: ordenadas.filter((f) => f.esBase).map((f) => f.r2ValMedio),
      marker: {
        color: color.acento,
        size: 13,
        symbol: 'diamond',
        line: { color: color.texto, width: 1 },
      },
      hovertemplate: 'combinación %{x} (en uso)<br>R² val = %{y:.5f}<extra></extra>',
    },
  ];

  /* ── grafica: recorrido de cada hiperparametro ─────────────────────────── */

  const trazasRecorrido = [
    {
      type: 'bar',
      orientation: 'h',
      x: [...recorridos[arq]].reverse().map((r) => r.rango),
      y: [...recorridos[arq]].reverse().map((r) => r.hiperparametro),
      marker: {
        color: [...recorridos[arq]]
          .reverse()
          .map((r) => (r.hiperparametro === dominante?.hiperparametro ? color.acento : color.borde)),
        line: { color: color.tenue, width: 1 },
      },
      hovertemplate: '%{y}<br>recorrido = %{x:.4f} puntos de R²<extra></extra>',
    },
  ];

  /* ── grafica: R2 por pliegue, las tres configuraciones ─────────────────── */

  const pacientes = attn.r2_por_paciente.pacientes;
  const trazasPliegues = [
    {
      type: 'scatter',
      mode: 'markers',
      name: `${ETIQUETA_ARQ.CNN_GRU_ATTN} en uso`,
      x: pacientes,
      y: attn.r2_por_paciente.base,
      marker: { color: color.tenue, size: 9, symbol: 'circle-open', line: { width: 2 } },
      hovertemplate: '%{x}<br>R² = %{y:.4f}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: `${ETIQUETA_ARQ.CNN_GRU_ATTN} optimizada`,
      x: pacientes,
      y: attn.r2_por_paciente.optimizada,
      marker: { color: color.acento, size: 10, symbol: 'diamond' },
      hovertemplate: '%{x}<br>R² = %{y:.4f}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: 'GRU optimizado',
      x: gru.r2_por_paciente.pacientes,
      y: gru.r2_por_paciente.optimizada,
      marker: { color: color.warn, size: 10, symbol: 'square' },
      hovertemplate: '%{x}<br>R² = %{y:.4f}<extra></extra>',
    },
  ];

  /* ── tablas de los modelos tradicionales ───────────────────────────────── */

  const filasTrad = tradModelos.map((m) => ({
    modelo: m,
    r2_base: trad.modelos[m].r2_base_media,
    std_base: trad.modelos[m].r2_base_std,
    r2_opt: trad.modelos[m].r2_opt_media,
    std_opt: trad.modelos[m].r2_opt_std,
    delta: trad.modelos[m].delta_medio,
    mejora_pct: trad.modelos[m].mejora_relativa_pct,
    mejorados: `${trad.modelos[m].pacientes_mejorados} / ${trad.modelos[m].n_pacientes}`,
    W: trad.modelos[m].wilcoxon_W,
    p: trad.modelos[m].wilcoxon_p,
    significativo: trad.modelos[m].significativo_005 ? 'sí' : 'no',
  }));

  const filasConsenso = tradModelos.flatMap((m) =>
    Object.entries(trad.modelos[m].config_consenso).map(([k, v]) => ({
      modelo: m,
      hiperparametro: k,
      valor: v,
    })),
  );

  const filasTradPaciente = tradPorPaciente.map((f) => ({
    modelo: f.modelo,
    paciente: f.paciente,
    r2_test_base: f.r2TestBase,
    r2_test_opt: f.r2TestOpt,
    delta_r2: f.deltaR2,
  }));

  const trazasTrad = tradModelos.map((m, i) => ({
    type: 'box',
    name: m,
    y: tradPorPaciente.filter((f) => f.modelo === m).map((f) => f.deltaR2),
    boxpoints: 'all',
    jitter: 0.4,
    pointpos: 0,
    marker: { color: [color.acento, color.ok, color.warn][i % 3], size: 6 },
    line: { color: [color.acento, color.ok, color.warn][i % 3] },
    hovertemplate: '%{x}<br>Δ R² = %{y:.4f}<extra></extra>',
  }));

  const configPlotly = { responsive: true, displayModeBar: false };
  const cifraRender = (n = 4) => (v: unknown) =>
    typeof v === 'number' ? dec(v, n) : <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const cifraSigno = (n = 4) => (v: unknown) =>
    typeof v === 'number' ? (
      <span style={{ color: v > 0 ? 'var(--ok)' : v < 0 ? 'var(--crit)' : 'var(--text)' }}>
        {conSigno(v, n)}
      </span>
    ) : (
      <span style={{ color: 'var(--text-muted)' }}>—</span>
    );

  /* ── render ─────────────────────────────────────────────────────────────── */

  return (
    <div>
      {/* ============================ el protocolo ============================ */}
      <Envoltorio>
        <Seccion
          numero="E7"
          titulo="Búsqueda sistemática de hiperparámetros"
          bajada={
            <>
              Búsqueda aleatoria de {attn.protocolo.n_iter} configuraciones por arquitectura,
              evaluada sobre los mismos {attn.protocolo.folds.length} pliegues dejando un paciente
              fuera, con {attn.protocolo.epochs} épocas por ajuste y semilla{' '}
              {attn.protocolo.semilla}. El conjunto de entrenamiento es {attn.protocolo.pool}.
            </>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '10px',
            }}
          >
            <Ficha
              titulo={`Protocolo de la búsqueda · ${FUENTES_NB7HP.dlResumen.split('/').pop()}`}
              datos={[
                ['Configuraciones', String(attn.protocolo.n_iter)],
                ['Pliegues', String(attn.protocolo.folds.length)],
                ['Épocas', String(attn.protocolo.epochs)],
                ['Semilla', String(attn.protocolo.semilla)],
                ['Entrenamiento', attn.protocolo.pool],
                ['Pacientes', attn.protocolo.folds.join(', ')],
              ]}
            />
            <Ficha
              titulo="Coste de cómputo · hp_dl_*.csv"
              datos={[
                [
                  ETIQUETA_ARQ.CNN_GRU_ATTN,
                  `${dec(minutosTotales.CNN_GRU_ATTN, 1)} min · ${configs.CNN_GRU_ATTN.length} config.`,
                ],
                [
                  ETIQUETA_ARQ.GRU,
                  `${dec(minutosTotales.GRU, 1)} min · ${configs.GRU.length} config.`,
                ],
                [
                  'Tradicionales',
                  `${dec(trad.tiempo_total_s / 60, 1)} min · ${FUENTES_NB7HP.tradResumen.split('/').pop()}`,
                ],
              ]}
            />
          </div>
        </Seccion>
      </Envoltorio>

      {/* ================= hallazgo 1: la configuración en uso resiste ======== */}
      <Envoltorio>
        <Seccion
          numero="1"
          titulo="La búsqueda no encontró ninguna configuración mejor que la que ya se usaba"
          bajada={
            <>
              Sobre los {attn.n_pacientes} pliegues de la búsqueda, la mejor configuración de las{' '}
              {configs.CNN_GRU_ATTN.length} evaluadas mejora el R² medio en{' '}
              {conSigno(attn.delta_medio)} puntos ({dec(attn.mejora_relativa_pct, 2)} % relativo) y
              gana en {attn.pacientes_mejorados} de {attn.n_pacientes} pacientes. La prueba de los
              rangos con signo de Wilcoxon da W = {dec(attn.wilcoxon_W, 1)} y p ={' '}
              {decP(attn.wilcoxon_p)}: no hay diferencia detectable.{' '}
              <strong style={{ color: 'var(--text)' }}>
                Leído al revés, que es como hay que leerlo: el resultado publicado no depende de una
                configuración afortunada.
              </strong>{' '}
              La configuración que el proyecto venía usando ya está en el llano de la superficie de
              búsqueda, y moverse por ese llano no cambia nada.
            </>
          }
        >
          <MetricGrid minimo={178}>
            <MetricStat
              densa
              etiqueta="R² configuración en uso"
              valor={dec(attn.r2_base_media)}
              dispersion={dec(attn.r2_base_std)}
              n={attn.n_pacientes}
              fase="E7"
              fuente={FUENTES_NB7HP.dlResumen}
            />
            <MetricStat
              densa
              etiqueta="R² mejor de la búsqueda"
              valor={dec(attn.r2_opt_media)}
              dispersion={dec(attn.r2_opt_std)}
              n={attn.n_pacientes}
              fase="E7"
              fuente={FUENTES_NB7HP.dlResumen}
            />
            <MetricStat
              densa
              etiqueta="Δ R² medio"
              valor={conSigno(attn.delta_medio)}
              referencia={`${dec(attn.mejora_relativa_pct, 2)} % relativo`}
              n={attn.n_pacientes}
              fase="E7"
              fuente={FUENTES_NB7HP.dlResumen}
            />
            <MetricStat
              densa
              etiqueta="Wilcoxon p"
              valor={decP(attn.wilcoxon_p)}
              estado={attn.significativo_005 ? 'bueno' : 'atencion'}
              referencia={`W = ${dec(attn.wilcoxon_W, 1)} · significativo: ${
                attn.significativo_005 ? 'sí' : 'no'
              }`}
              n={attn.n_pacientes}
              fase="E7"
              fuente={FUENTES_NB7HP.dlResumen}
            />
            <MetricStat
              densa
              etiqueta="Pacientes mejorados"
              valor={`${attn.pacientes_mejorados} / ${attn.n_pacientes}`}
              nota="La mitad mejora y la mitad empeora: el patrón del azar."
              n={attn.n_pacientes}
              fase="E7"
              fuente={FUENTES_NB7HP.dlResumen}
            />
            <MetricStat
              densa
              etiqueta="Hiperparámetro dominante"
              valor={dominanteAttn?.hiperparametro ?? '—'}
              referencia={`recorrido ${dec(dominanteAttn?.rango)} puntos de R²`}
              n={configs.CNN_GRU_ATTN.length}
              fase="E7"
              fuente={FUENTES_NB7HP.dlSensibilidad.CNN_GRU_ATTN}
            />
          </MetricGrid>

          <Subtitulo nota={`Una fila por arquitectura, con su propia búsqueda de ${attn.protocolo.n_iter} configuraciones.`}>
            Resultado de las dos búsquedas
          </Subtitulo>
          <DataTable
            fuente={FUENTES_NB7HP.dlResumen}
            caption={`${attn.n_pacientes} pliegues por arquitectura, los mismos en ambas`}
            porPagina={0}
            maxHeight="none"
            data={filasResumenDL as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'arquitectura', label: 'Arquitectura' },
              { key: 'r2_base', label: 'R² en uso', align: 'right', render: cifraRender(4) },
              { key: 'std_base', label: 'σ', align: 'right', render: cifraRender(4) },
              { key: 'r2_opt', label: 'R² optimizada', align: 'right', render: cifraRender(4) },
              { key: 'std_opt', label: 'σ', align: 'right', render: cifraRender(4) },
              { key: 'delta', label: 'Δ R²', align: 'right', render: cifraSigno(4) },
              { key: 'mejora_pct', label: 'Mejora %', align: 'right', render: cifraRender(2) },
              { key: 'mejorados', label: 'Mejorados', align: 'right' },
              { key: 'W', label: 'W', align: 'right', render: cifraRender(1) },
              {
                key: 'p',
                label: 'p',
                align: 'right',
                render: (v) => (typeof v === 'number' ? decP(v) : '—'),
              },
              { key: 'significativo', label: 'p < 0.05', align: 'center' },
            ]}
          />
        </Seccion>
      </Envoltorio>

      {/* ================= detalle de la búsqueda, por arquitectura ========== */}
      <Envoltorio>
        <Seccion
          numero="2"
          titulo="Detalle de la búsqueda"
          bajada="Las configuraciones evaluadas, la que el proyecto ya usaba y el efecto marginal de cada hiperparámetro. Elige la arquitectura."
        >
          <GrupoBotones>
            {(['CNN_GRU_ATTN', 'GRU'] as ArquitecturaHP[]).map((a) => (
              <Boton
                key={a}
                tamano="sm"
                variante="secundario"
                activo={arq === a}
                onClick={() => setArq(a)}
              >
                {ETIQUETA_ARQ[a]}
              </Boton>
            ))}
          </GrupoBotones>

          <Subtitulo
            nota={`Cada punto es una de las ${configs[arq].length} configuraciones, ordenadas por R² de validación. El rombo es la que el proyecto ya usaba.`}
          >
            R² de validación de cada configuración · {ETIQUETA_ARQ[arq]}
          </Subtitulo>
          <PlotlyChart
            data={trazasEvaluadas}
            layout={{
              height: 320,
              margin: { l: 56, r: 16, t: 8, b: 52 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: color.texto, size: 11 },
              legend: { orientation: 'h', y: -0.26, font: { color: color.tenue, size: 10 } },
              xaxis: { ...ejeComun, title: 'combinación', type: 'category' },
              yaxis: { ...ejeComun, title: 'R² validación' },
              shapes:
                r2Base === null
                  ? []
                  : [
                      {
                        type: 'line',
                        xref: 'paper',
                        x0: 0,
                        x1: 1,
                        yref: 'y',
                        y0: r2Base,
                        y1: r2Base,
                        line: { color: color.acento, width: 1, dash: 'dot' },
                      },
                    ],
            }}
            config={configPlotly}
            style={{ width: '100%' }}
            vacio="No hay configuraciones para esta arquitectura."
          />
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 'var(--fs-3xs)',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            n = {configs[arq].length} · Fuente: {fuenteConfigs}
          </div>

          <Subtitulo>Configuración en uso frente a la ganadora · {ETIQUETA_ARQ[arq]}</Subtitulo>
          <DataTable
            fuente={FUENTES_NB7HP.dlResumen}
            caption={`${clavesConfig.length} hiperparámetros; la ganadora es la combinación #${
              mejorConfig[arq]?.combinacion ?? '—'
            } con R² validación ${dec(mejorConfig[arq]?.r2ValMedio, 5)}`}
            porPagina={0}
            maxHeight="none"
            data={filasConfig as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'hiperparametro', label: 'Hiperparámetro' },
              { key: 'base', label: 'En uso', align: 'right' },
              { key: 'optimizada', label: 'Optimizada', align: 'right' },
              {
                key: 'cambio',
                label: 'Cambia',
                align: 'center',
                render: (v) => (
                  <span style={{ color: v === '≠' ? 'var(--warn)' : 'var(--text-muted)' }}>
                    {String(v)}
                  </span>
                ),
              },
            ]}
          />

          <Subtitulo>Las {configs[arq].length} configuraciones evaluadas · {ETIQUETA_ARQ[arq]}</Subtitulo>
          <DataTable
            fuente={fuenteConfigs}
            caption={`${attn.n_pacientes} pliegues por configuración · ${dec(minutosTotales[arq], 1)} min de cómputo en total`}
            porPagina={0}
            maxHeight="420px"
            data={filasEvaluadas as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'combinacion', label: '#', align: 'right' },
              {
                key: 'marca',
                label: '',
                align: 'center',
                render: (v) =>
                  v ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 'var(--fs-3xs)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                        borderRadius: '3px',
                        padding: '1px 4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {String(v)}
                    </span>
                  ) : (
                    ''
                  ),
              },
              { key: 'r2_val_medio', label: 'R² val', align: 'right', render: cifraRender(5) },
              { key: 'r2_val_std', label: 'σ', align: 'right', render: cifraRender(5) },
              { key: 'minutos', label: 'min', align: 'right', render: cifraRender(1) },
              ...hpColumnas[arq].map((k) => ({
                key: k,
                label: k.replace(/^hp_/, ''),
                align: 'right' as const,
              })),
            ]}
          />

          <Subtitulo
            nota="El recorrido es la diferencia entre el mejor y el peor valor medio de ese hiperparámetro; es cuánto puede mover el R² por sí solo."
          >
            Efecto marginal de cada hiperparámetro · {ETIQUETA_ARQ[arq]}
          </Subtitulo>
          <PlotlyChart
            data={trazasRecorrido}
            layout={{
              height: 40 + 30 * recorridos[arq].length,
              margin: { l: 96, r: 24, t: 8, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: color.texto, size: 11 },
              showlegend: false,
              xaxis: { ...ejeComun, title: 'recorrido en puntos de R²' },
              yaxis: { ...ejeComun, type: 'category' },
            }}
            config={configPlotly}
            style={{ width: '100%' }}
            vacio="No hay análisis de sensibilidad para esta arquitectura."
          />
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 'var(--fs-3xs)',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            n = {sensibilidad[arq].length} filas · Fuente: {fuenteSens}
          </div>

          <MetricGrid minimo={178}>
            <MetricStat
              densa
              etiqueta="Mayor recorrido"
              valor={dominante?.hiperparametro ?? '—'}
              referencia={`${dec(dominante?.rango)} puntos de R² · ${dominante?.valores ?? 0} valores probados`}
              n={sensibilidad[arq].length}
              fase="E7"
              fuente={fuenteSens}
            />
            <MetricStat
              densa
              etiqueta="Menor recorrido"
              valor={recorridos[arq][recorridos[arq].length - 1]?.hiperparametro ?? '—'}
              referencia={`${dec(recorridos[arq][recorridos[arq].length - 1]?.rango)} puntos de R²`}
              n={sensibilidad[arq].length}
              fase="E7"
              fuente={fuenteSens}
            />
          </MetricGrid>

          <Subtitulo>Sensibilidad, valor por valor · {ETIQUETA_ARQ[arq]}</Subtitulo>
          <DataTable
            fuente={fuenteSens}
            caption="n es el número de configuraciones que usaron ese valor; el recorrido se repite en todas las filas del mismo hiperparámetro"
            porPagina={0}
            maxHeight="380px"
            data={sensibilidad[arq] as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'hiperparametro', label: 'Hiperparámetro' },
              { key: 'valor', label: 'Valor', align: 'right' },
              { key: 'r2Medio', label: 'R² medio', align: 'right', render: cifraRender(5) },
              { key: 'n', label: 'n config.', align: 'right' },
              { key: 'rango', label: 'Recorrido', align: 'right', render: cifraRender(4) },
            ]}
          />
        </Seccion>
      </Envoltorio>

      {/* ================= hallazgo 2: el GRU optimizado ===================== */}
      <Envoltorio>
        <Seccion
          numero="3"
          titulo="El GRU optimizado queda por encima de la arquitectura final"
          bajada={
            <>
              Hay que declararlo sin adornos: sobre los mismos {gru.n_pacientes} pliegues, el GRU
              con su configuración optimizada alcanza R² = {dec(gru.r2_opt_media)} frente a{' '}
              {dec(attn.r2_opt_media)} de la arquitectura final optimizada, y su búsqueda sí mejoró
              respecto a su propia base ({conSigno(gru.delta_medio)}, p = {decP(gru.wilcoxon_p)},{' '}
              {gru.pacientes_mejorados} de {gru.n_pacientes} pacientes). Aun así, esta comparación no
              justifica cambiar el modelo final, por las tres razones que siguen.
            </>
          }
        >
          <MetricGrid minimo={178}>
            <MetricStat
              densa
              etiqueta="GRU optimizado"
              valor={dec(gru.r2_opt_media)}
              dispersion={dec(gru.r2_opt_std)}
              n={gru.n_pacientes}
              fase="E7"
              fuente={FUENTES_NB7HP.dlResumen}
            />
            <MetricStat
              densa
              etiqueta="CNN GRU ATTN optimizada"
              valor={dec(attn.r2_opt_media)}
              dispersion={dec(attn.r2_opt_std)}
              n={attn.n_pacientes}
              fase="E7"
              fuente={FUENTES_NB7HP.dlResumen}
            />
            {contraste && (
              <MetricStat
                densa
                etiqueta="Δ emparejado GRU − ATTN"
                valor={conSigno(contraste.deltaMedio)}
                referencia={`GRU gana en ${contraste.gruSuperaEn} de ${contraste.n} pliegues`}
                nota="Diferencia media de los pares, calculada sobre los vectores por paciente del archivo."
                n={contraste.n}
                fase="E7"
                fuente={FUENTES_NB7HP.dlResumen}
              />
            )}
            {contraste && pliegueCritico && (
              <MetricStat
                densa
                etiqueta={`Δ sin el pliegue ${pliegueCritico.paciente}`}
                valor={conSigno(contraste.deltaMedioSinCritico)}
                estado="atencion"
                referencia={`${pliegueCritico.paciente} aporta ${dec(contraste.aporteCriticoPct, 1)} % de la diferencia total`}
                n={contraste.n - 1}
                fase="E7"
                fuente={FUENTES_NB7HP.dlResumen}
              />
            )}
            {pliegueCritico && (
              <MetricStat
                densa
                etiqueta={`R² de ${pliegueCritico.paciente}, cohorte completa`}
                valor={dec(pliegueCritico.r2CohorteCompleta)}
                estado="critico"
                referencia={`${dec(pliegueCritico.pctEctopicos, 3)} % de latidos ectópicos`}
                nota={`Sobre ${pliegueCritico.nLatidos?.toLocaleString('es') ?? '—'} latidos${pliegueCritico.base ? `, base ${pliegueCritico.base}` : ''}. En la búsqueda, con la configuración en uso, su R² fue ${dec(pliegueCritico.r2EnBusqueda)}.`}
                n={nPlieguesDefinitivo}
                fase="E7"
                fuente={FUENTES_NB7HP.ectopicos}
              />
            )}
            <MetricStat
              densa
              etiqueta="Épocas: búsqueda vs definitivo"
              valor={`${attn.protocolo.epochs} vs ${epocasDefinitivo ?? '—'}`}
              unidad="épocas"
              referencia={`definitivo leído de ${FUENTES_NB7HP.lopo.split('/').pop()}`}
              n={nPlieguesDefinitivo}
              fase="E7"
              fuente={FUENTES_NB7HP.lopo}
            />
          </MetricGrid>

          <Subtitulo
            nota="Los tres conjuntos comparten pliegues, semilla y presupuesto de épocas. Fíjate en el pliegue que se descuelga por abajo: ahí se decide casi toda la diferencia."
          >
            R² por pliegue
          </Subtitulo>
          <PlotlyChart
            data={trazasPliegues}
            layout={{
              height: 340,
              margin: { l: 56, r: 16, t: 8, b: 60 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: color.texto, size: 11 },
              legend: { orientation: 'h', y: -0.22, font: { color: color.tenue, size: 10 } },
              xaxis: { ...ejeComun, title: 'paciente dejado fuera', type: 'category' },
              yaxis: { ...ejeComun, title: 'R²' },
              shapes: [
                {
                  type: 'line',
                  xref: 'paper',
                  x0: 0,
                  x1: 1,
                  yref: 'y',
                  y0: 0,
                  y1: 0,
                  line: { color: color.crit, width: 1, dash: 'dot' },
                },
              ],
            }}
            config={configPlotly}
            style={{ width: '100%' }}
            vacio="No hay R² por paciente en el resumen."
          />
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 'var(--fs-3xs)',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            n = {pacientes.length} pliegues · Fuente: {FUENTES_NB7HP.dlResumen}
          </div>

          <Subtitulo>Por qué esto no cambia el modelo final</Subtitulo>
          <ol style={{ margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
            {pliegueCritico && contraste && (
              <Salvedad
                numero={1}
                titulo={`El pliegue ${pliegueCritico.paciente} aporta la mayor parte de la diferencia`}
                fuente={`${FUENTES_NB7HP.dlResumen} · ${FUENTES_NB7HP.ectopicos}`}
              >
                La diferencia emparejada media es {conSigno(contraste.deltaMedio)}; excluyendo solo
                ese pliegue queda en {conSigno(contraste.deltaMedioSinCritico)}, es decir que{' '}
                {pliegueCritico.paciente} concentra {dec(contraste.aporteCriticoPct, 1)} % de la
                suma de diferencias. Y no es un paciente cualquiera: en la cohorte completa su R² es{' '}
                {dec(pliegueCritico.r2CohorteCompleta)} y el {dec(pliegueCritico.pctEctopicos, 3)} %
                de sus {pliegueCritico.nLatidos?.toLocaleString('es') ?? '—'} latidos son ectópicos
                {pliegueCritico.base ? ` (base ${pliegueCritico.base})` : ''}. Una ventaja que se
                sostiene sobre un único registro atípico no es una ventaja de arquitectura.
              </Salvedad>
            )}
            <Salvedad
              numero={2}
              titulo={`La búsqueda entrenó con ${attn.protocolo.epochs} épocas, el protocolo definitivo con ${epocasDefinitivo ?? '—'}`}
              fuente={`${FUENTES_NB7HP.dlResumen} · ${FUENTES_NB7HP.lopo}`}
            >
              Los {attn.protocolo.epochs} épocas de la búsqueda son un presupuesto recortado para
              poder evaluar {attn.protocolo.n_iter} configuraciones por arquitectura; el modelo
              final se entrena con {epocasDefinitivo ?? '—'} en los {nPlieguesDefinitivo} pliegues
              de la evaluación completa. Comparar arquitecturas con el presupuesto corto no predice
              cómo quedan con el largo.
            </Salvedad>
            <Salvedad
              numero={3}
              titulo="La configuración ganadora del GRU es la de tasa de aprendizaje más baja"
              fuente={FUENTES_NB7HP.dlConfigs.GRU}
            >
              La ganadora del GRU es la combinación #{mejorConfig.GRU?.combinacion ?? '—'}, con lr ={' '}
              {mejorConfig.GRU?.hp.hp_lr ?? '—'}
              {lrMinima.GRU !== null && mejorConfig.GRU
                ? Number(mejorConfig.GRU.hp.hp_lr) === lrMinima.GRU
                  ? `, que es la más baja de la rejilla (mínimo ${lrMinima.GRU})`
                  : `, frente a un mínimo de rejilla de ${lrMinima.GRU}`
                : ''}
              . Una tasa baja es precisamente la que aún no ha terminado de converger a las{' '}
              {attn.protocolo.epochs} épocas de la búsqueda: es la configuración que más se
              beneficiaría de entrenar más tiempo, y también la que peor generaliza el resultado de
              una comparación hecha con el presupuesto corto. El análisis de sensibilidad lo
              confirma: para el GRU, lr es el hiperparámetro de mayor recorrido (
              {dec(recorridos.GRU.find((r) => r.hiperparametro === 'lr')?.rango)} puntos de R²,{' '}
              {FUENTES_NB7HP.dlSensibilidad.GRU.split('/').pop()}).
            </Salvedad>
          </ol>

          <div style={{ marginTop: '12px' }}>
            <Aviso tono="neutro" titulo="Cifra no disponible">
              Falta la prueba de hipótesis emparejada <em>entre</em> arquitecturas (CNN GRU ATTN
              optimizada frente a GRU optimizado): no está en ningún archivo de resultados, así que
              esta vista no la muestra. Lo que se presenta arriba son las diferencias emparejadas y
              el conteo de pliegues, calculados sobre los vectores por paciente de{' '}
              {FUENTES_NB7HP.dlResumen}. Los valores p que sí aparecen —uno por arquitectura, base
              frente a optimizada— vienen del propio archivo.
            </Aviso>
          </div>
        </Seccion>
      </Envoltorio>

      {/* ================= hallazgo 3: los modelos tradicionales ============= */}
      <Envoltorio>
        <Seccion
          numero="4"
          titulo="Búsqueda sobre los modelos tradicionales"
          bajada={`La misma búsqueda aleatoria de ${trad.protocolo.n_iter} configuraciones, aplicada a ${tradModelos.join(', ')}.`}
        >
          <Aviso tono="atencion" titulo="Protocolo distinto · valores absolutos no comparables">
            Esta búsqueda no usa el protocolo de la evaluación final. Emplea el filtro{' '}
            <strong>{trad.protocolo.filtro}</strong>, lookback{' '}
            <strong>{trad.protocolo.lookback}</strong>, validación{' '}
            <strong>{trad.protocolo.cv}</strong> y {trad.protocolo.n_pacientes} pacientes de
            MIT-BIH ({trad.protocolo.pacientes.join(', ')}), con la formulación{' '}
            {trad.protocolo.formulacion}.{' '}
            <strong style={{ color: 'var(--text)' }}>
              Sus R² absolutos no son comparables con los del experimento 6
            </strong>{' '}
            —ni con los de la sección anterior—: solo los deltas emparejados, base frente a
            optimizada dentro de este mismo protocolo, son interpretables.
          </Aviso>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <Ficha
              titulo={`Protocolo · ${FUENTES_NB7HP.tradResumen.split('/').pop()}`}
              datos={[
                ['Filtro', trad.protocolo.filtro],
                ['Lookback', String(trad.protocolo.lookback)],
                ['Validación', trad.protocolo.cv],
                ['Configuraciones', String(trad.protocolo.n_iter)],
                ['Semilla', String(trad.protocolo.semilla)],
                ['Formulación', trad.protocolo.formulacion],
                ['Pacientes', `${trad.protocolo.n_pacientes} · ${trad.protocolo.pacientes.join(', ')}`],
              ]}
            />
            <Ficha
              titulo="Deltas emparejados, lo único comparable"
              datos={tradModelos.map((m) => [
                m,
                `${conSigno(trad.modelos[m].delta_medio)} · p = ${decP(
                  trad.modelos[m].wilcoxon_p,
                )} · ${trad.modelos[m].pacientes_mejorados}/${trad.modelos[m].n_pacientes}`,
              ])}
            />
          </div>

          <MetricGrid minimo={178}>
            {tradModelos.map((m) => (
              <MetricStat
                key={m}
                densa
                etiqueta={`${m} · Δ R² medio`}
                valor={conSigno(trad.modelos[m].delta_medio)}
                estado={
                  trad.modelos[m].significativo_005
                    ? trad.modelos[m].delta_medio > 0
                      ? 'bueno'
                      : 'critico'
                    : 'atencion'
                }
                referencia={`p = ${decP(trad.modelos[m].wilcoxon_p)} · ${dec(
                  trad.modelos[m].mejora_relativa_pct,
                  2,
                )} % relativo`}
                nota={`${trad.modelos[m].pacientes_mejorados} de ${trad.modelos[m].n_pacientes} pacientes mejoran. Delta dentro del protocolo ${trad.protocolo.filtro}, no comparable con el experimento 6.`}
                n={trad.modelos[m].n_pacientes}
                fase="E7"
                fuente={FUENTES_NB7HP.tradResumen}
              />
            ))}
          </MetricGrid>

          <Subtitulo nota={`R² de test dentro del protocolo ${trad.protocolo.filtro} / ${trad.protocolo.cv}. No comparar con el experimento 6.`}>
            Resumen por modelo
          </Subtitulo>
          <DataTable
            fuente={FUENTES_NB7HP.tradResumen}
            caption={`${trad.protocolo.n_pacientes} pacientes de MIT-BIH, ${trad.protocolo.cv}`}
            porPagina={0}
            maxHeight="none"
            data={filasTrad as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'modelo', label: 'Modelo' },
              { key: 'r2_base', label: 'R² base', align: 'right', render: cifraRender(4) },
              { key: 'std_base', label: 'σ', align: 'right', render: cifraRender(4) },
              { key: 'r2_opt', label: 'R² optimizado', align: 'right', render: cifraRender(4) },
              { key: 'std_opt', label: 'σ', align: 'right', render: cifraRender(4) },
              { key: 'delta', label: 'Δ R²', align: 'right', render: cifraSigno(4) },
              { key: 'mejora_pct', label: 'Mejora %', align: 'right', render: cifraRender(2) },
              { key: 'mejorados', label: 'Mejorados', align: 'right' },
              { key: 'W', label: 'W', align: 'right', render: cifraRender(1) },
              {
                key: 'p',
                label: 'p',
                align: 'right',
                render: (v) => (typeof v === 'number' ? decP(v) : '—'),
              },
              { key: 'significativo', label: 'p < 0.05', align: 'center' },
            ]}
          />

          <Subtitulo nota="Cada punto es un paciente; la caja resume los diez deltas emparejados del modelo.">
            Distribución del delta por paciente
          </Subtitulo>
          <PlotlyChart
            data={trazasTrad}
            layout={{
              height: 320,
              margin: { l: 60, r: 16, t: 8, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: color.texto, size: 11 },
              showlegend: false,
              xaxis: { ...ejeComun, title: 'modelo' },
              yaxis: { ...ejeComun, title: 'Δ R² (optimizado − base)' },
              shapes: [
                {
                  type: 'line',
                  xref: 'paper',
                  x0: 0,
                  x1: 1,
                  yref: 'y',
                  y0: 0,
                  y1: 0,
                  line: { color: color.tenue, width: 1, dash: 'dot' },
                },
              ],
            }}
            config={configPlotly}
            style={{ width: '100%' }}
            vacio="No hay detalle por paciente."
          />
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 'var(--fs-3xs)',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            n = {tradPorPaciente.length} filas · Fuente: {FUENTES_NB7HP.tradPorPaciente}
          </div>

          <Subtitulo>Configuración de consenso por modelo</Subtitulo>
          <DataTable
            fuente={FUENTES_NB7HP.tradResumen}
            caption="Valor más repetido entre los pacientes de la búsqueda"
            porPagina={0}
            maxHeight="320px"
            data={filasConsenso as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'modelo', label: 'Modelo' },
              { key: 'hiperparametro', label: 'Hiperparámetro' },
              { key: 'valor', label: 'Valor', align: 'right' },
            ]}
          />

          <Subtitulo>Detalle por paciente</Subtitulo>
          <DataTable
            fuente={FUENTES_NB7HP.tradPorPaciente}
            caption={`${tradModelos.length} modelos × ${trad.protocolo.n_pacientes} pacientes`}
            porPagina={0}
            maxHeight="420px"
            data={filasTradPaciente as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'modelo', label: 'Modelo' },
              { key: 'paciente', label: 'Paciente' },
              { key: 'r2_test_base', label: 'R² base', align: 'right', render: cifraRender(4) },
              { key: 'r2_test_opt', label: 'R² optimizado', align: 'right', render: cifraRender(4) },
              { key: 'delta_r2', label: 'Δ R²', align: 'right', render: cifraSigno(4) },
            ]}
          />
        </Seccion>
      </Envoltorio>
    </div>
  );
}

export default NB7HPContent;
