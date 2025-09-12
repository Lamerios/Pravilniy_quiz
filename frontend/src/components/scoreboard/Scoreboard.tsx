/**
 * Public Scoreboard component
 * Shows live results for a game with per-round and total scores
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Game, RoundScore } from '../../../../shared/types';
import { apiClient } from '../../services/apiClient.ts';
import { io as socketIO, Socket } from 'socket.io-client';

const Scoreboard: React.FC = () => {
  const params = useParams();
  const gameId = Number(params.gameId);

  const [game, setGame] = useState<Game | null>(null);
  const [scores, setScores] = useState<RoundScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const rounds = useMemo(() => {
    const list = game?.template?.rounds || [];
    if (list.length > 0) return [...list].sort((a, b) => a.round_number - b.round_number);
    const maxRound = scores.length > 0 ? Math.max(...scores.map(s => s.round_number)) : 1;
    return Array.from({ length: maxRound }, (_, i) => ({ id: i + 1, template_id: game?.template_id || 0, round_number: i + 1, name: `Раунд ${i + 1}`, max_score: 0 }));
  }, [game, scores]);

  const participants = useMemo(() => game?.participants || [], [game]);

  const byRound = useMemo(() => {
    const map: Record<number, Record<number, number>> = {};
    scores.forEach(s => {
      if (!map[s.round_number]) map[s.round_number] = {};
      map[s.round_number][s.team_id] = s.score;
    });
    return map;
  }, [scores]);

  const totalsByTeam: Record<number, number> = useMemo(() => {
    const totals: Record<number, number> = {};
    participants.forEach(p => { totals[p.team_id] = 0; });
    Object.keys(byRound).forEach(rKey => {
      const r = Number(rKey);
      const roundMap = byRound[r] || {};
      participants.forEach(p => {
        const val = Number(roundMap[p.team_id] || 0);
        totals[p.team_id] += val;
      });
    });
    Object.keys(totals).forEach(k => { totals[Number(k)] = Math.round(totals[Number(k)] * 10) / 10; });
    return totals;
  }, [byRound, participants]);

  const sortedTeams = useMemo(() => {
    const roundNumbers = rounds.map(r => r.round_number).sort((a, b) => a - b);
    const getRoundScore = (teamId: number, rn: number) => Number(byRound[rn]?.[teamId] || 0);
    return [...participants].sort((a, b) => {
      const ta = totalsByTeam[a.team_id] || 0;
      const tb = totalsByTeam[b.team_id] || 0;
      if (Math.abs(tb - ta) > 1e-9) return tb - ta;
      for (let i = roundNumbers.length - 1; i >= 0; i--) {
        const diff = getRoundScore(b.team_id, roundNumbers[i]) - getRoundScore(a.team_id, roundNumbers[i]);
        if (Math.abs(diff) > 1e-9) return diff;
      }
      return 0;
    });
  }, [participants, totalsByTeam, byRound, rounds]);

  const overallRanks: Record<number, number> = useMemo(() => {
    const roundNumbers = rounds.map(r => r.round_number).sort((a, b) => a - b);
    const getRoundScore = (teamId: number, rn: number) => Number(byRound[rn]?.[teamId] || 0);
    const rows = participants.map(p => ({ team_id: p.team_id, total: totalsByTeam[p.team_id] || 0, tieKey: roundNumbers.map(rn => getRoundScore(p.team_id, rn)) }));
    rows.sort((a, b) => {
      if (Math.abs(b.total - a.total) > 1e-9) return b.total - a.total;
      for (let i = roundNumbers.length - 1; i >= 0; i--) {
        const diff = b.tieKey[i] - a.tieKey[i];
        if (Math.abs(diff) > 1e-9) return diff;
      }
      return 0;
    });
    const map: Record<number, number> = {};
    let currentRank = 0;
    let last: typeof rows[number] | null = null;
    rows.forEach((row, idx) => {
      const equal = last && Math.abs(row.total - last.total) <= 1e-9 && row.tieKey.every((v, i) => Math.abs(v - (last as any).tieKey[i]) <= 1e-9);
      if (!equal) currentRank = idx + 1;
      map[row.team_id] = currentRank;
      last = row;
    });
    return map;
  }, [participants, totalsByTeam, rounds, byRound]);

  // Move leaders useMemo above any early returns to keep hook order stable
  const leaders = useMemo(() => {
    const top = sortedTeams.slice(0, 3);
    return top.map((p, idx) => ({
      place: idx + 1,
      participant: p,
      total: totalsByTeam[p.team_id] || 0,
    }));
  }, [sortedTeams, totalsByTeam]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [g, sc] = await Promise.all([apiClient.getGame(gameId), apiClient.getScores(gameId)]);
      setGame(g);
      setScores(sc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить табло');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(gameId)) return;
    load();
  }, [gameId]);

  useEffect(() => {
    if (!Number.isFinite(gameId)) return;
    const socket: Socket = socketIO(process.env.REACT_APP_API_URL || 'http://localhost:5001', { transports: ['websocket'] });
    socket.emit('join-game', gameId);
    const handleScores = (updated: RoundScore[]) => setScores(updated);
    socket.on('scores-updated', handleScores);
    return () => {
      socket.emit('leave-game', gameId);
      socket.disconnect();
    };
  }, [gameId]);

  if (!Number.isFinite(gameId)) {
    return <div className="error"><p>Некорректный идентификатор игры</p></div>;
  }

  if (loading) {
    return <div className="loading"><p>Загрузка табло...</p></div>;
  }

  if (error) {
    return <div className="error"><p>{error}</p></div>;
  }

  if (!game) {
    return <div className="error"><p>Игра не найдена</p></div>;
  }

  const roundNumbers = rounds.map(r => r.round_number);

  return (
    <div className="scoreboard" style={{ padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{game.name}</h2>
        {game.event_date ? <div className="muted">Дата проведения: {new Date(game.event_date).toLocaleString()}</div> : null}
      </header>

      {/* Leaders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
        {leaders.map(({ place, participant, total }) => {
          const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
          const bg = place === 1 ? '#fff7d6' : place === 2 ? '#f0f4ff' : '#fff0f0';
          return (
            <div key={participant.id} className="card" style={{ background: bg }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28 }}>{medal}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {participant.team?.logo_path ? (
                      <img alt="logo" src={`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/uploads/${participant.team.logo_path}`} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                    ) : null}
                    <strong>{participant.team?.name || `Команда #${participant.team_id}`}</strong>
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    Стол: {participant.table_number || '—'} • Итого: {total}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Место</th>
                  <th style={{ textAlign: 'left' }}>Команда</th>
                  <th style={{ textAlign: 'left' }}>Номер стола</th>
                  <th style={{ textAlign: 'left' }}>Участники</th>
                  {roundNumbers.map(rn => (
                    <th key={`r${rn}`} style={{ textAlign: 'left' }}>R{rn}</th>
                  ))}
                  <th style={{ textAlign: 'left' }}>Итого</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((p) => (
                  <tr key={p.id}>
                    <td>{overallRanks[p.team_id]}</td>
                    <td>
                      {p.team?.logo_path ? (
                        <img alt="logo" src={`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/uploads/${p.team.logo_path}`} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, marginRight: 6, verticalAlign: 'middle' }} />
                      ) : null}
                      <strong>{p.team?.name || `Команда #${p.team_id}`}</strong>
                    </td>
                    <td>{p.table_number || '—'}</td>
                    <td>{(p as any).participants_count ?? '—'}</td>
                    {roundNumbers.map(rn => (
                      <td key={`c${p.id}_${rn}`}>{Number(byRound[rn]?.[p.team_id] || 0)}</td>
                    ))}
                    <td><strong>{totalsByTeam[p.team_id] || 0}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
