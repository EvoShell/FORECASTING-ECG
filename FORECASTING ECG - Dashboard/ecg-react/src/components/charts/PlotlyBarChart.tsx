/**
 * Componente de Bar Chart horizontal usando Plotly.js con fallback CSS
 */

import { useECGStore } from '@/store/useECGStore';
import { PlotlyChart } from './PlotlyChart';
import { tok } from '@/lib/tokens';

interface BarChartData {
  name: string;
  value: number;
  error?: number;
  color?: string;
}

interface PlotlyBarChartProps {
  data: BarChartData[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  horizontal?: boolean;
  referenceLine?: number;
  referenceLineLabel?: string;
  showErrorBars?: boolean;
  xRange?: [number, number];
}

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#0ea5e9',
  accent: '#38bdf8',
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

export function PlotlyBarChart({
  data,
  title,
  xAxisLabel = 'R²',
  yAxisLabel,
  height = 380,
  horizontal = true,
  referenceLine,
  referenceLineLabel = 'R²=0',
  showErrorBars = false,
  xRange,
}: PlotlyBarChartProps) {
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  const sortedData = horizontal
    ? [...data].sort((a, b) => a.value - b.value)
    : data;

  const plotData = horizontal
    ? [
        {
          y: sortedData.map((d) => d.name),
          x: sortedData.map((d) => d.value),
          type: 'bar' as const,
          orientation: 'h' as const,
          marker: {
            color: sortedData.map((d) => d.color || CHART_COLORS.primary),
            line: {
              color: colors.bg,
              width: 1,
            },
          },
          text: sortedData.map((d) => d.value.toFixed(4)),
          textposition: 'outside' as const,
          textfont: {
            family: 'Inter, system-ui, sans-serif',
            size: 11,
            color: colors.text,
          },
          error_x: showErrorBars
            ? {
                type: 'data' as const,
                array: sortedData.map((d) => d.error || 0),
                color: colors.textSub,
                thickness: 1.5,
                width: 6,
              }
            : undefined,
          hovertemplate: '<b>%{y}</b><br>R²: %{x:.4f}<extra></extra>',
        },
      ]
    : [
        {
          x: sortedData.map((d) => d.name),
          y: sortedData.map((d) => d.value),
          type: 'bar' as const,
          marker: {
            color: sortedData.map((d) => d.color || CHART_COLORS.primary),
            line: {
              color: colors.bg,
              width: 1,
            },
          },
          text: sortedData.map((d) => d.value.toFixed(4)),
          textposition: 'outside' as const,
          textfont: {
            family: 'Inter, system-ui, sans-serif',
            size: 11,
            color: colors.text,
          },
          error_y: showErrorBars
            ? {
                type: 'data' as const,
                array: sortedData.map((d) => d.error || 0),
                color: colors.textSub,
                thickness: 1.5,
                width: 6,
              }
            : undefined,
          hovertemplate: '<b>%{x}</b><br>R²: %{y:.4f}<extra></extra>',
        },
      ];

  const shapes =
    referenceLine !== undefined
      ? [
          {
            type: 'line' as const,
            xref: 'x',
            yref: horizontal ? 'paper' : 'y',
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
        ]
      : [];

  const annotations =
    referenceLine !== undefined
      ? [
          {
            x: referenceLine,
            y: 1.08,
            yref: 'paper',
            text: referenceLineLabel,
            showarrow: false,
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 11,
              color: CHART_COLORS.error,
            },
            xanchor: 'center' as const,
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
      range: xRange,
      zeroline: true,
      zerolinecolor: tok('--border'),
      zerolinewidth: 1,
    },
    yaxis: {
      title: yAxisLabel
        ? {
            text: yAxisLabel,
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 12,
              color: colors.textSub,
            },
          }
        : undefined,
      showticklabels: true,
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 11,
        color: colors.textSub,
      },
      gridcolor: 'transparent',
      linecolor: tok('--border-strong'),
      mirror: true as const,
      ticks: 'outside' as const,
      ...(horizontal ? { autorange: 'reversed' } : {}),
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: colors.bg,
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: colors.textSub,
    },
    margin: horizontal ? { l: 120, r: 80, t: title ? 60 : 40, b: 60 } : { l: 60, r: 40, t: title ? 60 : 40, b: 80 },
    showlegend: false,
    height,
    shapes,
    annotations,
    bargap: 0.15,
    bargroupgap: 0.1,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'bar_chart',
      height,
      width: 900,
      scale: 2,
    },
  };

  return <PlotlyChart data={plotData as any} layout={layout as any} config={config as any} style={{ width: '100%', height }} />;
}

export function PlotlyGroupedBarChart({
  data,
  categories,
  title,
  xAxisLabel,
  yAxisLabel = 'R²',
  height = 450,
  colors = ['#3b82f6', '#0ea5e9', '#38bdf8', '#ef4444', '#1d4ed8', '#f59e0b'],
  referenceLine,
}: {
  data: { name: string; [key: string]: number | string }[];
  categories: string[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  colors?: string[];
  referenceLine?: number;
}) {
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const themeColors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  const plotData = categories.map((cat, idx) => ({
    x: data.map((d) => d.name),
    y: data.map((d) => d[cat] as number),
    type: 'bar' as const,
    name: cat,
    marker: {
      color: colors[idx % colors.length],
      line: {
        color: themeColors.bg,
        width: 1,
      },
    },
    text: data.map((d) => (d[cat] as number).toFixed(4)),
    textposition: 'top' as const,
    textfont: {
      family: 'Inter, system-ui, sans-serif',
      size: 10,
      color: themeColors.text,
    },
    hovertemplate: `<b>${cat}</b><br>%{x}: %{y:.4f}<extra></extra>`,
  }));

  const shapes =
    referenceLine !== undefined
      ? [
          {
            type: 'line' as const,
            xref: 'paper',
            yref: 'y',
            x0: 0,
            x1: 1,
            y0: referenceLine,
            y1: referenceLine,
            line: {
              color: CHART_COLORS.error,
              width: 1.5,
              dash: 'dot' as const,
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
            color: themeColors.text,
            weight: 600 as const,
          },
          x: 0.5,
          xanchor: 'center' as const,
        }
      : undefined,
    xaxis: {
      title: xAxisLabel
        ? {
            text: xAxisLabel,
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 12,
              color: themeColors.textSub,
            },
          }
        : undefined,
      gridcolor: themeColors.grid,
      linecolor: tok('--border-strong'),
      mirror: true as const,
      ticks: 'outside' as const,
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 11,
        color: themeColors.textSub,
      },
    },
    yaxis: {
      title: {
        text: yAxisLabel,
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
          color: themeColors.textSub,
        },
      },
      gridcolor: themeColors.grid,
      linecolor: tok('--border-strong'),
      mirror: true as const,
      ticks: 'outside' as const,
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 10,
        color: themeColors.textSub,
      },
      zeroline: true,
      zerolinecolor: tok('--border'),
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: themeColors.bg,
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: themeColors.textSub,
    },
    legend: {
      orientation: 'h' as const,
      yanchor: 'bottom' as const,
      y: 1.08,
      xanchor: 'center' as const,
      x: 0.5,
      font: {
        family: 'Inter, system-ui, sans-serif',
        size: 10,
        color: themeColors.textSub,
      },
      bgcolor: 'transparent',
      borderwidth: 0,
    },
    margin: { l: 60, r: 40, t: title ? 70 : 40, b: 80 },
    showlegend: true,
    barmode: 'group' as const,
    bargap: 0.15,
    bargroupgap: 0.1,
    height,
    shapes,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'grouped_bar_chart',
      height,
      width: 900,
      scale: 2,
    },
  };

  return <PlotlyChart data={plotData as any} layout={layout as any} config={config as any} style={{ width: '100%', height }} />;
}

export default PlotlyBarChart;
