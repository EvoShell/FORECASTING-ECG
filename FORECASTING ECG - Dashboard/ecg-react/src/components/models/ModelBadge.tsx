import type { ModelName } from '@/types/ecg.types';
import { MODEL_COLORS, MODEL_BG, MODEL_BORDER } from '@/types/ecg.types';

interface ModelBadgeProps {
  model: ModelName;
  size?: 'sm' | 'md';
}

export function ModelBadge({ model, size = 'md' }: ModelBadgeProps) {
  const isSmall = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: isSmall ? '2px 8px' : '4px 10px',
      borderRadius: 'var(--radius-sm)',
      background: MODEL_BG[model],
      border: `1px solid ${MODEL_BORDER[model]}`,
      fontFamily: 'var(--font-data)',
      fontSize: isSmall ? '0.6rem' : '0.7rem',
      fontWeight: 500,
      color: MODEL_COLORS[model],
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: MODEL_COLORS[model],
        flexShrink: 0,
      }} />
      {model}
    </span>
  );
}
