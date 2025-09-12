/**
 * Game List component
 * Displays list of created games and allows creating new ones
 */

import React, { useState, useEffect } from 'react';
import { Game } from '../../../../shared/types';
import { apiClient } from '../../services/apiClient.ts';

interface GameListProps {
  onCreateGame: () => void;
  onViewGame: (game: Game) => void;
}

const GameList: React.FC<GameListProps> = ({ onCreateGame, onViewGame }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError('');
        const gamesData = await apiClient.getGames();
        setGames(gamesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки списка игр');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) {
    return <div className="loading"><p>Загрузка игр...</p></div>;
  }

  return (
    <div className="game-list">
      <div className="list-header">
        <h2>Игры</h2>
        <button className="btn btn-primary" onClick={onCreateGame}>
          + Создать игру
        </button>
      </div>

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {games.length === 0 && !error ? (
        <div className="empty-state">
          <p>Еще не создано ни одной игры.</p>
          <button className="btn btn-primary" onClick={onCreateGame}>
            Создать первую игру
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {games.map(game => (
            <div key={game.id} className="card game-card">
              <div className="card-body">
                <div className="card-header">
                  <h3 style={{cursor:'pointer'}} onClick={() => onViewGame(game)}>{game.name}</h3>
                  <span className={`game-status status-${game.status}`}>{game.status}</span>
                </div>
                <p><strong>Шаблон:</strong> {(game as any).template_name || 'Неизвестен'}</p>
                <p><strong>Команд:</strong> {(game as any).participant_count || 0}</p>
                <small>Создана: {new Date(game.created_at).toLocaleDateString()}</small>
                <div style={{display:'flex', gap:8, marginTop:8}}>
                  {confirmId===game.id ? (
                    <>
                      <button className="btn btn-danger" onClick={async()=>{ try{ await apiClient.deleteGame(game.id); setGames(games.filter(g=>g.id!==game.id)); setConfirmId(null);} catch(e:any){ setError(e.message || 'Не удалось удалить игру'); setConfirmId(null);} }}>Подтвердить удаление</button>
                      <button className="btn btn-secondary" onClick={()=>setConfirmId(null)}>Отмена</button>
                    </>
                  ) : (
                    <button className="btn btn-secondary" onClick={()=>setConfirmId(game.id)}>Удалить</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameList;

