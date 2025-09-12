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
        <div className="section-header">
          <h2>Публичная страница</h2>
        </div>

        {/* Last game widget */}
        {last?.game ? (
          <div className="card scoreboard-table" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{last.game.name}</h3>
                <Link className="btn btn-primary" to={`/board/${last.game.id}`}>Открыть табло</Link>
              </div>
              <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: 56 }}>🏆</th>
                      <th style={{ textAlign: 'left' }}>Команда</th>
                      <th style={{ textAlign: 'center', width: 64 }}>👥</th>
                      <th style={{ textAlign: 'center', minWidth: 80 }}>Итого</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParticipants.map((p: any, idx: number) => (
                      <tr key={p.id}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                        <td>
                          <Link to={`/team/${p.team_id}`} className="team-name-text">
                            {p.team?.name || `Команда #${p.team_id}`}
                          </Link>
                        </td>
                        <td style={{ textAlign: 'center' }}>{(p as any).participants_count ?? '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{last.totalsByTeam[p.team_id] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">Пока нет игр</div>
        )}

        {/* Stats cards */}
        {stats ? (
          <div className="card-grid">
            <div className="card"><div className="card-body"><h3>Проведено игр</h3><div className="text-3xl">{stats.total_games}</div></div></div>
            <div className="card"><div className="card-body"><h3>Суммарные баллы</h3><div className="text-3xl">{stats.total_points}</div></div></div>
          </div>
        ) : null}

        {/* Leaderboards */}
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
      </div>
    </div>
  );
};

export default Home;


