/**
 * Teams Manager component
 * CRUD управление командами + загрузка логотипов
 */

import React, { useEffect, useState, useRef } from 'react';
import { Team } from '../../../../shared/types';
import { apiClient } from '../../services/apiClient';

const TeamsManager: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const fileInputsRef = useRef<Record<number, HTMLInputElement | null>>({});

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getTeams();
      setTeams(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки команд');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreate = async () => {
    if (!newTeamName.trim()) return;
    try {
      const team = await apiClient.createTeam({ name: newTeamName.trim() });
      setTeams([team, ...teams]);
      setNewTeamName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка создания команды');
    }
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditingName(team.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async (id: number) => {
    try {
      const updated = await apiClient.updateTeam(id, { name: editingName.trim() });
      setTeams(teams.map(t => (t.id === id ? updated : t)));
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка обновления команды');
    }
  };

  const removeTeam = async (id: number) => {
    try {
      await apiClient.deleteTeam(id);
      setTeams(teams.filter(t => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления команды');
    }
  };

  const uploadLogo = async (id: number, file: File) => {
    try {
      const updated = await apiClient.uploadTeamLogo(id, file);
      setTeams(teams.map(t => (t.id === id ? updated : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки логотипа');
    }
  };

  const triggerFileInput = (id: number) => {
    fileInputsRef.current[id]?.click();
  };

  if (loading) {
    return <div className="loading"><p>Загрузка команд...</p></div>;
  }

  return (
    <div className="teams-manager">
      <div className="teams-header">
        <h2>Команды</h2>
        <div className="create-team">
          <input
            type="text"
            className="form-input"
            placeholder="Название команды"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <button className="btn btn-primary" onClick={handleCreate} disabled={!newTeamName.trim()}>
            + Добавить
          </button>
        </div>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: 12 }}>
          <p>{error}</p>
        </div>
      )}

      <div className="teams-list">
        {teams.length === 0 ? (
          <div className="empty-state">Пока нет команд</div>
        ) : (
          teams.map(team => (
            <div key={team.id} className="team-card card">
              <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {team.logo_path ? (
                    <img
                      className="team-logo-thumb"
                      src={`/uploads/${team.logo_path}`}
                      alt={team.name}
                    />
                  ) : (
                    <span style={{ color: '#888', fontSize: 12 }}>Нет логотипа</span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  {editingId === team.id ? (
                    <input
                      type="text"
                      className="form-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                  ) : (
                    <h3 style={{ margin: 0 }}>{team.name}</h3>
                  )}
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                    Создана: {new Date(team.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>

                <div className="team-actions" style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="file"
                    accept="image/*"
                    ref={(el) => (fileInputsRef.current[team.id] = el)}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLogo(team.id, file);
                      if (e.target) e.target.value = '';
                    }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => triggerFileInput(team.id)} title="Загрузить логотип">
                    🖼️
                  </button>

                  {editingId === team.id ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(team.id)} disabled={!editingName.trim()} title="Сохранить">
                        ✓
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={cancelEdit} title="Отмена">
                        ✕
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(team)} title="Редактировать">
                      ✏️
                    </button>
                  )}

                  <button className="btn btn-danger btn-sm" onClick={() => removeTeam(team.id)} title="Удалить">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamsManager;


