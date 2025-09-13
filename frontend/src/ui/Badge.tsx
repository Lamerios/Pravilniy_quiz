import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantToStyle: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--gray-200)', color: 'var(--gray-700)' },
  success: { background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: 'var(--color-success)' },
  warning: { background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: 'var(--warning, #f59e0b)' },
  danger: { background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: 'var(--color-error)' },
  info: { background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: 'var(--color-info)' },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', className, children, style, ...rest }) => {
  const styles: React.CSSProperties = { padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', ...variantToStyle[variant], ...style };
  return (
    <span className={["badge", className || ''].filter(Boolean).join(' ')} style={styles} {...rest}>
      {children}
    </span>
  );
};

export default Badge;
