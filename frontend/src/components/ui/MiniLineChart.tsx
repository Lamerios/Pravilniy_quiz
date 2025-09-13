import React from 'react';

export interface MiniLineChartProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}

export const MiniLineChart: React.FC<MiniLineChartProps> = ({
  data,
  width = 180,
  height = 48,
  stroke = 'var(--purple-600)',
  fill = 'rgba(167, 139, 250, 0.2)'
}) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="muted">Нет данных</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={areaPoints} fill={fill} stroke="none" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export default MiniLineChart;


