/**
 * Componente de Forest Plot con estilo profesional ingenieril
 */

import { useECGStore } from '@/store/useECGStore';
import type { ForestPlotData } from '@/types/ecg.types';
import { PlotlyChart } from './PlotlyChart';
import { tok } from '@/lib/tokens';

interface ForestPlotProps {
  data: ForestPlotData[];
  title?: string;
  xAxisLabel?: string;
  height?: number;
  referenceLine?: number;
}

const CHART_COLORS = {
  primary: '#3b82f6',
  error: '#ef4444',
  dark: {
    text: '#e2e8f0',
    textSub: '#94a3b8',
    bg: '#0f172a',
    border: '#334155',
    grid: 'rgba(148,163,184,0.1)',
  },
  light: {
    text: '#1e293b',
    textSub: '#64748b',
    bg: '#ffffff',
    border: '#e2e8f0',
    grid: 'rgba(100,116,139,0.15)',
  },
};

export function ForestPlot({
  data,
  title,
  xAxisLabel = 'R²',
  height,
  referenceLine = 0,
}: ForestPlotProps) {
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  const sortedData = [...data].sort((a, b) => a.media - b.media);
  const n = sortedData.length;
  const calculatedHeight = height ?? Math.max(280, n * 50 + 80);

  const allValues = sortedData.flatMap((d) => [d.icInf, d.icSup, d.media]);
  const minX = Math.min(...allValues);
  const maxX = Math.max(...allValues);
  const xRange = maxX - minX;
  const xPadding = xRange * 0.08;

  const lineTraces = sortedData.map((d, idx) => ({
    x: [d.icInf, d.icSup] as [number, number],
    y: [idx, idx] as [number, number],
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: {
      color: d.color || CHART_COLORS.primary,
      width: 3,
    },
    showlegend: false,
    hoverinfo: 'x+name' as const,
    name: d.modelo,
  }));

  const markerTraces = sortedData.map((d, idx) => ({
    x: [d.media] as [number],
    y: [idx] as [number],
    mode: 'markers+text' as const,
    type: 'scatter' as const,
    marker: {
      size: 14,
      symbol: 'diamond' as const,
      color: d.color || CHART_COLORS.primary,
      line: {
        color: tok('--surface'),
        width: 1.5,
      },
    },
    text: [d.media.toFixed(4)] as [string],
    textposition: 'middle right' as const,
    textfont: {
      family: 'Inter, system-ui, sans-serif',
      size: 11,
      color: colors.text,
    },
    showlegend: false,
    hovertemplate: `<b>${d.modelo}</b><br>Media: ${d.media.toFixed(4)}<br>IC 95%: [${d.icInf.toFixed(4)}, ${d.icSup.toFixed(4)}]<extra></extra>`,
    name: d.modelo,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData: any[] = [...lineTraces, ...markerTraces];

  const layout = {
    title: title
      ? {
          text: title,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 14,
            color: colors.text,
            weight: 600 as const,
          },
          x: 0.5,
          xanchor: 'center' as const,
        }
      : undefined,
    xaxis: {
      title: {
        text: xAxisLabel,
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
          color: colors.textSub,
        },
      },
      range: [minX - xPadding, maxX + xPadding],
      gridcolor: colors.grid,
      gridwidth: 1,
      linecolor: tok('--border-strong'),
      mirror: true as const,
      ticks: 'outside' as const,
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 10,
        color: colors.textSub,
      },
      zeroline: true,
      zerolinecolor: CHART_COLORS.error,
      zerolinewidth: 2,
    },
    yaxis: {
      title: {
        text: '',
      },
      showticklabels: true,
      tickmode: 'array' as const,
      tickvals: sortedData.map((_, i) => i),
      ticktext: sortedData.map((d) => d.modelo),
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 11,
        color: colors.textSub,
      },
      gridcolor: 'transparent',
      linecolor: tok('--border-strong'),
      mirror: true as const,
      range: [-0.7, n - 0.3],
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: colors.bg,
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: colors.textSub,
    },
    margin: { l: 130, r: 80, t: title ? 60 : 30, b: 50 },
    showlegend: false,
    shapes: [
      {
        type: 'line' as const,
        xref: 'x',
        yref: 'paper',
        x0: referenceLine,
        x1: referenceLine,
        y0: 0,
        y1: 1,
        line: {
          color: CHART_COLORS.error,
          width: 1.5,
          dash: 'dot' as const,
        },
      },
    ],
    annotations: [
      {
        x: referenceLine,
        y: 1.08,
        yref: 'paper',
        text: `R²=${referenceLine}`,
        showarrow: false,
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 11,
          color: CHART_COLORS.error,
        },
        xanchor: 'center' as const,
      },
    ],
    hovermode: 'closest' as const,
    height: calculatedHeight,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'forest_plot',
      height: calculatedHeight,
      width: 800,
      scale: 2,
    },
  };

  return <PlotlyChart data={plotData} layout={layout} config={config} style={{ width: '100%', height: calculatedHeight }} />;
}

function SimpleForestPlotFallback({ data, title, referenceLine = 0 }: { data: ForestPlotData[]; title?: string; referenceLine?: number }) {
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  const sortedData = [...data].sort((a, b) => a.media - b.media);
  const allValues = sortedData.flatMap((d) => [d.icInf, d.icSup, d.media]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const getPosition = (val: number) => ((val - minVal) / range) * 100;
  const refPosition = getPosition(referenceLine);

  return (
    <div
      style={{
        background: colors.bg,
        borderRadius: '8px',
        padding: '16px',
        border: `1px solid ${colors.border}`,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            color: colors.text,
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedData.map((d) => (
          <div key={d.modelo} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '100px',
                fontSize: 'var(--fs-xs)',
                fontWeight: 500,
                color: colors.textSub,
                textAlign: 'right',
                paddingRight: '12px',
              }}
            >
              {d.modelo}
            </div>
            <div
              style={{
                position: 'relative',
                flex: 1,
                height: '28px',
                background: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(241,245,249,0.8)',
                borderRadius: '4px',
                border: `1px solid ${'var(--border)'}`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${getPosition(d.icInf)}%`,
                  width: `${getPosition(d.icSup) - getPosition(d.icInf)}%`,
                  height: '4px',
                  background: d.color || CHART_COLORS.primary,
                  transform: 'translateY(-50%)',
                  borderRadius: '2px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${getPosition(d.media)}%`,
                  width: '12px',
                  height: '12px',
                  background: d.color || CHART_COLORS.primary,
                  border: `2px solid ${isDark ? '#0f172a' : '#fff'}`,
                  borderRadius: '2px',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${refPosition}%`,
                  width: '1px',
                  height: '100%',
                  background: CHART_COLORS.error,
                  opacity: 0.7,
                }}
              />
            </div>
            <div
              style={{
                width: '70px',
                fontSize: 'var(--fs-2xs)',
                fontFamily: 'monospace',
                color: colors.text,
                textAlign: 'left',
              }}
            >
              {d.media.toFixed(4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleForestPlot({ data, title, referenceLine = 0 }: { data: ForestPlotData[]; title?: string; referenceLine?: number }) {
  return <SimpleForestPlotFallback data={data} title={title} referenceLine={referenceLine} />;
}

export default ForestPlot;
