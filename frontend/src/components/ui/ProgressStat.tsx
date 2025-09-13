import React from 'react';

export interface ProgressStatProps {
  label: string;
  value: number; // 0..1
  text?: string;
  color?: string;
}

export const ProgressStat: React.FC<ProgressStatProps> = ({ label, value, text, color = 'var(--purple-600)' }) => {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="muted">{label}</span>
        <span style={{ fontWeight: 600 }}>{text ?? `${Math.round(pct*100)}%`}</span>
      </div>
      <div style={{ width: '100%', height: 8, background: 'var(--purple-100)', borderRadius: 9999 }}>
        <div style={{ width: `${pct*100}%`, height: '100%', background: color, borderRadius: 9999 }} />
      </div>
    </div>
  );
};

export default ProgressStat;


