import { useRef, useEffect, useMemo, useState } from 'react';

interface LightweightECGChartProps {
  signal: number[];
  timestamps?: number[];
  width?: number;
  height?: number;
  color?: string;
  gridColor?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  startIndex?: number;
  endIndex?: number;
}

export function LightweightECGChart({
  signal,
  timestamps,
  width = 800,
  height = 300,
  color = '#3b82f6',
  gridColor = '#1c2333',
  backgroundColor = 'transparent',
  showGrid = true,
  startIndex = 0,
  endIndex,
}: LightweightECGChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const displaySignal = useMemo(() => {
    const end = endIndex ?? signal.length;
    const displayLength = Math.min(end - startIndex, signal.length);
    
    // Downsample to max 2000 points for smooth rendering
    const maxPoints = 2000;
    const step = Math.max(1, Math.ceil(displayLength / maxPoints));
    
    const downsampled: { x: number; y: number }[] = [];
    for (let i = startIndex; i < end; i += step) {
      const x = timestamps ? timestamps[i] : i;
      const y = signal[i];
      downsampled.push({ x, y });
    }
    return downsampled;
  }, [signal, timestamps, startIndex, endIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (displaySignal.length === 0) return;

    // Calculate bounds
    const values = displaySignal.map(p => p.y);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const rangeY = maxY - minY || 1;
    
    const minX = displaySignal[0].x;
    const maxX = displaySignal[displaySignal.length - 1].x;
    const rangeX = maxX - minX || 1;

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const scaleX = (x: number) => padding + ((x - minX) / rangeX) * chartWidth;
    const scaleY = (y: number) => padding + chartHeight - ((y - minY) / rangeY) * chartHeight;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      
      // Horizontal grid lines
      for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }
      
      // Vertical grid lines
      for (let i = 0; i <= 6; i++) {
        const x = padding + (chartWidth / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
      }
    }

    // Draw signal
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    let first = true;
    for (const point of displaySignal) {
      const x = scaleX(point.x);
      const y = scaleY(point.y);
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    setIsLoaded(true);
  }, [displaySignal, width, height, color, gridColor, backgroundColor, showGrid]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: '8px',
        backgroundColor
      }}
    />
  );
}

export default LightweightECGChart;
