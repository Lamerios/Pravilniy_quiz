/**
 * Admin Panel component
 * Main administrative interface for managing game templates, teams, and games
 */

import React, { useState } from 'react';
import { GameTemplate } from '../../../../shared/types';
import TemplateList from './TemplateList';
import TemplateForm from './TemplateForm';
import './AdminPanel.css';

type AdminView = 'templates' | 'teams' | 'games';
type TemplateMode = 'list' | 'create' | 'edit';

export const AdminPanel: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminView>('templates');
  const [templateMode, setTemplateMode] = useState<TemplateMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(null);

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
        disabled
      >
        👥 Команды
        <span className="coming-soon">(скоро)</span>
      </button>
      <button
        className={`nav-tab ${currentView === 'games' ? 'active' : ''}`}
        onClick={() => setCurrentView('games')}
        disabled
      >
        🎮 Игры
        <span className="coming-soon">(скоро)</span>
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
    <div className="section-placeholder">
      <h2>👥 Управление командами</h2>
      <p>Раздел управления командами будет доступен в следующей итерации</p>
      <div className="placeholder-features">
        <h3>Планируемые функции:</h3>
        <ul>
          <li>✅ Создание и редактирование команд</li>
          <li>✅ Загрузка логотипов команд</li>
          <li>✅ Управление справочником команд</li>
        </ul>
      </div>
    </div>
  );

  /**
   * Render placeholder for games section
   */
  const renderGamesSection = () => (
    <div className="section-placeholder">
      <h2>🎮 Управление играми</h2>
      <p>Раздел управления играми будет доступен в следующих итерациях</p>
      <div className="placeholder-features">
        <h3>Планируемые функции:</h3>
        <ul>
          <li>✅ Создание игр на основе шаблонов</li>
          <li>✅ Добавление команд-участников</li>
          <li>✅ Проведение игр в реальном времени</li>
          <li>✅ Управление счетом по раундам</li>
        </ul>
      </div>
    </div>
  );

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
