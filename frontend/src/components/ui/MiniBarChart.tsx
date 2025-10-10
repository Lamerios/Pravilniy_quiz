import React from 'react';

export interface MiniBarChartProps {
  labels: (string | number)[];
  values: number[];
  height?: number;
  color?: string;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({ labels, values, height = 120, color = 'var(--purple-600)' }: MiniBarChartProps) => {
  if (!Array.isArray(values) || values.length === 0) return <div className="muted">Нет данных</div>;
  const finiteVals = values.map(v => (Number.isFinite(v) ? v : 0));
  const max = Math.max(...finiteVals, 1);
  const barWidth = `${Math.max(6, Math.floor(100 / Math.max(1, values.length)))}%`;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {finiteVals.map((v, i) => (
        <div key={i} title={`${labels[i] ?? ''}: ${v}`} style={{ flex: `0 0 ${barWidth}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
          <div style={{ width: '100%', background: 'var(--purple-100)', borderRadius: 6, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', height: `${(v / max) * 100}%`, background: color, borderRadius: 6 }} />
          </div>
          <div className="muted" style={{ fontSize: 10, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labels[i]}</div>
        </div>
      ))}
    </div>
  );
};

export default MiniBarChart;


