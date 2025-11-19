/**
 * Game Manager component
 * Controls: show all rounds at once according to template,
 * per-round save, cumulative totals, and editable scores with live recompute
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Game, RoundScore, TemplateRound, GameParticipant, Team } from '../../../../shared/types';
import { apiClient } from '../../services/apiClient';
import { io as socketIO, Socket } from 'socket.io-client';
import './GameManager.css';

interface GameManagerProps {
  gameId: number;
  onBack: () => void;
}

type RoundNumber = number;

type ScoreInputs = Record<RoundNumber, Record<number /* team_id */, string>>;

type SavingState = Record<RoundNumber, boolean>;

type EditingState = Record<RoundNumber, boolean>;

type SavedFlagState = Record<RoundNumber, boolean>;

type RanksByRound = Record<RoundNumber, Record<number /* team_id */, number /* rank */>>;

const decimalPattern = /^-?\d{0,3}([\.,]\d{0,1})?$/; // allow optional '-', up to one decimal digit, permits trailing separator

const GameManager: React.FC<GameManagerProps> = ({ gameId, onBack }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [scores, setScores] = useState<RoundScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [savingByRound, setSavingByRound] = useState<SavingState>({});

  const [scoreInputs, setScoreInputs] = useState<ScoreInputs>({});
  const [isEditingByRound, setIsEditingByRound] = useState<EditingState>({});
  const [savedFlagByRound, setSavedFlagByRound] = useState<SavedFlagState>({});

  const participants = useMemo(() => game?.participants || [], [game]);

  const rounds: TemplateRound[] = useMemo(() => {
    const tplRounds = game?.template?.rounds || [];
    if (tplRounds.length > 0) {
      return [...tplRounds].sort((a, b) => a.round_number - b.round_number);
    }
    const maxFromScores = scores.length > 0 ? Math.max(...scores.map(s => s.round_number)) : 1;
    const maxNum = Math.max(1, game?.current_round || 1, maxFromScores);
    return Array.from({ length: maxNum }, (_, i) => ({
      id: i + 1,
      template_id: game?.template_id || 0,
      round_number: i + 1,
      name: `Раунд ${i + 1}`,
      max_score: 0,
    }));
  }, [game, scores]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [g, sc] = await Promise.all([
        apiClient.getGame(gameId),
        apiClient.getScores(gameId),
      ]);
      setGame(g);
      setScores(sc);
      const localParticipants = g.participants || [];
      const inputs: ScoreInputs = {};
      const byRound: Record<number, RoundScore[]> = {};
      sc.forEach((s: RoundScore) => {
        if (!byRound[s.round_number]) byRound[s.round_number] = [];
        byRound[s.round_number].push(s);
      });
      const roundList = g.template?.rounds?.map((r: TemplateRound) => r.round_number) || [];
      const maxRound = roundList.length > 0 ? Math.max(...roundList) : (sc.length > 0 ? Math.max(...sc.map((s: RoundScore) => s.round_number)) : Math.max(1, g.current_round || 1));
      const maxByRound: Record<number, number | null> = {};
      (g.template?.rounds || []).forEach((r: TemplateRound) => { maxByRound[r.round_number] = typeof r.max_score === 'number' ? r.max_score : null; });
      const editing: EditingState = {};
      const savedFlags: SavedFlagState = {};
      for (let r = 1; r <= maxRound; r++) {
        inputs[r] = {};
        const roundScores = byRound[r] || [];
        const hasAny = roundScores.length > 0;
        localParticipants.forEach((p: GameParticipant) => {
          const found = roundScores.find(s => s.team_id === p.team_id);
          let val = found ? Number(found.score) : NaN;
          if (!Number.isFinite(val)) val = 0;
          const max = maxByRound[r] ?? null;
          if (max !== null && val > max) val = max;
          inputs[r][p.team_id] = String(Math.round(val * 10) / 10);
        });
        editing[r] = !hasAny;
        savedFlags[r] = hasAny;
      }
      setScoreInputs(inputs);
      setIsEditingByRound(editing);
      setSavedFlagByRound(savedFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных игры');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [gameId]);

  useEffect(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : undefined;
    const socket: Socket = base ? socketIO(base, { transports: ['websocket'] }) : socketIO({ transports: ['websocket'] });
    socket.emit('join-game', gameId);

    const handleScores = (updated: RoundScore[]) => {
      setScores(updated);
      const byRound: Record<number, RoundScore[]> = {};
      updated.forEach(s => { if (!byRound[s.round_number]) byRound[s.round_number] = []; byRound[s.round_number].push(s); });
      setScoreInputs(prev => {
        const next = { ...prev } as ScoreInputs;
        Object.keys(next).forEach(rKey => {
          const r = Number(rKey);
          const list = byRound[r] || [];
          list.forEach(s => {
            if (!next[r]) next[r] = {} as any;
            if (!next[r][s.team_id] || next[r][s.team_id] === '') {
              next[r][s.team_id] = String(s.score);
            }
          });
        });
        return { ...next };
      });
    };

    socket.on('scores-updated', handleScores);
    socket.on('game-updated', (g: Game) => {
      setGame(g);
    });

    return () => {
      socket.emit('leave-game', gameId);
      socket.disconnect();
    };
  }, [gameId]);

  const refreshScores = async () => {
    const sc = await apiClient.getScores(gameId);
    setScores(sc);
  };

  const getMaxForRound = (roundNumber: number): number | null => {
    const r = rounds.find(x => x.round_number === roundNumber);
    return r ? (typeof r.max_score === 'number' ? r.max_score : null) : null;
  };

  const parseInputToNumber = (value: string): number => {
    if (value === '' || value === undefined || value === '-' || value === '-,' || value === '-.') return 0;
    const normalized = value.replace(',', '.');
    const num = Number(normalized);
    if (!Number.isFinite(num)) return 0;
    return Math.round(num * 10) / 10;
  };

  const setInput = (round: number, teamId: number, value: string) => {
    if (value === '' || decimalPattern.test(value)) {
      const max = getMaxForRound(round);
      let v = value;
      if (max !== null) {
        const num = parseInputToNumber(value);
        if (num > max) {
          v = String(max);
        }
      }
      setScoreInputs(prev => ({
        ...prev,
        [round]: { ...(prev[round] || {}), [teamId]: v },
      }));
    }
  };

  // removed start/finish handlers and general saving state

  const saveRound = async (roundNumber: number) => {
    if (!game) return;
    try {
      setSavingByRound(prev => ({ ...prev, [roundNumber]: true }));
      const inputs = scoreInputs[roundNumber] || {};
      const max = getMaxForRound(roundNumber);
      const tasks = participants.map(p => {
        const raw = inputs[p.team_id];
        let num = parseInputToNumber(raw);
        if (max !== null && num > max) num = max;
        return apiClient.upsertScore(game.id, { team_id: p.team_id, round_number: roundNumber, score: num });
      });
      await Promise.all(tasks);
      // Refresh and lock round
      await refreshScores();
      setIsEditingByRound(prev => ({ ...prev, [roundNumber]: false }));
      setSavedFlagByRound(prev => ({ ...prev, [roundNumber]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить результаты раунда');
    } finally {
      setSavingByRound(prev => ({ ...prev, [roundNumber]: false }));
    }
  };

  const enableEditRound = (roundNumber: number) => {
    setIsEditingByRound(prev => ({ ...prev, [roundNumber]: true }));
  };

  // Compute totals live from inputs (persist 0 for empty)
  const totalsByTeam: Record<number, number> = useMemo(() => {
    const totals: Record<number, number> = {};
    participants.forEach(p => { totals[p.team_id] = 0; });
    Object.keys(scoreInputs).forEach(rKey => {
      const round = Number(rKey);
      const map = scoreInputs[round] || {};
      participants.forEach(p => {
        const raw = map[p.team_id];
        const val = parseInputToNumber(raw);
        totals[p.team_id] += val;
      });
    });
    // round to one decimal place for display consistency
    Object.keys(totals).forEach(k => { totals[Number(k)] = Math.round(totals[Number(k)] * 10) / 10; });
    return totals;
  }, [scoreInputs, participants]);

  // Compute ranks per round based on current inputs (desc, ties share same rank)
  const ranksByRound: RanksByRound = useMemo(() => {
    const result: RanksByRound = {};
    Object.keys(scoreInputs).forEach(rKey => {
      const round = Number(rKey);
      const map = scoreInputs[round] || {};
      const entries = participants.map(p => ({ team_id: p.team_id, score: parseInputToNumber(map[p.team_id]) }));
      entries.sort((a, b) => b.score - a.score);
      const rankMap: Record<number, number> = {};
      let currentRank = 0;
      let lastScore: number | null = null;
      entries.forEach((e, idx) => {
        if (lastScore === null || e.score < lastScore) {
          currentRank = idx + 1;
          lastScore = e.score;
        }
        rankMap[e.team_id] = currentRank;
      });
      result[round] = rankMap;
    });
    return result;
  }, [scoreInputs, participants]);

  // Compute overall ranks based on totals with tie-break by last rounds backward
  const overallRanks: Record<number, number> = useMemo(() => {
    const roundNumbers = [...new Set(rounds.map(r => r.round_number))].sort((a, b) => a - b);

    const getRoundScore = (teamId: number, roundNumber: number): number => {
      const raw = scoreInputs[roundNumber]?.[teamId];
      return parseInputToNumber(raw);
    };

    type Row = { team_id: number; total: number; tieKey: number[] };
    const rows: Row[] = participants.map(p => ({
      team_id: p.team_id,
      total: totalsByTeam[p.team_id] || 0,
      tieKey: roundNumbers.map(rn => getRoundScore(p.team_id, rn)),
    }));

    rows.sort((a, b) => {
      // primary: total desc
      if (Math.abs(b.total - a.total) > 1e-9) return b.total - a.total;
      // tie-break: compare from last round to first
      for (let i = roundNumbers.length - 1; i >= 0; i--) {
        const diff = b.tieKey[i] - a.tieKey[i];
        if (Math.abs(diff) > 1e-9) return diff;
      }
      return 0;
    });

    const rankMap: Record<number, number> = {};
    let currentRank = 0;
    let last: Row | null = null;
    rows.forEach((row, idx) => {
      const isEqual = last && Math.abs(row.total - last.total) <= 1e-9 && row.tieKey.every((v, i) => Math.abs(v - (last as Row).tieKey[i]) <= 1e-9);
      if (!isEqual) {
        currentRank = idx + 1;
      }
      rankMap[row.team_id] = currentRank;
      last = row;
    });
    return rankMap;
  }, [participants, totalsByTeam, scoreInputs, rounds]);

  // Sorted teams for totals table according to rank and tiebreakers
  const sortedParticipantsForTotals = useMemo(() => {
    const roundNumbers = [...new Set(rounds.map(r => r.round_number))].sort((a, b) => a - b);
    const getRoundScore = (teamId: number, roundNumber: number): number => parseInputToNumber(scoreInputs[roundNumber]?.[teamId]);
    return [...participants].sort((pa, pb) => {
      const ta = totalsByTeam[pa.team_id] || 0;
      const tb = totalsByTeam[pb.team_id] || 0;
      if (Math.abs(tb - ta) > 1e-9) return tb - ta;
      for (let i = roundNumbers.length - 1; i >= 0; i--) {
        const da = getRoundScore(pa.team_id, roundNumbers[i]);
        const db = getRoundScore(pb.team_id, roundNumbers[i]);
        const diff = db - da;
        if (Math.abs(diff) > 1e-9) return diff;
      }
      return 0;
    });
  }, [participants, totalsByTeam, scoreInputs, rounds]);

  if (loading) {
    return <div className="loading"><p>Загрузка игры...</p></div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={onBack}>Назад</button>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="error">
        <p>Игра не найдена</p>
        <button className="btn btn-secondary" onClick={onBack}>Назад</button>
      </div>
    );
  }

  return (
    <div className="game-manager" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <div>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>{game.name}</h2>
            {game.event_date ? (
              <span className="muted">Дата проведения: {new Date(game.event_date).toLocaleString()}</span>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => window.open(`/board/${game.id}`, '_blank')}>📊 Публичное табло</button>
            <button className="btn btn-secondary" onClick={onBack}>← Назад</button>
          </div>
        </div>

        {/* Participants editor */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Участники</h3>
            <ParticipantsEditor gameId={game.id} onChanged={async () => {
              const g = await apiClient.getGame(gameId);
              setGame(g);
              const sc = await apiClient.getScores(gameId);
              setScores(sc);
            }} />
          </div>
        </div>

        {/* Rounds list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {rounds.map((r) => {
            const editing = !!isEditingByRound[r.round_number];
            const saved = !!savedFlagByRound[r.round_number];
            const ranks = ranksByRound[r.round_number] || {};
            const max = getMaxForRound(r.round_number);
            return (
              <div key={r.round_number} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ marginTop: 0 }}>Раунд {r.round_number}{r.name ? ` — ${r.name}` : ''}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {typeof max === 'number' ? <span className="muted">макс: {max}</span> : null}
                      {saved && !editing ? <span className="muted">сохранено</span> : null}
                      {!editing ? (
                        <button className="btn" onClick={() => enableEditRound(r.round_number)}>Редактировать</button>
                      ) : null}
                    </div>
                  </div>

                  {!editing ? (
                    <>
                      {typeof max === 'number' ? (
                        <div className="muted" style={{ margin: '6px 0 10px 0' }}>Максимум за раунд: <strong>{max}</strong></div>
                      ) : null}
                      <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left' }}>Команда</th>
                              <th style={{ textAlign: 'left' }}>Номер стола</th>
                              <th style={{ textAlign: 'left' }}>Баллы</th>
                              <th style={{ textAlign: 'left' }}>Место</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participants.map(p => {
                              const valRaw = scoreInputs[r.round_number]?.[p.team_id] ?? '';
                              const val = parseInputToNumber(valRaw);
                              const rank = ranks[p.team_id] || 0;
                              return (
                                <tr key={p.id}>
                                  <td>{p.team?.name || `Команда #${p.team_id}`}</td>
                                  <td style={{ textAlign: 'center' }}>{p.table_number || '—'}</td>
                                  <td style={{ textAlign: 'center' }}><strong>{val}</strong></td>
                                  <td style={{ textAlign: 'center', fontWeight: rank === 1 ? 'bold' : 'normal', color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'inherit' }}>
                                    {rank > 0 ? rank : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      {typeof max === 'number' ? (
                        <div className="muted" style={{ margin: '6px 0 10px 0' }}>Максимум за раунд: <strong>{max}</strong></div>
                      ) : null}
                      <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left' }}>Команда</th>
                              <th style={{ textAlign: 'left' }}>Номер стола</th>
                              <th style={{ textAlign: 'left' }}>Баллы</th>
                              <th style={{ textAlign: 'left' }}>Место</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participants.map(p => {
                              const value = scoreInputs[r.round_number]?.[p.team_id] ?? '';
                              const rank = ranks[p.team_id] || 0;
                              const showError = typeof max === 'number' && parseInputToNumber(value) > max;
                              return (
                                <tr key={p.id}>
                                  <td>
                                    {p.team?.logo_path ? (
                                      <img alt="logo" src={`/uploads/${p.team.logo_path}`} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, marginRight: 6, verticalAlign: 'middle' }} />
                                    ) : null}
                                    <span>{p.team?.name || `Команда #${p.team_id}`}</span>
                                  </td>
                                  <td>{p.table_number || '—'}</td>
                                  <td>
                                    <input
                                      className="form-input"
                                      type="text"
                                      inputMode="decimal"
                                      value={value}
                                      onChange={(e) => setInput(r.round_number, p.team_id, e.target.value)}
                                      placeholder="0 или 0,5"
                                      style={{ width: 120, borderColor: showError ? '#d9534f' : undefined }}
                                    />
                                  </td>
                                  <td>{rank > 0 ? rank : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="form-actions" style={{ marginTop: 12 }}>
                        <button className="btn btn-primary" onClick={() => saveRound(r.round_number)} disabled={!!savingByRound[r.round_number]}>Сохранить раунд {r.round_number}</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals sidebar */}
      <aside>
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Итоги</h3>
            <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Команда</th>
                    <th style={{ textAlign: 'left' }}>Сумма</th>
                    <th style={{ textAlign: 'left' }}>Место</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParticipantsForTotals.map(p => (
                    <tr key={p.id}>
                      <td>{p.team?.name || `Команда #${p.team_id}`}</td>
                      <td><strong>{totalsByTeam[p.team_id] ?? 0}</strong></td>
                      <td>{overallRanks[p.team_id] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default GameManager;

// Participants editor block for adding/removing teams during an active game
const ParticipantsEditor: React.FC<{ gameId: number; onChanged: () => void }> = ({ gameId, onChanged }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [tableLabel, setTableLabel] = useState<string>('');
  const [participantsCount, setParticipantsCount] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [allTeams, game] = await Promise.all([
        apiClient.getTeams(),
        apiClient.getGame(gameId),
      ]);
      setTeams(allTeams);
      setParticipants(game.participants || []);
    } catch (e: any) {
      setError(e?.message || 'Не удалось загрузить участников');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const currentTeamIds = new Set((participants || []).map(p => p.team_id));
  const availableTeams = teams.filter(t => !currentTeamIds.has(t.id));

  const onAdd = async () => {
    if (!selectedTeamId || typeof selectedTeamId !== 'number') return;
    try {
      setSaving(true);
      const cnt = participantsCount === '' ? null : Number(participantsCount);
      await apiClient.addParticipant(gameId, { team_id: selectedTeamId, table_number: tableLabel.trim() || null, participants_count: cnt });
      setSelectedTeamId('');
      setTableLabel('');
      setParticipantsCount('');
      await load();
      await onChanged();
    } catch (e: any) {
      setError(e?.message || 'Не удалось добавить участника');
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async (teamId: number) => {
    try {
      setSaving(true);
      await apiClient.removeParticipant(gameId, teamId);
      await load();
      await onChanged();
    } catch (e: any) {
      setError(e?.message || 'Не удалось удалить участника');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && <div className="error" style={{ marginBottom: 12 }}><p>{error}</p></div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 220 }}>
          <label className="form-label">Команда</label>
          <select
            className="form-input"
            value={selectedTeamId as any}
            onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : '')}
            disabled={loading || saving}
          >
            <option value="">— выбрать —</option>
            {availableTeams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Номер стола (опц.)</label>
          <input
            className="form-input"
            type="text"
            placeholder="Напр., A12"
            value={tableLabel}
            onChange={(e) => setTableLabel(e.target.value)}
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="form-label">Количество участников (опц.)</label>
          <input
            className="form-input"
            type="text"
            inputMode="numeric"
            placeholder="0–99"
            value={participantsCount}
            onChange={(e) => { const v = e.target.value; if (v === '' || /^\d{1,2}$/.test(v)) setParticipantsCount(v); }}
            disabled={loading || saving}
            style={{ width: 100 }}
          />
        </div>
        <div>
          <button className="btn btn-primary" onClick={onAdd} disabled={loading || saving || !selectedTeamId}>+ Добавить</button>
        </div>
      </div>

      <div className="table" style={{ width: '100%', overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Команда</th>
              <th style={{ textAlign: 'left' }}>Номер стола</th>
              <th style={{ textAlign: 'left' }}>Участников</th>
              <th style={{ textAlign: 'left' }}></th>
            </tr>
          </thead>
          <tbody>
            {(participants || []).map(p => (
              <tr key={p.id}>
                <td>{p.team?.name || `Команда #${p.team_id}`}</td>
                <td>{p.table_number || '—'}</td>
                <td>{p.participants_count ?? '—'}</td>
                <td>
                  <button className="btn btn-danger" onClick={() => onRemove(p.team_id)} disabled={saving}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
