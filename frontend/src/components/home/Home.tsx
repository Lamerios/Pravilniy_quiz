import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from 'services/apiClient';
import '../scoreboard/Scoreboard.css';
import { Card, Avatar } from 'ui';

const TeamsDirectory: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [data, setData] = useState<any>({ items: [], page: 1, total_pages: 1 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    (async () => {
      const d = await apiClient.getPublicTeams({ page, limit });
      setData(d);
    })();
  }, [page, limit]);

  // На мобильных - одна колонка, на десктопе - 3 колонки
  const columns: any[][] = useMemo(() => {
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    if (isMobile) {
      return [items]; // Одна колонка на мобильных
    }
    // Разбить по колонкам: 3 колонки, по 5 команд в каждой
    const result: any[][] = [[], [], []];
    for (let i = 0; i < items.length; i++) {
      const colIndex = Math.floor(i / 5); // 0,1,2
      if (colIndex < 3) result[colIndex].push(items[i]);
    }
    return result;
  }, [data.items, isMobile]);

  return (
    <div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
        gap: 'var(--space-lg)' 
      }}>
        {columns.map((col, cIdx) => (
          <div key={`col-${cIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {col.map((t: any) => (
              <Card key={t.id}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar src={t.logo_path || t.logo} name={t.name} size={40} rounded={10} />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <Link to={`/team/${t.id}`} style={{ fontWeight: 600, wordBreak: 'break-word' }}>{t.name}</Link>
                    {t.created_at ? (<span className="muted" style={{ fontSize: 12 }}>Создана: {new Date(t.created_at).toLocaleDateString()}</span>) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" disabled={page<=1} onClick={() => setPage(page-1)}>Назад</button>
        <div className="muted" style={{ display: 'flex', alignItems: 'center' }}>Стр. {data.page} / {data.total_pages}</div>
        <button className="btn btn-secondary" disabled={page>=data.total_pages} onClick={() => setPage(page+1)}>Вперёд</button>
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [last, setLast] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [ranking, setRanking] = useState<any>({ items: [], page: 1, limit: 10, total: 0, total_pages: 1 });
  const [teamsPage, setTeamsPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'total_points', order: 'desc' });
  const [season, setSeason] = useState<number>(2026);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [lg, st, rk] = await Promise.all([
          apiClient.getPublicLastGame(),
          apiClient.getPublicStats(season),
          apiClient.getPublicRanking({ page: 1, limit: 10, season })
        ]);
        setLast(lg);
        setStats(st);
        setRanking(rk);
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    })();
  }, [season]);

  const sortedParticipants = useMemo(() => {
    if (!last?.game?.participants || !last?.totalsByTeam) return [];
    const totals = last.totalsByTeam as Record<number, number>;
    return [...last.game.participants].sort((a: any, b: any) => (totals[b.team_id] || 0) - (totals[a.team_id] || 0));
  }, [last]);

  const topGold = useMemo(() => {
    const list = (stats?.leaders_places || []) as any[];
    return [...list].sort((a, b) => (b.first_places || 0) - (a.first_places || 0)).slice(0, 5);
  }, [stats]);

  const topSilver = useMemo(() => {
    const list = (stats?.leaders_places || []) as any[];
    return [...list].sort((a, b) => (b.second_places || 0) - (a.second_places || 0)).slice(0, 5);
  }, [stats]);

  const topBronze = useMemo(() => {
    const list = (stats?.leaders_places || []) as any[];
    return [...list].sort((a, b) => (b.third_places || 0) - (a.third_places || 0)).slice(0, 5);
  }, [stats]);

  const latestGamesColumns: any[][] = useMemo(() => {
    const items: any[] = Array.isArray(stats?.latest_games) ? (stats!.latest_games as any[]).slice(0, 15) : [];
    const cols: any[][] = [[], [], []];
    // Распределение по колонкам "по кругу" (баланс 4/3/3, 5/5/5 и т.д.), максимум 5 на колонку
    let col = 0;
    for (const it of items) {
      // найдём следующую колонку с местом (<5)
      let attempts = 0;
      while (cols[col].length >= 5 && attempts < 3) {
        col = (col + 1) % 3;
        attempts++;
      }
      if (cols[col].length < 5) cols[col].push(it);
      col = (col + 1) % 3;
    }
    return cols;
  }, [stats]);

  if (loading) return <div className="loading"><p>Загрузка...</p></div>;
  if (error) return <div className="error"><p>{error}</p></div>;

  return (
    <div className="card">
      <div className="card-body">
        {/* Season selector - Golden UX */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'inline-flex', 
            gap: 8, 
            padding: 4, 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: 12,
            border: '2px solid #fbbf24',
            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.25)'
          }}>
            <button
              onClick={() => setSeason(2026)}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: season === 2026 ? 700 : 500,
                fontSize: '15px',
                transition: 'all 0.2s ease',
                background: season === 2026 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' 
                  : 'transparent',
                color: season === 2026 ? '#fff' : '#92400e',
                boxShadow: season === 2026 
                  ? '0 4px 12px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                  : 'none',
                transform: season === 2026 ? 'scale(1.02)' : 'scale(1)',
                textShadow: season === 2026 ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (season !== 2026) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
                  e.currentTarget.style.color = '#78350f';
                }
              }}
              onMouseLeave={(e) => {
                if (season !== 2026) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#92400e';
                }
              }}
            >
              Сезон 2026
            </button>
            <button
              onClick={() => setSeason(2025)}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: season === 2025 ? 700 : 500,
                fontSize: '15px',
                transition: 'all 0.2s ease',
                background: season === 2025 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' 
                  : 'transparent',
                color: season === 2025 ? '#fff' : '#92400e',
                boxShadow: season === 2025 
                  ? '0 4px 12px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                  : 'none',
                transform: season === 2025 ? 'scale(1.02)' : 'scale(1)',
                textShadow: season === 2025 ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (season !== 2025) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
                  e.currentTarget.style.color = '#78350f';
                }
              }}
              onMouseLeave={(e) => {
                if (season !== 2025) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#92400e';
                }
              }}
            >
              Сезон 2025
            </button>
          </div>
        </div>
        {/* Top summary */}
        {stats ? (
          <div className="card-grid" style={{ marginBottom: 16 }}>
            <div className="card"><div className="card-body"><h3>Проведено игр</h3><div className="text-3xl">{stats.total_games}</div></div></div>
            <div className="card"><div className="card-body"><h3>Команды</h3><div className="text-3xl">{stats.total_teams}</div></div></div>
            <div className="card"><div className="card-body"><h3>Сумма баллов</h3><div className="text-3xl">{stats.total_points}</div></div></div>
          </div>
        ) : null}

        {/* Global ranking with sorting */}
        {stats ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <div className="section-header"><h2>Общий рейтинг команд</h2></div>
              {isMobile ? (
                // Мобильная версия - карточки
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {ranking.items?.map((t: any) => (
                    <Card key={t.team_id}>
                      <div className="card-body">
                        <div style={{ marginBottom: 12 }}>
                          <Link to={`/team/${t.team_id}`} style={{ fontSize: '1.1em', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                            {t.team_name}
                          </Link>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.9em' }}>
                          <div><strong>Игр:</strong> {t.games}</div>
                          <div><strong>Ср. место:</strong> {t.avg_place}</div>
                          <div><strong>Сумма:</strong> {t.total_points}</div>
                          <div><strong>Ср. итог:</strong> {t.avg_points}</div>
                          <div><strong>🥇:</strong> {t.first_places}</div>
                          <div><strong>🥈:</strong> {t.second_places}</div>
                          <div><strong>🥉:</strong> {t.third_places}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                // Десктопная версия - таблица
                <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Команда</th>
                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => { const order = sort.key === 'games' && sort.order === 'desc' ? 'asc' : 'desc'; setSort({ key: 'games', order: order as any }); setRanking(await apiClient.getPublicRanking({ sort: 'games', order: order as any, page: 1, limit: ranking.limit, season })); }}>Игр {sort.key==='games'? (sort.order==='asc'?'▲':'▼'):''}</th>
                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => { const order = sort.key === 'avg_place' && sort.order === 'asc' ? 'desc' : 'asc'; setSort({ key: 'avg_place', order: order as any }); setRanking(await apiClient.getPublicRanking({ sort: 'avg_place', order: order as any, page: 1, limit: ranking.limit, season })); }}>Среднее место {sort.key==='avg_place'? (sort.order==='asc'?'▲':'▼'):''}</th>
                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => { const order = sort.key === 'total_points' && sort.order === 'desc' ? 'asc' : 'desc'; setSort({ key: 'total_points', order: order as any }); setRanking(await apiClient.getPublicRanking({ sort: 'total_points', order: order as any, page: 1, limit: ranking.limit, season })); }}>Сумма баллов {sort.key==='total_points'? (sort.order==='asc'?'▲':'▼'):''}</th>
                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => { const order = sort.key === 'avg_points' && sort.order === 'desc' ? 'asc' : 'desc'; setSort({ key: 'avg_points', order: order as any }); setRanking(await apiClient.getPublicRanking({ sort: 'avg_points', order: order as any, page: 1, limit: ranking.limit, season })); }}>Средний итог {sort.key==='avg_points'? (sort.order==='asc'?'▲':'▼'):''}</th>
                        <th style={{ textAlign: 'center' }}>🥇</th>
                        <th style={{ textAlign: 'center' }}>🥈</th>
                        <th style={{ textAlign: 'center' }}>🥉</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.items?.map((t: any) => (
                        <tr key={t.team_id}>
                          <td><Link to={`/team/${t.team_id}`}>{t.team_name}</Link></td>
                          <td style={{ textAlign: 'center' }}>{t.games}</td>
                          <td style={{ textAlign: 'center' }}>{t.avg_place}</td>
                          <td style={{ textAlign: 'center' }}>{t.total_points}</td>
                          <td style={{ textAlign: 'center' }}>{t.avg_points}</td>
                          <td style={{ textAlign: 'center' }}>{t.first_places}</td>
                          <td style={{ textAlign: 'center' }}>{t.second_places}</td>
                          <td style={{ textAlign: 'center' }}>{t.third_places}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-2" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 16 }}>
                <button className="btn btn-secondary" disabled={ranking.page<=1} onClick={async ()=> setRanking(await apiClient.getPublicRanking({ sort: sort.key, order: sort.order, page: ranking.page-1, limit: ranking.limit, season }))}>Назад</button>
                <div className="muted" style={{ display: 'flex', alignItems: 'center' }}>Стр. {ranking.page} / {ranking.total_pages}</div>
                <button className="btn btn-secondary" disabled={ranking.page>=ranking.total_pages} onClick={async ()=> setRanking(await apiClient.getPublicRanking({ sort: sort.key, order: sort.order, page: ranking.page+1, limit: ranking.limit, season }))}>Вперёд</button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Лидеры по местам: 3 блока после общего рейтинга */}
        {stats ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <div className="section-header"><h3>Лидеры по местам</h3></div>
              <div className="card-grid" style={{ 
                marginTop: 12,
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: 'var(--space-md)'
              }}>
                <div className="card">
                  <div className="card-body">
                    <h4>🥇 Золото</h4>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {topGold.map((t: any) => (
                        <li key={`gold-${t.team_id}`} style={{ marginBottom: 8 }}>
                          <Link to={`/team/${t.team_id}`} style={{ wordBreak: 'break-word' }}>{t.team_name}</Link> — {t.first_places}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <h4>🥈 Серебро</h4>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {topSilver.map((t: any) => (
                        <li key={`silver-${t.team_id}`} style={{ marginBottom: 8 }}>
                          <Link to={`/team/${t.team_id}`} style={{ wordBreak: 'break-word' }}>{t.team_name}</Link> — {t.second_places}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <h4>🥉 Бронза</h4>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {topBronze.map((t: any) => (
                        <li key={`bronze-${t.team_id}`} style={{ marginBottom: 8 }}>
                          <Link to={`/team/${t.team_id}`} style={{ wordBreak: 'break-word' }}>{t.team_name}</Link> — {t.third_places}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* All teams paginated - server-side (подняли выше последних игр) */}
        {true ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3>Все команды</h3>
              <TeamsDirectory />
            </div>
          </div>
        ) : null}

        {/* Latest games */}
        {stats?.latest_games?.length ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3>Последние игры</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
                gap: 'var(--space-lg)', 
                marginTop: 12 
              }}>
                {latestGamesColumns.map((col, cIdx) => (
                  <div key={`lg-col-${cIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {col.map((g: any) => (
                      <Card key={g.id}>
                        <div className="card-body">
                          <Link to={`/board/${g.id}`} style={{ wordBreak: 'break-word' }}>{g.name}</Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Home;


