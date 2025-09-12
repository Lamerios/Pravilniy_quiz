import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient.ts';
import '../scoreboard/Scoreboard.css';

const TeamsDirectory: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [data, setData] = useState<any>({ items: [], page: 1, total_pages: 1 });

  useEffect(() => {
    (async () => {
      const d = await apiClient.getPublicTeams({ page, limit });
      setData(d);
    })();
  }, [page, limit]);

  return (
    <div>
      <ul>
        {data.items.map((t: any) => (
          <li key={t.id}><Link to={`/team/${t.id}`}>{t.name}</Link></li>
        ))}
      </ul>
      <div className="mt-2" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" disabled={page<=1} onClick={() => setPage(page-1)}>Назад</button>
        <div className="muted">Стр. {data.page} / {data.total_pages}</div>
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

  useEffect(() => {
    (async () => {
      try {
        const [lg, st, rk] = await Promise.all([
          apiClient.getPublicLastGame(),
          apiClient.getPublicStats(),
          apiClient.getPublicRanking({ page: 1, limit: 10 })
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
  }, []);

  const sortedParticipants = useMemo(() => {
    if (!last?.game?.participants || !last?.totalsByTeam) return [];
    const totals = last.totalsByTeam as Record<number, number>;
    return [...last.game.participants].sort((a: any, b: any) => (totals[b.team_id] || 0) - (totals[a.team_id] || 0));
  }, [last]);

  if (loading) return <div className="loading"><p>Загрузка...</p></div>;
  if (error) return <div className="error"><p>{error}</p></div>;

  return (
    <div className="card">
      <div className="card-body">
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
              <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Команда</th>
                      <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => { const order = sort.key === 'games' && sort.order === 'desc' ? 'asc' : 'desc'; setSort({ key: 'games', order: order as any }); setRanking(await apiClient.getPublicRanking({ sort: 'games', order: order as any, page: 1, limit: ranking.limit })); }}>Игр {sort.key==='games'? (sort.order==='asc'?'▲':'▼'):''}</th>
                      <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => { const order = sort.key === 'avg_place' && sort.order === 'asc' ? 'desc' : 'asc'; setSort({ key: 'avg_place', order: order as any }); setRanking(await apiClient.getPublicRanking({ sort: 'avg_place', order: order as any, page: 1, limit: ranking.limit })); }}>Среднее место {sort.key==='avg_place'? (sort.order==='asc'?'▲':'▼'):''}</th>
                      <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => { const order = sort.key === 'total_points' && sort.order === 'desc' ? 'asc' : 'desc'; setSort({ key: 'total_points', order: order as any }); setRanking(await apiClient.getPublicRanking({ sort: 'total_points', order: order as any, page: 1, limit: ranking.limit })); }}>Сумма баллов {sort.key==='total_points'? (sort.order==='asc'?'▲':'▼'):''}</th>
                      <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => { const order = sort.key === 'avg_points' && sort.order === 'desc' ? 'asc' : 'desc'; setSort({ key: 'avg_points', order: order as any }); setRanking(await apiClient.getPublicRanking({ sort: 'avg_points', order: order as any, page: 1, limit: ranking.limit })); }}>Средний итог {sort.key==='avg_points'? (sort.order==='asc'?'▲':'▼'):''}</th>
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
              <div className="mt-2" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" disabled={ranking.page<=1} onClick={async ()=> setRanking(await apiClient.getPublicRanking({ sort: sort.key, order: sort.order, page: ranking.page-1, limit: ranking.limit }))}>Назад</button>
                <div className="muted">Стр. {ranking.page} / {ranking.total_pages}</div>
                <button className="btn btn-secondary" disabled={ranking.page>=ranking.total_pages} onClick={async ()=> setRanking(await apiClient.getPublicRanking({ sort: sort.key, order: sort.order, page: ranking.page+1, limit: ranking.limit }))}>Вперёд</button>
              </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Leaders */}
        {stats ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <div className="card-grid">
                <div className="card">
                  <div className="card-body">
                    <h3>Лидеры по победам</h3>
                    <ul>
                      {stats.leaders_wins?.map((t: any) => (
                        <li key={t.team_id}><Link to={`/team/${t.team_id}`}>{t.team_name}</Link> — {t.wins}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <h3>Лучший средний итог</h3>
                    <ul>
                      {stats.leaders_avg?.map((t: any) => (
                        <li key={t.team_id}><Link to={`/team/${t.team_id}`}>{t.team_name}</Link> — {t.avg_total}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <h3>Лидеры по местам</h3>
                    <ul>
                      {stats.leaders_places?.map((t: any) => (
                        <li key={t.team_id}><Link to={`/team/${t.team_id}`}>{t.team_name}</Link> — 🥇 {t.first_places} · 🥈 {t.second_places} · 🥉 {t.third_places}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Latest games */}
        {stats?.latest_games?.length ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3>Последние игры</h3>
              <ul>
                {stats.latest_games.map((g: any) => (
                  <li key={g.id}><Link to={`/board/${g.id}`}>{g.name}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* All teams paginated - server-side */}
        {true ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3>Все команды</h3>
              <TeamsDirectory />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Home;


