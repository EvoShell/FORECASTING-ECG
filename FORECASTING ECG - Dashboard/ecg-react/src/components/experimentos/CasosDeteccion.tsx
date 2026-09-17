/**
 * «Enséñeme esa alarma»: el caso concreto detrás de cada cifra de detección.
 *
 * Es la respuesta a la pregunta que un tribunal hace justo después de ver el recuento.
 * El panel dice «precisión 0.798». Bien: ¿qué latido se marcó, cuál era su etiqueta, y
 * por qué? Hasta ahora esa pregunta no tenía respuesta en pantalla.
 *
 * Lo que se dibuja por caso: el latido real y el que el modelo predijo, superpuestos, y
 * debajo el error muestra a muestra. El argumento entero se ve de un vistazo — **el
 * modelo predice cómo debería ser el siguiente latido normal; cuando el real es
 * ectópico, las dos curvas se separan, y esa separación es la alarma**.
 *
 * Los casos límite son los que más convencen, y por eso se incluyen a propósito: de cada
 * veredicto se muestra el más claro y el que quedó pegado al umbral. En el paciente 208
 * hay un falso negativo que se escapó por 0.0004. Enseñar solo los casos fáciles es lo
 * que un jurado sospecha; enseñar el que casi falla es lo que da credibilidad.
 */
import { useMemo, useState } from 'react';
import { PlotlyChart } from '@/components/charts/PlotlyChart';
import { MetricStat, MetricGrid } from '@/components/metrics/MetricStat';
import { Selector, BarraFiltros, RecuentoFiltro } from '@/components/ui/Filtros';
import { useIsDark } from '@/hooks/useIsDark';
import { tok } from '@/lib/tokens';
import {
  useIndiceCasos,
  useCasosDeteccion,
  EXPLICACION,
  DIR_CASOS,
  type Veredicto,
} from '@/hooks/useCasosDeteccion';

/** El color dice si el veredicto fue acierto o fallo. Aquí sí informa. */
const TONO: Record<Veredicto, string> = {
  VP: 'var(--ok)',
  FP: 'var(--warn)',
  FN: 'var(--alert)',
  VN: 'var(--text-muted)',
};

const NOMBRE: Record<Veredicto, string> = {
  VP: 'Acierto',
  FP: 'Falsa alarma',
  FN: 'Perdido',
  VN: 'Correcto negativo',
};

export function CasosDeteccion() {
  const indice = useIndiceCasos();
  const [paciente, setPaciente] = useState('208');
  const { datos, cargando, error } = useCasosDeteccion(paciente);
  const [filtro, setFiltro] = useState<'Todos' | Veredicto>('Todos');
  const esOscuro = useIsDark();

  const color = useMemo(
    () => ({
      texto: tok('--text'),
      tenue: tok('--text-muted'),
      borde: tok('--border'),
      acento: tok('--accent'),
      ok: tok('--ok'),
      alerta: tok('--alert'),
    }),
    // Los colores de Plotly se escriben como atributos del SVG, donde var(--x) no
    // resuelve; hay que pasarlos por tok() y recalcularlos al cambiar de tema.
    [esOscuro],
  );

  const visibles = useMemo(
    () => (datos?.casos ?? []).filter((c) => filtro === 'Todos' || c.veredicto === filtro),
    [datos, filtro],
  );

  if (error) {
    return (
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--alert)' }}>
        No se pudieron cargar los casos: {error}
      </p>
    );
  }

  return (
    <div>
      <BarraFiltros>
        <Selector
          rotulo="Paciente"
          valor={paciente}
          onChange={setPaciente}
          opciones={indice.filas.map((f) => f.paciente)}
          anchoMinimo={110}
        />
        <Selector
          rotulo="Veredicto"
          valor={filtro}
          onChange={(v) => setFiltro(v as 'Todos' | Veredicto)}
          opciones={['Todos', 'VP', 'FP', 'FN', 'VN']}
          anchoMinimo={110}
        />
        {datos && (
          <RecuentoFiltro>
            {visibles.length} de {datos.casos.length} casos · umbral {datos.umbral.toFixed(4)}
          </RecuentoFiltro>
        )}
      </BarraFiltros>

      {cargando && (
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>Cargando los casos…</p>
      )}

      {datos && (
        <>
          <MetricGrid minimo={172}>
            <MetricStat
              densa
              fase="NB8"
              etiqueta="Aciertos (VP)"
              valor={datos.recuento.VP.toLocaleString('es')}
              n={datos.nEvaluables}
              fuente={`${DIR_CASOS}/${datos.paciente}.json`}
            />
            <MetricStat
              densa
              fase="NB8"
              etiqueta="Falsas alarmas (FP)"
              valor={datos.recuento.FP.toLocaleString('es')}
              n={datos.nEvaluables}
              fuente={`${DIR_CASOS}/${datos.paciente}.json`}
            />
            <MetricStat
              densa
              fase="NB8"
              etiqueta="Perdidos (FN)"
              valor={datos.recuento.FN.toLocaleString('es')}
              n={datos.nEvaluables}
              fuente={`${DIR_CASOS}/${datos.paciente}.json`}
            />
            <MetricStat
              densa
              fase="NB8"
              etiqueta="Precisión"
              valor={datos.precision !== null ? datos.precision.toFixed(4) : null}
              referencia={`umbral ${datos.umbral.toFixed(4)}`}
              n={datos.recuento.VP + datos.recuento.FP}
              fuente={`${DIR_CASOS}/${datos.paciente}.json`}
            />
            <MetricStat
              densa
              fase="NB8"
              etiqueta="Exhaustividad"
              valor={datos.exhaustividad !== null ? datos.exhaustividad.toFixed(4) : null}
              n={datos.recuento.VP + datos.recuento.FN}
              fuente={`${DIR_CASOS}/${datos.paciente}.json`}
            />
            {datos.nExcluidosQ > 0 && (
              <MetricStat
                densa
                fase="NB8"
                etiqueta="Latidos excluidos (Q)"
                valor={datos.nExcluidosQ.toLocaleString('es')}
                nota="marcapasos o no clasificables; no entran en la evaluación"
                n={datos.nVentanas * 3}
                fuente={`${DIR_CASOS}/${datos.paciente}.json`}
              />
            )}
          </MetricGrid>

          <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
            {visibles.map((c) => {
              const x = c.real.map((_, i) => i);
              const dif = c.real.map((v, i) => v - c.predicho[i]);
              const cruza = c.mse >= datos.umbral;
              const margen = Math.abs(c.mse - datos.umbral);
              return (
                <div
                  key={`${c.veredicto}-${c.ventana}-${c.horizonte}`}
                  className="card"
                  style={{ padding: '14px 16px', borderLeft: `3px solid ${TONO[c.veredicto]}` }}
                >
                  <div
                    style={{
                      display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
                      gap: '6px 14px', marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)',
                        fontWeight: 700, color: TONO[c.veredicto],
                      }}
                    >
                      {c.veredicto} · {NOMBRE[c.veredicto]}
                    </span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>
                      {EXPLICACION[c.veredicto].es}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)',
                        color: 'var(--text-muted)', marginLeft: 'auto',
                      }}
                    >
                      ventana {c.ventana} · t+{c.horizonte + 1} · clase {c.clase} ·
                      {' '}MSE {c.mse.toFixed(4)} {cruza ? '≥' : '<'} {datos.umbral.toFixed(4)}
                      {margen < 0.01 && (
                        <strong style={{ color: 'var(--warn)' }}>
                          {' '}· a {margen.toFixed(4)} del umbral
                        </strong>
                      )}
                    </span>
                  </div>

                  <PlotlyChart
                    data={[
                      {
                        type: 'scatter', mode: 'lines', name: 'latido real',
                        x, y: c.real,
                        line: { color: color.acento, width: 2 },
                        hovertemplate: 'muestra %{x}<br>real %{y:.3f}<extra></extra>',
                      },
                      {
                        type: 'scatter', mode: 'lines', name: 'predicho por el modelo',
                        x, y: c.predicho,
                        line: { color: color.tenue, width: 2, dash: 'dot' },
                        hovertemplate: 'muestra %{x}<br>predicho %{y:.3f}<extra></extra>',
                      },
                      {
                        type: 'scatter', mode: 'lines', name: 'diferencia',
                        x, y: dif, yaxis: 'y2',
                        line: { color: cruza ? color.alerta : color.ok, width: 1 },
                        fill: 'tozeroy',
                        fillcolor: cruza ? 'rgba(240,138,130,0.14)' : 'rgba(92,192,139,0.10)',
                        hovertemplate: 'muestra %{x}<br>diferencia %{y:.3f}<extra></extra>',
                      },
                    ]}
                    layout={{
                      height: 260,
                      margin: { l: 46, r: 46, t: 8, b: 34 },
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      font: { color: color.texto, size: 10 },
                      legend: { orientation: 'h', y: -0.2, font: { size: 9, color: color.tenue } },
                      xaxis: {
                        title: { text: 'muestra del latido (256 = un latido completo)' },
                        gridcolor: color.borde, zerolinecolor: color.borde,
                      },
                      yaxis: {
                        title: { text: 'amplitud (z-score)' },
                        gridcolor: color.borde, zerolinecolor: color.borde,
                      },
                      yaxis2: {
                        title: { text: 'real − predicho' },
                        overlaying: 'y', side: 'right',
                        gridcolor: 'transparent', zerolinecolor: color.borde,
                      },
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%' }}
                  />
                </div>
              );
            })}
          </div>

          <p
            style={{
              margin: '10px 0 0', fontFamily: 'var(--font-data)',
              fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', lineHeight: 1.5,
            }}
          >
            n = {datos.nEvaluables.toLocaleString('es')} latidos evaluables de{' '}
            {(datos.nVentanas * 3).toLocaleString('es')} · Fuente: {DIR_CASOS}/{datos.paciente}.json
            {' '}· generado por scripts/generar_casos_deteccion.py desde las ondas del experimento 8
          </p>
        </>
      )}
    </div>
  );
}

export default CasosDeteccion;
