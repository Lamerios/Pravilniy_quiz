import React from 'react';

export interface GlobalRankItem {
  title: string;
  minPoints: number;
  description: string;
  icon: string;
  colorTheme: string;
}

interface GlobalRanksProps {
  ranks: GlobalRankItem[];
  current?: GlobalRankItem | null;
  progressPercent?: number; // 0..100
}

const themeToColor: Record<string, string> = {
  yellow: '#fbbf24',
  pink: '#f472b6',
  cyan: '#22d3ee',
  red: '#ef4444',
};

const fallbackEmoji: Record<string, string> = {
  'Сержант': '🪖',
  'Лейтенант': '🎖️',
  'Генерал': '⭐',
  'Рэмбо': '💥',
  'Чак Норрис': '🧱',
  'Недосягаемые': '🚀',
  'Легенда': '👑',
};

export const GlobalRanks: React.FC<GlobalRanksProps> = ({ ranks, current, progressPercent }) => {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          alignItems: 'start',
          width: '100%'
        }}
      >
        {ranks.map((r) => {
          const active = current && r.title === current.title;
          const color = themeToColor[r.colorTheme] || '#a78bfa';
          return (
            <div
              key={r.title}
              className="rank-card"
              style={{
                borderRadius: 12,
                padding: 12,
                border: `1px solid ${active ? color : 'var(--border-color)'}`,
                boxShadow: active ? `0 0 18px ${color}66` : 'none',
                background: 'var(--bg-secondary)',
                transition: 'transform .15s ease, box-shadow .15s ease',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                if (!active) e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = active ? `0 0 18px ${color}66` : 'none';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '8px' }}>
                <div style={{ width: '100%', height: 30, borderRadius: 4, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {r.icon ? (
                    <img
                      alt="icon"
                      src={`/uploads/ranks/${r.icon}`}
                      style={{ width: '100%', height: 30, display: 'block', objectFit: 'contain', imageRendering: 'pixelated' as any }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        const parent = (e.currentTarget.parentElement as HTMLElement);
                        if (parent && !parent.querySelector('.emoji-fallback')) {
                          const span = document.createElement('span');
                          span.className = 'emoji-fallback';
                          span.textContent = fallbackEmoji[r.title] || '🏆';
                          span.style.fontSize = '20px';
                          parent.appendChild(span);
                        }
                      }}
                    />
                  ) : (
                    <span className="emoji-fallback" style={{ fontSize: 20 }}>{fallbackEmoji[r.title] || '🏆'}</span>
                  )}
                </div>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{r.title}</div>
                  <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>от {r.minPoints} очков</div>
                </div>
                <div className="muted" style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.2, width: '100%' }}>{r.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {typeof progressPercent === 'number' ? (
        <div style={{ marginTop: 8 }}>
          <div className="muted" style={{ marginBottom: 4 }}>Прогресс до следующего звания</div>
          <div style={{ height: 10, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #22d3ee, #f472b6, #fbbf24)',
                transition: 'width .4s ease',
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GlobalRanks;


