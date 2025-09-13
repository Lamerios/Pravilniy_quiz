import React from 'react';

export interface AwardProps {
  icon: string; // emoji or single-char icon
  title: string;
  subtitle?: string;
  gradient?: string; // css gradient
  tooltip?: string;
}

export const Award: React.FC<AwardProps> = ({ icon, title, subtitle, gradient, tooltip }) => {
  const bg = gradient || 'linear-gradient(135deg, #7c3aed, #8b5cf6)';
  return (
    <div className="card" style={{ minWidth: 180 }} title={tooltip}>
      <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: 'var(--shadow-md)' }}>
          <span aria-hidden>{icon}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          {subtitle ? <div className="muted" style={{ fontSize: 12 }}>{subtitle}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default Award;


