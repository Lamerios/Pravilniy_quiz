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
            <div key={game.id} className="card game-card" onClick={() => onViewGame(game)}>
              <div className="card-body">
                <div className="card-header">
                  <h3>{game.name}</h3>
                  <span className={`game-status status-${game.status}`}>{game.status}</span>
                </div>
                <p><strong>Шаблон:</strong> {(game as any).template_name || 'Неизвестен'}</p>
                <p><strong>Команд:</strong> {(game as any).participant_count || 0}</p>
                <small>Создана: {new Date(game.created_at).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameList;

