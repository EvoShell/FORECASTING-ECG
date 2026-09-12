import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'highlighted';
}

export function ExpandableSection({
  title,
  children,
  defaultOpen = false,
  variant = 'default',
}: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isDark = useIsDark();

  const variantStyles = {
    default: {
      bg: 'var(--accent-bg)',
      border: 'var(--accent-border)',
      titleColor: 'var(--text)',
    },
    highlighted: {
      bg: 'var(--accent-bg)',
      border: 'var(--accent-border)',
      titleColor: '#3b82f6',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          padding: '14px 18px',
          background: styles.bg,
          border: `1px solid ${styles.border}`,
          borderBottom: isOpen ? 'none' : `1px solid ${styles.border}`,
          borderRadius: isOpen
            ? 'var(--radius-sm) var(--radius-sm) 0 0'
            : 'var(--radius-sm)',
          color: styles.titleColor,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-sm)',
          fontWeight: 500,
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 18px',
                background: 'var(--surface)',
                border: `1px solid ${styles.border}`,
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                fontSize: 'var(--fs-sm)',
                lineHeight: 1.6,
                color: 'var(--text-sub)',
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExpandableSection;
