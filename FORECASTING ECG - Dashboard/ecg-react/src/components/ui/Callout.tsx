import type { ReactNode } from 'react';
import { Info, AlertTriangle, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';

type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'note';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const CALLOUT_CONFIG: Record<CalloutType, { icon: typeof Info; bg: string; border: string; iconColor: string; titleColor: string }> = {
  info: {
    icon: Info,
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    iconColor: '#3b82f6',
    titleColor: '#3b82f6',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    iconColor: '#f59e0b',
    titleColor: '#d97706',
  },
  success: {
    icon: CheckCircle,
    bg: 'rgba(96, 165, 250, 0.1)',
    border: 'rgba(96, 165, 250, 0.3)',
    iconColor: '#60a5fa',
    titleColor: '#3b82f6',
  },
  error: {
    icon: XCircle,
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    iconColor: '#ef4444',
    titleColor: '#dc2626',
  },
  note: {
    icon: Lightbulb,
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.25)',
    iconColor: '#3b82f6',
    titleColor: '#2563eb',
  },
};

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const config = CALLOUT_CONFIG[type];
  const Icon = config.icon;
  const isDark = useIsDark();

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '14px 16px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    >
      <Icon
        size={20}
        style={{ color: config.iconColor, flexShrink: 0, marginTop: '2px' }}
      />
      <div style={{ flex: 1 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              fontSize: 'var(--fs-sm)',
              color: config.titleColor,
              marginBottom: '4px',
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            fontSize: 'var(--fs-sm)',
            lineHeight: 1.6,
            color: 'var(--text-sub)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default Callout;
