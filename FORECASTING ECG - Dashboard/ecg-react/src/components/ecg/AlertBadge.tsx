import type { AlertLevel, ArrhythmiaType } from '@/types/ecg.types';

interface AlertBadgeProps {
  level: AlertLevel;
  arrhythmia?: ArrhythmiaType;
}

const CONFIG = {
  normal: {
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
    label: 'Ritmo sinusal normal',
    pulse: false,
  },
  warning: {
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
    label: 'Irregularidad detectada',
    pulse: false,
  },
  critical: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    label: 'ALERTA DETECTADA',
    pulse: true,
  },
};

const ARRHYTHMIA_LABELS: Record<ArrhythmiaType, string> = {
  normal: 'Ritmo normal',
  LBBB: 'Bloqueo rama izquierda',
  RBBB: 'Bloqueo rama derecha',
  APC: 'Contracción auricular prematura',
  PVC: 'Contracción ventricular prematura',
};

export function AlertBadge({ level, arrhythmia }: AlertBadgeProps) {
  const cfg = CONFIG[level];

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Dot indicator */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cfg.pulse && (
            <div style={{
              position: 'absolute',
              width: '10px', height: '10px',
              borderRadius: '50%',
              background: cfg.color,
              opacity: 0.4,
              animation: 'pulse-ring 1.5s ease-out infinite',
            }} />
          )}
          <div style={{
            width: '8px', height: '8px',
            borderRadius: '50%',
            background: cfg.color,
            boxShadow: `0 0 8px ${cfg.color}`,
            flexShrink: 0,
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-section)',
          fontWeight: 600,
          fontSize: 'var(--fs-xs)',
          color: cfg.color,
          letterSpacing: level === 'critical' ? '0.5px' : 0,
        }}>
          {cfg.label}
        </span>
      </div>

      {arrhythmia && arrhythmia !== 'normal' && (
        <p style={{
          fontFamily: 'var(--font-data)',
          fontSize: 'var(--fs-xs)',
          color: 'var(--text-sub)',
          paddingLeft: '18px',
        }}>
          {ARRHYTHMIA_LABELS[arrhythmia]}
        </p>
      )}
    </div>
  );
}
