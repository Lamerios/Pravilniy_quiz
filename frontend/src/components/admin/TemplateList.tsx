/**
 * Template List component
 * Displays list of game templates with management actions
 */

import React, { useState, useEffect } from 'react';
import { GameTemplate } from '../../../../shared/types';
import { apiClient } from '../../services/apiClient.ts';

interface TemplateListProps {
  onEditTemplate?: (template: GameTemplate) => void;
  onCreateTemplate?: () => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({ 
  onEditTemplate, 
  onCreateTemplate 
}) => {
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  /**
   * Load templates from API
   */
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const templatesData = await apiClient.getTemplates();
      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete template with confirmation
   */
  const handleDelete = async (templateId: number) => {
    if (deleteConfirm !== templateId) {
      setDeleteConfirm(templateId);
      return;
    }

    try {
      await apiClient.deleteTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления шаблона');
      setDeleteConfirm(null);
    }
  };

  /**
   * Cancel delete confirmation
   */
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <p>Загрузка шаблонов игр...</p>
      </div>
    );
  }

  return (
    <div className="template-list">
      <div className="template-list-header">
        <h2>Шаблоны игр</h2>
        <button 
          className="btn btn-primary"
          onClick={onCreateTemplate}
        >
          + Создать шаблон
        </button>
      </div>

      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={loadTemplates} className="btn btn-secondary">
            Повторить
          </button>
        </div>
      )}

      {templates.length === 0 && !error ? (
        <div className="empty-state">
          <p>Шаблоны игр не найдены</p>
          <p>Создайте первый шаблон для начала работы</p>
          <button 
            className="btn btn-primary"
            onClick={onCreateTemplate}
          >
            Создать шаблон
          </button>
        </div>
      ) : (
        <div className="template-grid">
          {templates.map(template => (
            <div key={template.id} className="template-card card">
              <div className="card-header">
                <h3>{template.name}</h3>
                <div className="template-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onEditTemplate?.(template)}
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button
                    className={`btn btn-sm ${
                      deleteConfirm === template.id ? 'btn-danger' : 'btn-secondary'
                    }`}
                    onClick={() => handleDelete(template.id)}
                    title={deleteConfirm === template.id ? 'Подтвердить удаление' : 'Удалить'}
                  >
                    {deleteConfirm === template.id ? '✓' : '🗑️'}
                  </button>
                  {deleteConfirm === template.id && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={cancelDelete}
                      title="Отмена"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              
              <div className="card-body">
                {template.description && (
                  <p className="template-description">{template.description}</p>
                )}
                
                <div className="template-stats">
                  <span className="stat">
                    <strong>Раундов:</strong> {template.rounds?.length || 0}
                  </span>
                  <span className="stat">
                    <strong>Создан:</strong> {new Date(template.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {template.rounds && template.rounds.length > 0 && (
                  <div className="template-rounds">
                    <h4>Раунды:</h4>
                    <ul className="rounds-list">
                      {template.rounds
                        .sort((a, b) => a.round_number - b.round_number)
                        .map(round => (
                          <li key={round.id} className="round-item">
                            <span className="round-number">{round.round_number}.</span>
                            <span className="round-name">{round.name}</span>
                            <span className="round-score">({round.max_score} баллов)</span>
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateList;

