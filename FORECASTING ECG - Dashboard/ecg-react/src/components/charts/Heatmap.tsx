/**
 * Componente de Heatmap con estilo profesional ingenieril
 */

import { useECGStore } from '@/store/useECGStore';
import { PlotlyChart } from './PlotlyChart';
import { tok } from '@/lib/tokens';

interface HeatmapProps {
  x: string[];
  y: string[];
  z: number[][];
  title?: string;
  zAxisLabel?: string;
  colorscale?: 'RdYlGn' | 'Viridis' | 'Blues' | 'Reds' | 'RdYlBu' | 'thermal';
  height?: number;
  zMin?: number;
  zMax?: number;
}

/**
 * Escala secuencial viridis.
 *
 * La anterior iba de rojo a verde, el peor caso posible para el daltonismo: quien tiene
 * deuteranopia o protanopia no distingue los extremos, que es justo lo que la figura
 * pretende comunicar. Viridis es perceptualmente uniforme y se lee en las tres formas.
 */
const THERMAL_COLORSCALE: [number, string][] = [
  [0, '#440154'],
  [0.25, '#3b528b'],
  [0.5, '#21918c'],
  [0.75, '#5ec962'],
  [1, '#fde725'],
];

const CHART_COLORS = {
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

export function Heatmap({
  x,
  y,
  z,
  title,
  zAxisLabel = 'R²',
  colorscale = 'thermal',
  height = 340,
  zMin,
  zMax,
}: HeatmapProps) {
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  const zValues = z.flat().filter((v) => !isNaN(v));
  const calculatedZMin = zMin ?? Math.min(...zValues);
  const calculatedZMax = zMax ?? Math.max(...zValues);

  const getColorscale = () => {
    if (colorscale === 'thermal') return THERMAL_COLORSCALE;
    return colorscale;
  };

  const textData = z.map((row) => row.map((val) => (isNaN(val) ? '' : val.toFixed(3))));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData: any[] = [
    {
      x,
      y,
      z,
      type: 'heatmap',
      colorscale: getColorscale(),
      showscale: true,
      text: textData,
      texttemplate: '%{text}',
      hoverongaps: false,
      hovertemplate: '<b>%{y}</b> × <b>%{x}</b><br>R²: %{z:.4f}<extra></extra>',
      colorbar: {
        title: {
          text: zAxisLabel,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            color: colors.text,
          },
        },
        tickfont: {
          family: 'Inter, system-ui, sans-serif',
          size: 11,
          color: colors.textSub,
        },
        len: 0.85,
        thickness: 20,
        x: 1.02,
      },
    },
  ];

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
          y: 0.95,
          yanchor: 'top' as const,
        }
      : undefined,
    xaxis: {
      title: {
        text: 'Horizonte de predicción',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
          color: colors.textSub,
        },
      },
      tickangle: -45,
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 10,
        color: colors.textSub,
      },
      gridcolor: colors.grid,
      linecolor: tok('--border'),
      mirror: true as const,
      ticks: 'outside' as const,
    },
    yaxis: {
      title: {
        text: 'Modelo',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
          color: colors.textSub,
        },
      },
      autorange: 'reversed' as const,
      tickfont: {
        family: 'Inter, system-ui, sans-serif',
        size: 11,
        color: colors.textSub,
      },
      gridcolor: colors.grid,
      linecolor: tok('--border'),
      mirror: true as const,
      ticks: 'outside' as const,
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: colors.bg,
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: colors.textSub,
    },
    margin: { l: 120, r: 60, t: title ? 70 : 40, b: 80 },
    height,
    zmin: calculatedZMin,
    zmax: calculatedZMax,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'heatmap_ecg',
      height: height,
      width: 900,
      scale: 2,
    },
  };

  return <PlotlyChart data={plotData} layout={layout} config={config} style={{ width: '100%', height }} />;
}

interface SimpleHeatmapProps {
  x: string[];
  y: string[];
  z: number[][];
  title?: string;
  cellHeight?: number;
  zMin?: number;
  zMax?: number;
  isDark: boolean;
  colors: { text: string; textSub: string; bg: string; border: string };
}

export function SimpleHeatmap({ x, y, z, title, cellHeight = 36, zMin, zMax, isDark, colors }: SimpleHeatmapProps) {
  const zValues = z.flat().filter((v) => !isNaN(v));
  const min = zMin ?? Math.min(...zValues);
  const max = zMax ?? Math.max(...zValues);

  const getColor = (v: number) => {
    if (isNaN(v)) return 'rgba(128,128,128,0.3)';
    const normalized = Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
    if (normalized < 0.25) return `rgba(192, 57, 43, ${0.7 + normalized * 0.3})`;
    if (normalized < 0.5) return `rgba(231, 76, 60, ${0.7 + normalized * 0.3})`;
    if (normalized < 0.75) return `rgba(245, 176, 65, ${0.7 + normalized * 0.3})`;
    return `rgba(30, 132, 73, ${0.7 + normalized * 0.3})`;
  };

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
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-block', minWidth: '100%' }}>
          <div style={{ display: 'flex', gap: '1px', marginLeft: '110px', marginBottom: '4px' }}>
            {x.map((xVal, i) => (
              <div
                key={i}
                style={{
                  width: cellHeight * 2,
                  textAlign: 'center',
                  fontSize: 'var(--fs-3xs)',
                  fontWeight: 500,
                  color: colors.textSub,
                  padding: '2px',
                }}
              >
                {xVal}
              </div>
            ))}
          </div>
          {y.map((yVal, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', gap: '1px' }}>
              <div
                style={{
                  width: '110px',
                  height: cellHeight,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 'var(--fs-2xs)',
                  fontWeight: 500,
                  color: colors.textSub,
                  paddingRight: '8px',
                  justifyContent: 'flex-end',
                }}
              >
                {yVal}
              </div>
              {z[rowIdx].map((cellVal, colIdx) => (
                <div
                  key={colIdx}
                  title={`${yVal} × ${x[colIdx]}: ${cellVal.toFixed(4)}`}
                  style={{
                    width: cellHeight * 2,
                    height: cellHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: getColor(cellVal),
                    fontSize: 'var(--fs-3xs)',
                    fontWeight: 600,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  {isNaN(cellVal) ? 'N/A' : cellVal.toFixed(3)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '12px',
          fontSize: 'var(--fs-3xs)',
          color: colors.textSub,
        }}
      >
        <span>R² = {min.toFixed(3)}</span>
        <div
          style={{
            width: '100px',
            height: '8px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #c0392b, #e74c3c, #f5b041, #82e0aa, #1e8449)',
          }}
        />
        <span>R² = {max.toFixed(3)}</span>
      </div>
    </div>
  );
}
