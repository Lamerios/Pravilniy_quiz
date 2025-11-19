import React, { useMemo } from 'react';

interface TrendsProps {
  timeline: Array<{ game_id: number; date: string | null; total: number; place: number }>;
  monthly: Array<{ month: string; avg_total: number; median_place: number; games: number }>;
  trend_score_delta: number;
}

export const PerformanceTrends: React.FC<TrendsProps> = ({ timeline, monthly, trend_score_delta }) => {
  const points = useMemo(() => timeline.map(t => ({ x: t.date ? new Date(t.date) : new Date(), score: t.total, place: t.place })), [timeline]);
  const color = trend_score_delta >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h3 style={{ marginTop: 0 }}>Динамика по играм</h3>
        <div className="muted">Тренд: <b style={{ color }}>{trend_score_delta >= 0 ? '+' : ''}{trend_score_delta}</b></div>
      </div>

      {/* Простейший инлайновый график без сторонних либ (пока) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-body">
            <div className="muted" style={{ marginBottom: 6 }}>Баллы по времени</div>
            <svg viewBox="0 0 600 180" width="100%" height="180" style={{ background: 'var(--bg-secondary)', borderRadius: 8 }}>
              {(() => {
                if (points.length === 0) return null;
                const minX = 0;
                const maxX = points.length - 1;
                const minY = Math.min(...points.map(p => p.score));
                const maxY = Math.max(...points.map(p => p.score));
                const x = (i: number) => 20 + (560 * (i - minX)) / (maxX - minX || 1);
                const y = (v: number) => 160 - (130 * (v - minY)) / ((maxY - minY) || 1);
                const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.score)}`).join(' ');
                return (
                  <>
                    <path d={d} fill="none" stroke="#3b82f6" strokeWidth="2" />
                    {points.map((p, i) => (
                      <circle key={i} cx={x(i)} cy={y(p.score)} r={3} fill="#3b82f6" />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="muted" style={{ marginBottom: 6 }}>Места по времени</div>
            <svg viewBox="0 0 600 180" width="100%" height="180" style={{ background: 'var(--bg-secondary)', borderRadius: 8 }}>
              {(() => {
                if (points.length === 0) return null;
                const minX = 0;
                const maxX = points.length - 1;
                const minY = Math.min(...points.map(p => p.place));
                const maxY = Math.max(...points.map(p => p.place));
                const x = (i: number) => 20 + (560 * (i - minX)) / (maxX - minX || 1);
                const y = (v: number) => 160 - (130 * (v - minY)) / ((maxY - minY) || 1);
                const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.place)}`).join(' ');
                return (
                  <>
                    <path d={d} fill="none" stroke="#a855f7" strokeWidth="2" />
                    {points.map((p, i) => (
                      <circle key={i} cx={x(i)} cy={y(p.place)} r={3} fill="#a855f7" />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted" style={{ marginBottom: 6 }}>Агрегаты по месяцам</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {monthly.map(m => (
            <div key={m.month} className="card" style={{ background: 'var(--bg-secondary)' }}>
              <div className="card-body">
                <div style={{ fontWeight: 700 }}>{m.month}</div>
                <div className="muted">игр: {m.games}</div>
                <div>ср. баллы: <b>{m.avg_total}</b></div>
                <div>медиана места: <b>{m.median_place}</b></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceTrends;




