/**
 * Componente de BoxPlot con estilo profesional ingenieril
 */

import { useECGStore } from '@/store/useECGStore';
import { PlotlyChart } from './PlotlyChart';
import { tok } from '@/lib/tokens';

interface BoxPlotProps {
  data: { name: string; values: number[] }[];
  title?: string;
  yAxisLabel?: string;
  height?: number;
  showMean?: boolean;
  referenceLine?: number;
}

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#0ea5e9',
  accent: '#38bdf8',
  purple: '#1d4ed8',
  error: '#ef4444',
  warning: '#f59e0b',
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

export function BoxPlot({
  data,
  title,
  yAxisLabel = 'R²',
  height = 400,
  showMean = true,
  referenceLine,
}: BoxPlotProps) {
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  // Paleta Okabe-Ito: ocho tonos disenados para ser distinguibles con cualquier tipo de
  // daltonismo. La anterior empezaba con cuatro azules casi identicos, indistinguibles
  // incluso con vision normal.
  const plotColors = ['#0072B2', '#E69F00', '#009E73', '#CC79A7',
                      '#D55E00', '#56B4E9', '#F0E442', '#666666'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData: any[] = data.map((d, idx) => ({
    y: d.values.filter((v) => !isNaN(v)),
    type: 'box',
    name: d.name,
    boxmean: showMean ? 'sd' : false,
    marker: {
      color: plotColors[idx % plotColors.length],
      line: {
        color: tok('--surface'),
        width: 1,
      },
    },
    line: {
      color: plotColors[idx % plotColors.length],
      width: 2,
    },
    fillcolor: `${plotColors[idx % plotColors.length]}33`,
  }));

  const shapes = referenceLine !== undefined
    ? [
        {
          type: 'line',
          xref: 'paper',
          yref: 'y',
          x0: 0,
          x1: 1,
          y0: referenceLine,
          y1: referenceLine,
          line: {
            color: CHART_COLORS.error,
            width: 1.5,
            dash: 'dot',
          },
        },
      ]
    : [];

  const annotations = referenceLine !== undefined
    ? [
        {
          x: 1,
          y: referenceLine,
          xref: 'paper',
          yref: 'y',
          text: `R²=${referenceLine}`,
          showarrow: false,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 10,
            color: CHART_COLORS.error,
          },
          xanchor: 'left',
          yanchor: 'bottom',
        },
      ]
    : [];

  const layout = {
    title: title
      ? {
          text: title,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 14,
            color: colors.text,
            weight: 600,
          },
          x: 0.5,
          xanchor: 'center',
        }
      : undefined,
    yaxis: {
      title: {
        text: yAxisLabel,
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
          color: colors.textSub,
        },
      },
      gridcolor: colors.grid,
      gridwidth: 1,
      linecolor: tok('--border-strong'),
      mirror: true,
      ticks: 'outside',
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 10,
        color: colors.textSub,
      },
      zeroline: true,
      zerolinecolor: tok('--border'),
      zerolinewidth: 1,
    },
    xaxis: {
      gridcolor: colors.grid,
      linecolor: tok('--border-strong'),
      mirror: true,
      ticks: 'outside',
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 11,
        color: colors.textSub,
      },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: colors.bg,
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: colors.textSub,
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
      font: {
        family: 'Inter, system-ui, sans-serif',
        size: 10,
        color: colors.textSub,
      },
      bgcolor: 'transparent',
      borderwidth: 0,
    },
    margin: { l: 60, r: 40, t: title ? 60 : 30, b: 60 },
    height,
    shapes,
    annotations,
    boxmode: 'group',
    boxgap: 0.2,
    boxgroupgap: 0.1,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'boxplot',
      height,
      width: 800,
      scale: 2,
    },
  };

  return <PlotlyChart data={plotData as any} layout={layout as any} config={config as any} style={{ width: '100%', height }} />;
}

interface ComparisonBoxPlotProps {
  groups: { label: string; data: { name: string; values: number[] }[] }[];
  title?: string;
  yAxisLabel?: string;
  height?: number;
  referenceLine?: number;
}

export function ComparisonBoxPlot({
  groups,
  title,
  yAxisLabel = 'R²',
  height = 450,
  referenceLine,
}: ComparisonBoxPlotProps) {
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  const plotColors = ['#3b82f6', '#0ea5e9', '#38bdf8', '#1d4ed8', '#ef4444', '#f59e0b'];
  const colorIndex = { count: 0 };
  const getColor = () => {
    const c = plotColors[colorIndex.count % plotColors.length];
    colorIndex.count++;
    return c;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData: any[] = groups.flatMap((group) =>
    group.data.map((d) => {
      const color = getColor();
      return {
        y: d.values.filter((v) => !isNaN(v)),
        type: 'box',
        name: d.name,
        legendgroup: d.name,
        showlegend: group === groups[0],
        x: [group.label],
        boxmean: 'sd',
        marker: {
          color,
          line: {
            color: tok('--surface'),
            width: 1,
          },
        },
        line: {
          color,
          width: 2,
        },
        fillcolor: `${color}33`,
      };
    })
  );

  const shapes = referenceLine !== undefined
    ? [
        {
          type: 'line',
          xref: 'paper',
          yref: 'y',
          x0: 0,
          x1: 1,
          y0: referenceLine,
          y1: referenceLine,
          line: {
            color: CHART_COLORS.error,
            width: 1.5,
            dash: 'dot',
          },
        },
      ]
    : [];

  const layout = {
    title: title
      ? {
          text: title,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 14,
            color: colors.text,
            weight: 600,
          },
          x: 0.5,
          xanchor: 'center',
        }
      : undefined,
    yaxis: {
      title: {
        text: yAxisLabel,
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
          color: colors.textSub,
        },
      },
      gridcolor: colors.grid,
      linecolor: tok('--border-strong'),
      mirror: true,
      ticks: 'outside',
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 10,
        color: colors.textSub,
      },
      zeroline: true,
      zerolinecolor: tok('--border'),
    },
    xaxis: {
      gridcolor: colors.grid,
      linecolor: tok('--border-strong'),
      mirror: true,
      ticks: 'outside',
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 11,
        color: colors.textSub,
      },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: colors.bg,
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: colors.textSub,
    },
    boxmode: 'group',
    boxgap: 0.3,
    boxgroupgap: 0.15,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.08,
      xanchor: 'center',
      x: 0.5,
      font: {
        family: 'Inter, system-ui, sans-serif',
        size: 10,
        color: colors.textSub,
      },
      bgcolor: 'transparent',
      borderwidth: 0,
    },
    margin: { l: 60, r: 40, t: title ? 70 : 30, b: 70 },
    height,
    shapes,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'comparison_boxplot',
      height,
      width: 900,
      scale: 2,
    },
  };

  return <PlotlyChart data={plotData as any} layout={layout as any} config={config as any} style={{ width: '100%', height }} />;
}

export default BoxPlot;
