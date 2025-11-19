/**
 * Admin Panel component
 * Main administrative interface for managing game templates, teams, and games
 */

import React, { useEffect, useState } from 'react';
import { GameTemplate, Game } from '../../../../shared/types';
import TeamsManager from './TeamsManager';
import TemplateList from './TemplateList';
import TemplateForm from './TemplateForm';
import GameList from './GameList';
import GameForm from './GameForm';
import GameManager from './GameManager';
import './AdminPanel.css';
import { apiClient } from '../../services/apiClient';

type AdminView = 'templates' | 'teams' | 'games';
type TemplateMode = 'list' | 'create' | 'edit';
type GameMode = 'list' | 'create' | 'view';

export const AdminPanel: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminView>('games');
  const [authed, setAuthed] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    setAuthed(!!t);
  }, []);

  const handleLogin = async () => {
    try {
      setAuthError('');
      await apiClient.adminLogin(password);
      setAuthed(true);
      setPassword('');
    } catch (e: any) {
      setAuthError(e?.message || 'Ошибка авторизации');
    }
  };

  const handleLogout = () => {
    apiClient.adminLogout();
    setAuthed(false);
  };
  
  const [templateMode, setTemplateMode] = useState<TemplateMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(null);

  const [gameMode, setGameMode] = useState<GameMode>('list');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  /**
   * Handle template creation
   */
  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setTemplateMode('create');
  };

  /**
   * Handle template editing
   */
  const handleEditTemplate = (template: GameTemplate) => {
    setSelectedTemplate(template);
    setTemplateMode('edit');
  };

  /**
   * Handle template save (create or update)
   */
  const handleTemplateSave = (template: GameTemplate) => {
    setTemplateMode('list');
    setSelectedTemplate(null);
    // The template list will refresh automatically
  };

  /**
   * Handle template form cancel
   */
  const handleTemplateCancel = () => {
    setTemplateMode('list');
    setSelectedTemplate(null);
  };

  /**
   * Render navigation tabs
   */
  const renderNavigation = () => (
    <nav className="admin-nav">
      <button
        className={`nav-tab ${currentView === 'templates' ? 'active' : ''}`}
        onClick={() => setCurrentView('templates')}
      >
        📋 Шаблоны игр
      </button>
      <button
        className={`nav-tab ${currentView === 'teams' ? 'active' : ''}`}
        onClick={() => setCurrentView('teams')}
      >
        👥 Команды
      </button>
      <button
        className={`nav-tab ${currentView === 'games' ? 'active' : ''}`}
        onClick={() => setCurrentView('games')}
      >
        🎮 Игры
      </button>
    </nav>
  );

  /**
   * Render templates section
   */
  const renderTemplatesSection = () => {
    switch (templateMode) {
      case 'create':
      case 'edit':
        return (
          <TemplateForm
            template={selectedTemplate}
            onSave={handleTemplateSave}
            onCancel={handleTemplateCancel}
          />
        );
      case 'list':
      default:
        return (
          <TemplateList
            onCreateTemplate={handleCreateTemplate}
            onEditTemplate={handleEditTemplate}
          />
        );
    }
  };

  /**
   * Render placeholder for teams section
   */
  const renderTeamsSection = () => (
    <TeamsManager />
  );

  /**
   * Render games section
   */
  const renderGamesSection = () => {
    switch (gameMode) {
      case 'create':
        return (
          <GameForm
            onSave={(game: Game) => {
              console.log('Game saved:', game);
              setGameMode('list');
            }}
            onCancel={() => setGameMode('list')}
          />
        );
      case 'view':
        return (
          selectedGame ? (
            <GameManager
              gameId={selectedGame.id}
              onBack={() => setGameMode('list')}
            />
          ) : (
            <div className="section-placeholder">
              <h2>Игра не выбрана</h2>
              <button className="btn btn-secondary" onClick={() => setGameMode('list')}>Назад к списку</button>
            </div>
          )
        );
      case 'list':
      default:
        return (
          <GameList
            onCreateGame={() => setGameMode('create')}
            onViewGame={(game: Game) => {
              setSelectedGame(game);
              setGameMode('view');
            }}
          />
        );
    }
  };

  /**
   * Render current section content
   */
  const renderContent = () => {
    switch (currentView) {
      case 'templates':
        return renderTemplatesSection();
      case 'teams':
        return renderTeamsSection();
      case 'games':
        return renderGamesSection();
      default:
        return renderTemplatesSection();
    }
  };

  if (!authed) {
    return (
      <div className="admin-panel" style={{ maxWidth: 420, margin: '48px auto' }}>
        <div className="card">
          <div className="card-body">
            <h2 style={{ marginTop: 0 }}>Вход в админ-панель</h2>
            <div className="form-group">
              <label className="form-label">Пароль администратора</label>
              <input
                type="password"
                className="form-input"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
              />
            </div>
            {authError && <div className="error" style={{ marginBottom: 12 }}><p>{authError}</p></div>}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleLogin} disabled={!password.trim()}>Войти</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>📊 Административная панель</h1>
        <p>Управление системой проведения интеллектуальных игр</p>
        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={handleLogout}>Выйти</button>
        </div>
      </div>

      {renderNavigation()}

      <main className="admin-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminPanel;
