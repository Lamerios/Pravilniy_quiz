/**
 * Admin Panel component
 * Main administrative interface for managing game templates, teams, and games
 */

import React, { useState } from 'react';
import { GameTemplate, Game } from '../../../../shared/types';
import TeamsManager from './TeamsManager.tsx';
import TemplateList from './TemplateList.tsx';
import TemplateForm from './TemplateForm.tsx';
import GameList from './GameList.tsx';
import GameForm from './GameForm.tsx';
import GameManager from './GameManager.tsx';
import './AdminPanel.css';

type AdminView = 'templates' | 'teams' | 'games';
type TemplateMode = 'list' | 'create' | 'edit';
type GameMode = 'list' | 'create' | 'view';

export const AdminPanel: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminView>('games');
  
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
            onSave={(game) => {
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
            onViewGame={(game) => {
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

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>📊 Административная панель</h1>
        <p>Управление системой проведения интеллектуальных игр</p>
      </div>

      {renderNavigation()}

      <main className="admin-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminPanel;
