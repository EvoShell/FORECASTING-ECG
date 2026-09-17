/**
 * Tarjetas KPI para métricas clave
 */

import { useECGStore } from '@/store/useECGStore';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'blue' | 'orange' | 'neutral';
  icon?: React.ReactNode;
}

export function KPICard({ label, value, sub, accent = 'neutral', icon }: KPICardProps) {
  const theme = useECGStore((s) => s.theme);
  const isDark = theme === 'dark';

  const colors = {
    green: {
      bg: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
      border: isDark ? 'rgba(59,130,246,0.2)' : '#bfdbfe',
      text: isDark ? '#3b82f6' : '#2563eb',
    },
    blue: {
      bg: isDark ? 'rgba(96,165,250,0.08)' : '#eff6ff',
      border: isDark ? 'rgba(96,165,250,0.2)' : '#bfdbfe',
      text: isDark ? '#60a5fa' : '#2563eb',
    },
    orange: {
      bg: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
      border: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a',
      text: isDark ? '#f59e0b' : '#d97706',
    },
    neutral: {
      bg: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc',
      border: isDark ? 'rgba(148,163,184,0.2)' : '#e2e8f0',
      text: 'var(--text)',
    },
  };

  const c = colors[accent];

  return (
    <div
      style={{
        flex: '1 1 200px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        textAlign: 'center',
        minWidth: '180px',
      }}
    >
      <div
        style={{
          fontSize: 'var(--fs-xs)',
          color: 'var(--text-muted)',
          marginBottom: '4px',
          fontFamily: 'var(--font-data)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--fs-lg)',
          fontWeight: 700,
          color: c.text,
          fontFamily: 'var(--font-display)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {icon}
        {typeof value === 'number' ? (Number.isInteger(value) ? value.toString() : value.toFixed(4)) : value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 'var(--fs-2xs)',
            color: 'var(--text-muted)',
            marginTop: '4px',
            fontFamily: 'var(--font-data)',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

interface KPIGridProps {
  children: React.ReactNode;
  gap?: string;
}

export function KPIGrid({ children, gap = '16px' }: KPIGridProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap,
        marginBottom: '28px',
      }}
    >
      {children}
    </div>
  );
}
