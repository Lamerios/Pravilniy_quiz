import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient.ts';

const TeamProfile: React.FC = () => {
  const { teamId } = useParams();
  const id = Number(teamId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiClient.getPublicTeamProfile(id);
        setData(d);
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="loading"><p>Загрузка профиля…</p></div>;
  if (error) return <div className="error"><p>{error}</p></div>;
  if (!data) return <div className="error"><p>Команда не найдена</p></div>;

  const t = data.team;
  return (
    <div className="card">
      <div className="card-body">
        <div className="section-header">
          <h2>{t.name}</h2>
        </div>

        <div className="card-grid">
          <div className="card"><div className="card-body"><h4>Игр</h4><div className="text-2xl">{data.games_played}</div></div></div>
          <div className="card"><div className="card-body"><h4>Сумма</h4><div className="text-2xl">{data.total_points}</div></div></div>
          <div className="card"><div className="card-body"><h4>Средний итог</h4><div className="text-2xl">{data.avg_points}</div></div></div>
          <div className="card"><div className="card-body"><h4>Места</h4><div>🥇 {data.placements.first} · 🥈 {data.placements.second} · 🥉 {data.placements.third}</div></div></div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h3>Последние игры</h3>
            <ul>
              {data.recent_games.map((g: any) => (
                <li key={g.game_id}>
                  <Link to={`/board/${g.game_id}`}>{g.game_name}</Link> — {g.total} баллов (место {g.place})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamProfile;


