import { useEffect, useRef, useState } from 'react';

interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  colorFn?: (v: number) => string;
}

function defaultColor(label: string, value: number): string {
  const l = label.toLowerCase();
  if (l.includes('r²') || l.includes('r2')) {
    if (value >= 0.9) return 'var(--signal)';
    if (value < 0.7)  return 'var(--alert)';
    return 'var(--qrs)';
  }
  if (l.includes('mse')) {
    if (value <= 0.005) return 'var(--signal)';
    if (value > 0.02)   return 'var(--alert)';
    return 'var(--qrs)';
  }
  if (l.includes('dtw')) {
    if (value <= 50)  return 'var(--signal)';
    if (value > 150)  return 'var(--alert)';
    return 'var(--qrs)';
  }
  return 'var(--prediction)';
}

function useCountUp(target: number, duration = 900) {
  const [current, setCurrent] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCurrent(target * eased);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return current;
}

function formatValue(value: number, label: string): string {
  if (Number.isInteger(value)) return value.toString();
  const l = label.toLowerCase();
  if (l.includes('%') || l.includes('sens') || l.includes('espec') || value < 2) {
    return value.toFixed(value < 0.1 ? 4 : value < 1 ? 3 : 1);
  }
  return value.toFixed(1);
}

export function MetricCard({ label, value, unit, description, size = 'md', colorFn }: MetricCardProps) {
  const animated = useCountUp(value);
  const color = colorFn ? colorFn(value) : defaultColor(label, value);

  const fontSize = size === 'lg' ? '2rem' : size === 'md' ? '1.5rem' : '1.125rem';
  const padding  = size === 'lg' ? '28px' : size === 'md' ? '20px' : '16px';

  return (
    <div className="card" style={{ padding, position: 'relative', overflow: 'hidden' }}>
      {/* Faint color strip top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px',
        background: `linear-gradient(90deg, ${color}40, transparent)`,
      }} />

      <p style={{
        fontFamily: 'var(--font-data)',
        fontSize: 'var(--fs-3xs)',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: '10px',
      }}>
        {label}
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize,
          color,
          lineHeight: 1,
          animation: 'count-up 0.4s ease-out',
        }}>
          {formatValue(animated, label)}
        </span>
        {unit && (
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-2xs)',
            color: 'var(--text-muted)',
          }}>
            {unit}
          </span>
        )}
      </div>

      {description && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-xs)',
          color: 'var(--text-sub)',
          marginTop: '8px',
          lineHeight: 1.4,
        }}>
          {description}
        </p>
      )}
    </div>
  );
}
