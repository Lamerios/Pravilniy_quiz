/**
 * Game Form component
 * Handles creation of a new game from a template and selected teams.
 */

import React, { useState, useEffect } from 'react';
import { Game, GameTemplate, Team, CreateGameRequest } from '../../../../shared/types';
import { apiClient } from '../../services/apiClient';

interface GameFormProps {
  onSave: (game: Game) => void;
  onCancel: () => void;
}

const GameForm: React.FC<GameFormProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [tableNumbersByTeam, setTableNumbersByTeam] = useState<Record<number, string>>({});
  const [participantsCountByTeam, setParticipantsCountByTeam] = useState<Record<number, string>>({});
  const [eventDate, setEventDate] = useState<string>('');
  
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [teams, setTeams] = useState<(Team & { games_count?: number })[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [templatesData, teamsData] = await Promise.all([
          apiClient.getTemplates(),
          apiClient.getTeams()
        ]);
        setTemplates(templatesData);
        // Сортировка команд от большего к меньшему количеству игр
        const sortedTeams = [...teamsData].sort((a: any, b: any) => {
          const gamesA = a.games_count || 0;
          const gamesB = b.games_count || 0;
          return gamesB - gamesA; // от большего к меньшему
        });
        setTeams(sortedTeams);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных для формы');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTeamSelection = (teamId: number) => {
    setSelectedTeamIds(prev => {
      const next = prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId];
      return next;
    });
  };

  const setTableLabel = (teamId: number, value: string) => {
    setTableNumbersByTeam(prev => ({ ...prev, [teamId]: value }));
  };

  const setParticipantsCount = (teamId: number, value: string) => {
    // allow empty, or integer 1..99
    if (value === '' || /^\d{1,2}$/.test(value)) {
      setParticipantsCountByTeam(prev => ({ ...prev, [teamId]: value }));
    }
  };

  const validateTableLabels = (): string | null => {
    const labels = selectedTeamIds
      .map(id => (tableNumbersByTeam[id] || '').trim())
      .filter(v => v.length > 0);
    const hasDuplicates = new Set(labels).size !== labels.length;
    if (hasDuplicates) return 'Номера/ярлыки столов должны быть уникальными';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !templateId || selectedTeamIds.length < 2) {
      setError('Необходимо указать название, выбрать шаблон и минимум 2 команды.');
      return;
    }
    const labelValidation = validateTableLabels();
    if (labelValidation) {
      setError(labelValidation);
      return;
    }

    const table_numbers = selectedTeamIds.map((teamId) => {
      const label = (tableNumbersByTeam[teamId] || '').trim();
      return label.length === 0 ? null : label;
    });

    const participants_counts = selectedTeamIds.map((teamId) => {
      const raw = (participantsCountByTeam[teamId] || '').trim();
      if (raw === '') return null;
      const num = Number(raw);
      return Number.isInteger(num) && num > 0 ? num : null;
    });

    const gameData: CreateGameRequest = {
      name: name.trim(),
      template_id: templateId,
      team_ids: selectedTeamIds,
      table_numbers,
      participants_counts,
      event_date: eventDate ? new Date(eventDate).toISOString() : null,
    };

    setLoading(true);
    setError('');
    try {
      const newGame = await apiClient.createGame(gameData);
      onSave(newGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать игру');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !templates.length) {
    return <div className="loading"><p>Загрузка данных...</p></div>;
  }

  return (
    <div className="game-form">
      <h2>Создание новой игры</h2>
      {error && <div className="error"><p>{error}</p></div>}
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="game-name">Название игры *</label>
          <input
            id="game-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Зимний кубок 2025"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="template-select">Шаблон игры *</label>
          <select
            id="template-select"
            className="form-input"
            value={templateId || ''}
            onChange={(e) => setTemplateId(Number(e.target.value))}
            required
          >
            <option value="" disabled>Выберите шаблон</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="event-date">Дата проведения (необязательно)</label>
          <input
            id="event-date"
            type="datetime-local"
            className="form-input"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <div className="rounds-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Команды-участники (минимум 2) *</label>
            <span className="muted">Выбрано: {selectedTeamIds.length}</span>
          </div>
          <div className="team-selection-grid">
            {teams.map(team => {
              const selected = selectedTeamIds.includes(team.id);
              const tableValue = tableNumbersByTeam[team.id] || '';
              const countValue = participantsCountByTeam[team.id] || '';
              return (
                <div
                  key={team.id}
                  className={`team-card-selectable ${selected ? 'selected' : ''}`}
                  onClick={() => handleTeamSelection(team.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTeamSelection(team.id);
                    }
                  }}
                  aria-pressed={selected}
                  aria-label={`Команда ${team.name} ${selected ? 'выбрана' : 'не выбрана'}`}
                >
                  {team.logo_path ? (
                    <img className="team-logo-thumb" src={`/uploads/${team.logo_path}`} alt={team.name} />
                  ) : (
                    <div className="team-logo-thumb no-logo" aria-hidden="true">🖼️</div>
                  )}
                  <div className="team-name">{team.name}</div>
                  {selected && (
                    <div
                      style={{ marginTop: 8, width: '100%', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label htmlFor={`table-${team.id}`} className="muted" style={{ fontSize: 12 }}>Стол/зона:</label>
                      <input
                        id={`table-${team.id}`}
                        className="table-number-input"
                        type="text"
                        value={tableValue}
                        onChange={(e) => setTableLabel(team.id, e.target.value)}
                        placeholder="например: 5 или Бар"
                        aria-label={`Метка места для команды ${team.name}`}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{ minWidth: 140 }}
                      />

                      <label htmlFor={`count-${team.id}`} className="muted" style={{ fontSize: 12 }}>Кол-во:</label>
                      <input
                        id={`count-${team.id}`}
                        className="table-number-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={countValue}
                        onChange={(e) => setParticipantsCount(team.id, e.target.value)}
                        placeholder="напр.: 5"
                        aria-label={`Количество участников для ${team.name}`}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{ width: 80 }}
                      />
                    </div>
                  )}
                  <span className="checkmark" aria-hidden="true">✓</span>
                </div>
              );
            })}
          </div>
          {selectedTeamIds.length < 2 && (
            <div className="hint muted" style={{ marginTop: 8 }}>
              Выберите минимум 2 команды, чтобы продолжить
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || selectedTeamIds.length < 2}>
            {loading ? 'Создание...' : 'Создать игру'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GameForm;

