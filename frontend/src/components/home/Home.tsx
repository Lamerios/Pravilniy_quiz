import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient.ts';
import '../scoreboard/Scoreboard.css';

const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [last, setLast] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [lg, st] = await Promise.all([
          apiClient.getPublicLastGame(),
          apiClient.getPublicStats()
        ]);
        setLast(lg);
        setStats(st);
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
                      <th style={{ textAlign: 'center' }}>Игр</th>
                      <th style={{ textAlign: 'center' }}>Среднее место</th>
                      <th style={{ textAlign: 'center' }}>Сумма баллов</th>
                      <th style={{ textAlign: 'center' }}>Средний итог</th>
                      <th style={{ textAlign: 'center' }}>🥇</th>
                      <th style={{ textAlign: 'center' }}>🥈</th>
                      <th style={{ textAlign: 'center' }}>🥉</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.global_ranking?.map((t: any) => (
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

        {/* All teams paginated (client-side simple) */}
        {stats?.global_ranking?.length ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3>Все команды</h3>
              <ul>
                {stats.global_ranking.slice(0, 10).map((t: any) => (
                  <li key={t.team_id}><Link to={`/team/${t.team_id}`}>{t.team_name}</Link></li>
                ))}
              </ul>
              <div className="muted">Пагинация по 10 записей (расширим по необходимости)</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Home;


