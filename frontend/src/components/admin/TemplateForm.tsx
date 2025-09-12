/**
 * Template Form component
 * Handles creation and editing of game templates
 */

import React, { useState, useEffect } from 'react';
import { GameTemplate, CreateGameTemplateRequest, CreateTemplateRoundRequest } from '../../../../shared/types';
import { apiClient } from '../../services/apiClient.ts';

interface TemplateFormProps {
  template?: GameTemplate | null;
  onSave?: (template: GameTemplate) => void;
  onCancel?: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ 
  template, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rounds: [
      { round_number: 1, name: '', max_score: 10 }
    ] as CreateTemplateRoundRequest[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize form with template data for editing
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        rounds: template.rounds?.map(round => ({
          round_number: round.round_number,
          name: round.name,
          max_score: round.max_score
        })) || [{ round_number: 1, name: '', max_score: 10 }]
      });
    }
  }, [template]);

  /**
   * Handle form field changes
   */
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Handle round field changes
   */
  const handleRoundChange = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      rounds: prev.rounds.map((round, i) => 
        i === index ? { ...round, [field]: value } : round
      )
    }));
  };

  /**
   * Add new round
   */
  const addRound = () => {
    const nextRoundNumber = Math.max(...formData.rounds.map(r => r.round_number)) + 1;
    setFormData(prev => ({
      ...prev,
      rounds: [
        ...prev.rounds,
        { round_number: nextRoundNumber, name: '', max_score: 10 }
      ]
    }));
  };

  /**
   * Remove round
   */
  const removeRound = (index: number) => {
    if (formData.rounds.length <= 1) {
      return; // Don't allow removing the last round
    }
    
    setFormData(prev => ({
      ...prev,
      rounds: prev.rounds.filter((_, i) => i !== index)
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Название шаблона обязательно');
    } else if (formData.name.trim().length < 3) {
      errors.push('Название шаблона должно содержать минимум 3 символа');
    }

    if (formData.rounds.length === 0) {
      errors.push('Шаблон должен содержать минимум один раунд');
    }

    formData.rounds.forEach((round, index) => {
      if (!round.name.trim()) {
        errors.push(`Раунд ${index + 1}: название обязательно`);
      }
      if (round.max_score < 1) {
        errors.push(`Раунд ${index + 1}: максимальный балл должен быть больше 0`);
      }
    });

    // Check for duplicate round numbers
    const roundNumbers = formData.rounds.map(r => r.round_number);
    const uniqueNumbers = new Set(roundNumbers);
    if (roundNumbers.length !== uniqueNumbers.size) {
      errors.push('Номера раундов должны быть уникальными');
    }

    return errors;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const templateData: CreateGameTemplateRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        rounds: formData.rounds.map(round => ({
          round_number: round.round_number,
          name: round.name.trim(),
          max_score: round.max_score
        }))
      };

      let savedTemplate: GameTemplate;
      
      if (template) {
        // Update existing template
        savedTemplate = await apiClient.updateTemplate(template.id, {
          name: templateData.name,
          description: templateData.description
        });
      } else {
        // Create new template
        savedTemplate = await apiClient.createTemplate(templateData);
      }

      onSave?.(savedTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения шаблона');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="template-form">
      <div className="template-form-header">
        <h2>{template ? 'Редактировать шаблон' : 'Создать шаблон'}</h2>
        <button 
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Отмена
        </button>
      </div>

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Название шаблона *
          </label>
          <input
            id="name"
            type="text"
            className="form-input"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Например: Классический квиз"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Описание
          </label>
          <textarea
            id="description"
            className="form-input"
            rows={3}
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Краткое описание шаблона игры"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <div className="rounds-header">
            <label className="form-label">Раунды *</label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addRound}
              disabled={loading || formData.rounds.length >= 20}
            >
              + Добавить раунд
            </button>
          </div>

          <div className="rounds-list">
            {formData.rounds.map((round, index) => (
              <div key={index} className="round-form card">
                <div className="round-form-header">
                  <span>Раунд {round.round_number}</span>
                  {formData.rounds.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeRound(index)}
                      disabled={loading}
                      title="Удалить раунд"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <div className="round-form-fields">
                  <div className="form-group">
                    <label className="form-label">Номер раунда</label>
                    <input
                      type="number"
                      className="form-input"
                      value={round.round_number}
                      onChange={(e) => handleRoundChange(index, 'round_number', parseInt(e.target.value) || 1)}
                      min="1"
                      max="100"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Название раунда</label>
                    <input
                      type="text"
                      className="form-input"
                      value={round.name}
                      onChange={(e) => handleRoundChange(index, 'name', e.target.value)}
                      placeholder="Например: Разминка"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Максимальный балл</label>
                    <input
                      type="number"
                      className="form-input"
                      value={round.max_score}
                      onChange={(e) => handleRoundChange(index, 'max_score', parseInt(e.target.value) || 1)}
                      min="1"
                      max="1000"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : (template ? 'Сохранить изменения' : 'Создать шаблон')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateForm;

