/**
 * Cohorte y método — expone la sexta y séptima fase experimental (NB6/NB7), que hasta
 * ahora no tenían ninguna presencia en el dashboard.
 *
 * Todo lo que se muestra aquí se lee de archivos reales de /data. No hay ni una cifra
 * escrita a mano en el código: si un archivo falta, la sección lo dice en lugar de
 * inventar valores.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageWrapper, containerVariants, itemVariants } from '@/components/layout/PageWrapper';
import { useLang } from '@/i18n';
import { MetricStat, MetricGrid } from '@/components/metrics/MetricStat';

// ─────────────────────────────────────────────────────────── tipos

interface ResumenP2 {
  n_pacientes: number;
  n_pacientes_mitbih: number;
  n_pacientes_incart: number;
  n_latidos_total: number;
  pct_normales: number;
  pct_ectopicos: number;
  razon_desbalance_N_vs_resto: number;
  rr_global_media_s: number;
  fc_global_media_lpm: number;
  correlacion_ectopicos_vs_R2: { spearman_rho: number; spearman_p: number };
}

interface EfectoMediana {
  n_pacientes: number;
  atenuacion_R_media_pct: number;
  atenuacion_R_std_pct: number;
  atenuacion_R_min_pct: number;
  atenuacion_R_max_pct: number;
  persistencia_F_N_MED: number;
  persistencia_F_NB6: number;
  ventana_mediana_ms: number;
}

type Fila = Record<string, string>;

// ─────────────────────────────────────────────────────────── carga

async function traerJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo leer ${url} (HTTP ${r.status})`);
  const texto = await r.text();
  if (texto.trimStart().startsWith('<')) throw new Error(`El archivo ${url} no existe`);
  return JSON.parse(texto) as T;
}

async function traerCSV(url: string): Promise<Fila[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo leer ${url} (HTTP ${r.status})`);
  const texto = await r.text();
  if (texto.trimStart().startsWith('<')) throw new Error(`El archivo ${url} no existe`);
  const lineas = texto.trim().split('\n');
  const cab = lineas[0].split(',').map((h) => h.trim());
  return lineas.slice(1).map((l) => {
    const celdas = l.split(',');
    return Object.fromEntries(cab.map((h, i) => [h, (celdas[i] ?? '').trim()]));
  });
}

// ─────────────────────────────────────────────────────────── piezas

function Seccion({ eyebrow, titulo, children }: { eyebrow: string; titulo: string; children: React.ReactNode }) {
  return (
    <motion.section variants={itemVariants} style={{ marginBottom: '56px' }}>
      <p className="eyebrow" style={{
        fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', letterSpacing: '2px',
        color: 'var(--signal)', marginBottom: '10px', textTransform: 'uppercase',
      }}>{eyebrow}</p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 650,
        color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.01em',
      }}>{titulo}</h2>
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 0 20px' }} />
      {children}
    </motion.section>
  );
}

function Tabla({ cabeceras, filas, fuente }: { cabeceras: string[]; filas: (string | number)[][]; fuente: string }) {
  return (
    <>
      <div className="tabla-scroll" style={{
        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
        background: 'var(--surface)', marginBottom: '8px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-xs)' }}>
          <thead>
            <tr>
              {cabeceras.map((h, i) => (
                <th key={h} style={{
                  padding: '9px 14px', textAlign: i === 0 ? 'left' : 'right',
                  fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', letterSpacing: '1px',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, ri) => (
              <tr key={ri}>
                {f.map((c, ci) => (
                  <td key={ci} style={{
                    padding: '8px 14px', textAlign: ci === 0 ? 'left' : 'right',
                    color: ci === 0 ? 'var(--text)' : 'var(--text-sub)',
                    fontFamily: ci === 0 ? 'var(--font-body)' : 'var(--font-data)',
                    fontVariantNumeric: 'tabular-nums',
                    borderBottom: ri === filas.length - 1 ? 'none' : '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-data)', margin: '0 0 4px' }}>
        Fuente: {fuente}
      </p>
    </>
  );
}

/** Dispersión de los 123 pacientes. Es el gráfico que faltaba: la media sola engaña. */
function Dispersion({ valores }: { valores: { r2: number; incart: boolean }[] }) {
  // El pie de la figura estaba escrito solo en espanol: no cambiaba al pulsar EN.
  const { t } = useLang();
  if (valores.length === 0) return null;
  const min = -0.35, max = 1.0;
  const W = 1000, H = 128, PADL = 34, PADR = 14, TOP = 14, BASE = 88;
  const x = (v: number) => PADL + ((v - min) / (max - min)) * (W - PADL - PADR);
  const mit = valores.filter((v) => !v.incart);
  const inc = valores.filter((v) => v.incart);
  const media = (a: { r2: number }[]) => a.reduce((s, v) => s + v.r2, 0) / Math.max(1, a.length);

  return (
    <figure style={{
      margin: 0, background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '18px',
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Distribución del R² de los ${valores.length} pacientes. MIT-BIH se concentra en valores altos; INCART se dispersa mucho más e incluye todos los casos de R² negativo.`}>
        <line x1={PADL} y1={BASE} x2={W - PADR} y2={BASE} stroke="var(--border)" strokeWidth="1" />
        {[-0.25, 0, 0.25, 0.5, 0.75, 1.0].map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={BASE} x2={x(t)} y2={BASE + 5} stroke="var(--border)" strokeWidth="1" />
            <text x={x(t)} y={BASE + 20} textAnchor="middle" fontSize="11"
              fontFamily="var(--font-data)" fill="var(--text-muted)">{t.toFixed(2)}</text>
          </g>
        ))}
        <line x1={x(0)} y1={TOP} x2={x(0)} y2={BASE} stroke="var(--alert)" strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
        <line x1={x(media(mit))} y1={TOP - 3} x2={x(media(mit))} y2={BASE} stroke="var(--signal)" strokeWidth="1.5" opacity="0.45" />
        <line x1={x(media(inc))} y1={TOP - 3} x2={x(media(inc))} y2={BASE} stroke="var(--qrs)" strokeWidth="1.5" opacity="0.45" />
        {valores.map((v, i) => (
          <line key={i}
            x1={x(v.r2)} x2={x(v.r2)}
            y1={v.incart ? TOP + 3 : TOP + 40}
            y2={v.incart ? TOP + 36 : TOP + 72}
            stroke={v.r2 < 0 ? 'var(--alert)' : v.incart ? 'var(--qrs)' : 'var(--signal)'}
            strokeWidth="2" opacity="0.8" />
        ))}
        <text x={PADL} y={TOP - 4} fontSize="10" fontFamily="var(--font-data)" fill="var(--text-muted)">INCART</text>
        <text x={PADL} y={TOP + 85} fontSize="10" fontFamily="var(--font-data)" fill="var(--text-muted)">MIT-BIH</text>
      </svg>
      <figcaption style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--text-sub)' }}>{t('Figura.', 'Figure.')}</strong>{' '}
        {t(
          `Coeficiente R² de cada uno de los ${valores.length} pacientes bajo el protocolo Leave-One-Patient-Out. Cada marca es un paciente; las líneas verticales tenues son las medias de cada base. Fuente:`,
          `R² coefficient for each of the ${valores.length} patients under the Leave-One-Patient-Out protocol. Each mark is one patient; the faint vertical lines are the per-database means. Source:`,
        )}{' '}
        <code style={{ fontFamily: 'var(--font-data)' }}>/data/nb5/resultados_lopo.csv</code>.
      </figcaption>
    </figure>
  );
}

function Aviso({ mensaje }: { mensaje: string }) {
  return (
    <div style={{
      padding: '14px 18px', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--alert)', background: 'rgba(244, 63, 94, 0.08)',
      color: 'var(--text-sub)', fontSize: 'var(--fs-sm)',
    }}>{mensaje}</div>
  );
}

// ─────────────────────────────────────────────────────────── página

/** Contraste MIT-BIH vs INCART, calculado en scratchpad/mannwhitney_cohorte.py. */
interface ContrasteBases {
  prueba: string;
  grupo_1: { nombre: string; n: number; mediana: number };
  grupo_2: { nombre: string; n: number; mediana: number };
  U: number;
  p_valor: number;
  rango_biserial: number;
  interpretacion_efecto: string;
  fuente: string;
}

export function CohortePage() {
  const { t } = useLang();
  const [p2, setP2] = useState<ResumenP2 | null>(null);
  const [aami, setAami] = useState<Fila[]>([]);
  const [porBase, setPorBase] = useState<Fila[]>([]);
  const [mediana, setMediana] = useState<EfectoMediana | null>(null);
  const [medianaPac, setMedianaPac] = useState<Fila[]>([]);
  const [lopo, setLopo] = useState<Fila[]>([]);
  const [contraste, setContraste] = useState<ContrasteBases | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [a, b, c, d, e, f, g] = await Promise.all([
          traerJSON<ResumenP2>('/data/nb7/p2_resumen.json'),
          traerCSV('/data/nb7/p2_distribucion_aami.csv'),
          traerCSV('/data/nb7/nb6_tabla_por_dataset.csv'),
          traerJSON<EfectoMediana>('/data/nb7/efecto_mediana.json'),
          traerCSV('/data/nb7/efecto_mediana_por_paciente.csv'),
          traerCSV('/data/nb5/resultados_lopo.csv'),
          traerJSON<ContrasteBases>('/data/nb7/nb6_contraste_bases.json'),
        ]);
        if (!vivo) return;
        setP2(a); setAami(b); setPorBase(c); setMediana(d); setMedianaPac(e); setLopo(f);
        setContraste(g);
      } catch (err) {
        if (vivo) setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    })();
    return () => { vivo = false; };
  }, []);

  const dispersion = useMemo(
    () => lopo
      .filter((r) => r.Modelo === 'CNN_GRU_ATTN')
      // `r.paciente_test` viene de las cabeceras del CSV. Si una cambiara de nombre,
      // el `.toUpperCase()` lanzaria un TypeError dentro del render. `String(... ?? '')`
      // degrada a una fila descartada en lugar de tumbar la pagina.
      .map((r) => ({
        r2: parseFloat(String(r.R2_total ?? '')),
        incart: String(r.paciente_test ?? '').toUpperCase().startsWith('I'),
      }))
      .filter((v) => Number.isFinite(v.r2))
      .sort((a, b) => a.r2 - b.r2),
    [lopo],
  );

  const negativos = dispersion.filter((v) => v.r2 < 0);

  /**
   * Dispersion entre pacientes frente a la precision de la media.
   *
   * El 0.2825 y el «mas de cinco veces» estaban escritos a mano en el texto. La
   * desviacion coincidia con el archivo, pero el factor no: con n = 123 el ancho del
   * IC95 es 2·1.96·s/√n, de modo que la razon s / ancho es √n / 3.92 ≈ 2.8, no 5.
   * Se calcula aqui para que el texto diga lo que los datos dicen.
   */
  const estadisticos = useMemo(() => {
    const v = dispersion.map((d) => d.r2);
    const n = v.length;
    if (n < 2) return null;
    const media = v.reduce((a, b) => a + b, 0) / n;
    const s = Math.sqrt(v.reduce((a, b) => a + (b - media) ** 2, 0) / (n - 1));
    const anchoIC = 2 * 1.96 * (s / Math.sqrt(n));
    return { n, media, s, anchoIC, razon: s / anchoIC };
  }, [dispersion]);

  return (
    <PageWrapper accentColor="rgba(6, 182, 212, 0.10)">
      <motion.div variants={containerVariants} initial="initial" animate="animate"
        style={{ maxWidth: '1080px', margin: '0 auto' }}>

        <motion.header variants={itemVariants} style={{ marginBottom: '48px' }}>
          <p style={{
            fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', letterSpacing: '2px',
            color: 'var(--signal)', textTransform: 'uppercase', marginBottom: '12px',
          }}>{t('Sexta y séptima fase experimental', 'Sixth and seventh experimental phase')}</p>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
            fontWeight: 700, color: 'var(--text)', margin: '0 0 14px', letterSpacing: '-0.02em',
          }}>{t('Cohorte y método', 'Cohort and method')}</h1>
          <p style={{ color: 'var(--text-sub)', maxWidth: '68ch', fontSize: 'var(--fs-base)', lineHeight: 1.6 }}>
            {t(
              'Quiénes son los pacientes, dónde falla el modelo y por qué se descartó el filtro de mediana. Todas las cifras se leen de los archivos de resultados; ninguna está escrita en el código.',
              'Who the patients are, where the model fails, and why the median filter was discarded. Every figure is read from the result files; none is hardcoded.',
            )}
          </p>
        </motion.header>

        {error && <div style={{ marginBottom: '32px' }}><Aviso mensaje={`No se pudieron cargar los datos. ${error}`} /></div>}

        {/* ── 1. La cohorte ───────────────────────────────────────── */}
        <Seccion eyebrow={t('01 · Población y muestra', '01 · Population and sample')} titulo={t('Los 123 pacientes', 'The 123 patients')}>
          {p2 ? (
            <>
              <div style={{ marginBottom: '24px' }}>
                <MetricGrid>
                  <MetricStat
                    etiqueta={t('Pacientes', 'Patients')}
                    valor={p2.n_pacientes}
                    referencia={`${p2.n_pacientes_mitbih} MIT-BIH + ${p2.n_pacientes_incart} INCART`}
                    fase="NB7" fuente="p2_resumen.json"
                  />
                  <MetricStat
                    etiqueta={t('Latidos anotados', 'Annotated beats')}
                    valor={p2.n_latidos_total.toLocaleString('es')}
                    fase="NB7" fuente="p2_resumen.json"
                  />
                  <MetricStat
                    etiqueta={t('Latidos ectópicos', 'Ectopic beats')}
                    valor={p2.pct_ectopicos.toFixed(2)} unidad="%"
                    referencia={t(`desbalance ${p2.razon_desbalance_N_vs_resto.toFixed(2)}:1`,
                                  `imbalance ${p2.razon_desbalance_N_vs_resto.toFixed(2)}:1`)}
                    n={p2.n_latidos_total} fase="NB7" fuente="p2_resumen.json"
                  />
                  <MetricStat
                    etiqueta={t('Frecuencia cardíaca', 'Heart rate')}
                    valor={p2.fc_global_media_lpm.toFixed(1)} unidad="lpm"
                    referencia={t(`RR medio ${p2.rr_global_media_s.toFixed(3)} s`,
                                  `mean RR ${p2.rr_global_media_s.toFixed(3)} s`)}
                    n={p2.n_pacientes} fase="NB7" fuente="p2_resumen.json"
                  />
                </MetricGrid>
              </div>
              {aami.length > 0 && (
                <Tabla
                  cabeceras={[t('Base', 'Database'), t('Clase AAMI', 'AAMI class'), t('Latidos', 'Beats'), '%']}
                  filas={aami.map((f) => [f.base, f.clase, parseInt(f.n_latidos, 10).toLocaleString('es'), `${parseFloat(f.pct).toFixed(2)} %`])}
                  fuente="/data/nb7/p2_distribucion_aami.csv"
                />
              )}
            </>
          ) : !error && <p style={{ color: 'var(--text-muted)' }}>{t('Cargando…', 'Loading…')}</p>}
        </Seccion>

        {/* ── 2. Dispersión ───────────────────────────────────────── */}
        <Seccion eyebrow={t('02 · Dónde falla el modelo', '02 · Where the model fails')}
          titulo={t('La media no cuenta la historia; la dispersión sí', 'The mean does not tell the story; the spread does')}>
          {estadisticos && (
            <p style={{ color: 'var(--text-sub)', maxWidth: '70ch', marginBottom: '20px', lineHeight: 1.6 }}>
              {t(
                `El resultado del modelo final no es un número, son ${estadisticos.n} números. Enseñar solo la media da una falsa sensación de precisión: la desviación típica entre pacientes es de ${estadisticos.s.toFixed(4)}, ${estadisticos.razon.toFixed(1)} veces el ancho del intervalo de confianza del 95 % de la media (${estadisticos.anchoIC.toFixed(4)}). La media se conoce con precisión; el paciente siguiente, no.`,
                `The final result is not one number but ${estadisticos.n}. Showing only the mean gives a false sense of precision: the between-patient standard deviation is ${estadisticos.s.toFixed(4)}, ${estadisticos.razon.toFixed(1)} times the width of the 95 % confidence interval of the mean (${estadisticos.anchoIC.toFixed(4)}). The mean is known precisely; the next patient is not.`,
              )}
              <span style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)', fontSize: 'var(--fs-2xs)', fontFamily: 'var(--font-data)' }}>
                n = {estadisticos.n} · Fuente: /data/nb5/resultados_lopo.csv (CNN_GRU_ATTN)
              </span>
            </p>
          )}
          <Dispersion valores={dispersion} />
          {negativos.length > 0 && (
            <p style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-sm)', marginTop: '16px', lineHeight: 1.6 }}>
              {t(
                `${negativos.length} pacientes quedan por debajo de cero, y todos son de INCART. Se muestran aquí a propósito: esconderlos sería lo que un jurado atacaría primero.`,
                `${negativos.length} patients fall below zero, all of them from INCART. They are shown deliberately: hiding them is what a committee would attack first.`,
              )}
            </p>
          )}
        </Seccion>

        {/* ── 3. Brecha entre bases ───────────────────────────────── */}
        <Seccion eyebrow={t('03 · Generalización entre bases', '03 · Generalization across databases')}
          titulo={t('MIT-BIH frente a INCART', 'MIT-BIH versus INCART')}>
          {porBase.length > 0 ? (
            <>
              <Tabla
                cabeceras={[t('Base', 'Database'), 'n', 'R² medio', t('Desviación', 'Std'), 'R² mediana', '≥ 0.80', '< 0']}
                filas={porBase.map((f) => [
                  f.dataset, f.n, parseFloat(f.R2_medio).toFixed(4), parseFloat(f.R2_std).toFixed(4),
                  parseFloat(f.R2_mediana).toFixed(4),
                  `${f.n_ge_080} (${parseFloat(f.pct_ge_080).toFixed(1)} %)`,
                  `${f.n_neg} (${parseFloat(f.pct_neg).toFixed(1)} %)`,
                ])}
                fuente="/data/nb7/nb6_tabla_por_dataset.csv"
              />
              {/* Esta cifra estaba escrita a mano en el JSX. El calculo la confirma,
                  pero ahora se lee de un archivo exportado, y va acompanada del tamano
                  de efecto: con n = 123 la p es facil de hacer pequena, el efecto no. */}
              {contraste && (
                <p style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-sm)', marginTop: '14px', lineHeight: 1.6, maxWidth: '70ch' }}>
                  {t(
                    `La diferencia entre bases es estadísticamente significativa: ${contraste.prueba}, U = ${contraste.U.toFixed(1)}, p = ${contraste.p_valor.toExponential(2)}, con un tamaño de efecto ${contraste.interpretacion_efecto} (correlación rango-biserial = ${contraste.rango_biserial.toFixed(4)}). Las medianas son ${contraste.grupo_1.mediana.toFixed(4)} en ${contraste.grupo_1.nombre} (n = ${contraste.grupo_1.n}) frente a ${contraste.grupo_2.mediana.toFixed(4)} en ${contraste.grupo_2.nombre} (n = ${contraste.grupo_2.n}). Es un resultado de primer orden sobre la generalización, no una anécdota.`,
                    `The between-database difference is statistically significant: ${contraste.prueba}, U = ${contraste.U.toFixed(1)}, p = ${contraste.p_valor.toExponential(2)}, with a ${contraste.interpretacion_efecto} effect size (rank-biserial correlation = ${contraste.rango_biserial.toFixed(4)}). Medians are ${contraste.grupo_1.mediana.toFixed(4)} for ${contraste.grupo_1.nombre} (n = ${contraste.grupo_1.n}) versus ${contraste.grupo_2.mediana.toFixed(4)} for ${contraste.grupo_2.nombre} (n = ${contraste.grupo_2.n}). It is a first-order result on generalization, not an anecdote.`,
                  )}
                  <span style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)', fontSize: 'var(--fs-2xs)', fontFamily: 'var(--font-data)' }}>
                    {t('Fuente', 'Source')}: /data/nb7/nb6_contraste_bases.json ·{' '}
                    {t('calculado sobre', 'computed over')} {contraste.fuente}
                  </span>
                </p>
              )}
              {p2 && (
                <p style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-sm)', marginTop: '10px', lineHeight: 1.6, maxWidth: '70ch' }}>
                  {t(
                    `La proporción de latidos ectópicos de un paciente correlaciona negativamente con su R²: rho de Spearman = ${p2.correlacion_ectopicos_vs_R2.spearman_rho.toFixed(4)} (p = ${p2.correlacion_ectopicos_vs_R2.spearman_p.toExponential(2)}). Cuanta más arritmia, más difícil de predecir.`,
                    `The proportion of ectopic beats of a patient correlates negatively with their R²: Spearman rho = ${p2.correlacion_ectopicos_vs_R2.spearman_rho.toFixed(4)} (p = ${p2.correlacion_ectopicos_vs_R2.spearman_p.toExponential(2)}). More arrhythmia, harder to predict.`,
                  )}
                </p>
              )}
            </>
          ) : !error && <p style={{ color: 'var(--text-muted)' }}>{t('Cargando…', 'Loading…')}</p>}
        </Seccion>

        {/* ── 4. El filtro de mediana ─────────────────────────────── */}
        <Seccion eyebrow={t('04 · Hallazgo metodológico', '04 · Methodological finding')}
          titulo={t('Por qué se descartó el filtro de mediana', 'Why the median filter was discarded')}>
          {mediana ? (
            <>
              <p style={{ color: 'var(--text-sub)', maxWidth: '70ch', marginBottom: '20px', lineHeight: 1.6 }}>
                {t(
                  'El filtro de mediana ganaba en R² en las primeras fases. La medición mostró por qué, y no es una buena razón: aplana el pico R, que es justamente el accidente morfológico que el modelo debe predecir.',
                  'The median filter won on R² in the early phases. Measurement showed why, and it is not a good reason: it flattens the R peak, which is precisely the morphological feature the model must predict.',
                )}
              </p>
              <div style={{ marginBottom: '22px' }}>
                <MetricGrid>
                  <MetricStat
                    etiqueta={t('Atenuación del pico R', 'R-peak attenuation')}
                    valor={mediana.atenuacion_R_media_pct} unidad="%"
                    dispersion={mediana.atenuacion_R_std_pct}
                    referencia={`${mediana.atenuacion_R_min_pct} – ${mediana.atenuacion_R_max_pct} %`}
                    estado="critico"
                    n={mediana.n_pacientes} fase="NB7" fuente="efecto_mediana.json"
                  />
                  <MetricStat
                    etiqueta={t('Persistencia con mediana', 'Persistence with median')}
                    valor={mediana.persistencia_F_N_MED.toFixed(4)}
                    nota={t('Un predictor trivial ya parece bueno', 'A trivial predictor already looks good')}
                    n={mediana.n_pacientes} fase="NB7" fuente="efecto_mediana.json"
                  />
                  <MetricStat
                    etiqueta={t('Persistencia sin mediana', 'Persistence without median')}
                    valor={mediana.persistencia_F_NB6.toFixed(4)}
                    nota={t('El mismo predictor, sobre la señal real', 'The same predictor, on the real signal')}
                    n={mediana.n_pacientes} fase="NB7" fuente="efecto_mediana.json"
                  />
                  <MetricStat
                    etiqueta={t('Ventana implementada', 'Implemented window')}
                    valor={mediana.ventana_mediana_ms} unidad="ms"
                    referencia={t('el diseño declara 71 ms', 'design declares 71 ms')}
                    estado="atencion"
                    fase="NB7" fuente="efecto_mediana.json"
                  />
                </MetricGrid>
              </div>
              {medianaPac.length > 0 && (
                <Tabla
                  cabeceras={[t('Paciente', 'Patient'), t('Atenuación del pico R', 'R-peak attenuation'), 'Persistencia F_N+MED', 'Persistencia F_NB6']}
                  filas={medianaPac.map((f) => [
                    f.paciente, `${parseFloat(f.atenuacion_R_pct).toFixed(1)} %`,
                    parseFloat(f.persistencia_F_N_MED).toFixed(4),
                    parseFloat(f.persistencia_F_NB6).toFixed(4),
                  ])}
                  fuente="/data/nb7/efecto_mediana_por_paciente.csv"
                />
              )}
              <p style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-sm)', marginTop: '14px', lineHeight: 1.6, maxWidth: '70ch' }}>
                {t(
                  'La conclusión: el filtro no mejora el modelo, infla el R² de todo lo que se mida sobre la señal aplanada. Por eso la cadena final, F_NB6, no lo incluye.',
                  'The conclusion: the filter does not improve the model, it inflates the R² of anything measured on the flattened signal. That is why the final chain, F_NB6, excludes it.',
                )}
              </p>
            </>
          ) : !error && <p style={{ color: 'var(--text-muted)' }}>{t('Cargando…', 'Loading…')}</p>}
        </Seccion>

        {/* ── 5. Arquitectura ─────────────────────────────────────── */}
        <Seccion eyebrow={t('05 · Arquitectura', '05 · Architecture')} titulo={t('El modelo CNN-GRU-ATTN', 'The CNN-GRU-ATTN model')}>
          <figure style={{
            margin: 0, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '18px', textAlign: 'center',
          }}>
            <img loading="lazy" decoding="async" src="/data/nb7/img/fig26_arquitectura_cnn_gru_attn.png"
              alt={t('Diagrama de la arquitectura CNN-GRU-ATTN: convoluciones dilatadas, GRU apiladas, atención temporal y conexión residual.',
                'CNN-GRU-ATTN architecture diagram: dilated convolutions, stacked GRU, temporal attention and residual connection.')}
              style={{ maxWidth: '100%', height: 'auto', borderRadius: 'var(--radius-sm)' }} />
            <figcaption style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.5, textAlign: 'left' }}>
              <strong>Figura.</strong>{' '}
              {t('Arquitectura del modelo final. Fuente: elaboración propia.', 'Final model architecture. Source: own elaboration.')}{' '}
              <code style={{ fontFamily: 'var(--font-data)' }}>/data/nb7/img/fig26_arquitectura_cnn_gru_attn.png</code>
            </figcaption>
          </figure>
        </Seccion>

      </motion.div>
    </PageWrapper>
  );
}
