/**
 * Template service - business logic for game templates
 * Handles CRUD operations for templates and their rounds
 */

import { database } from '../db/database';
import { logger } from '../utils/logger';
import { GameTemplate, TemplateRound, CreateGameTemplateRequest, ApiResponse } from '../../../shared/types';
import { validateCreateTemplate, validateUpdateTemplate, sanitizeTemplateData } from '../models/Template';

export class TemplateService {
  /**
   * Create a new game template with rounds
   * @param templateData - Template creation data
   * @returns Promise with created template
   */
  async createTemplate(templateData: CreateGameTemplateRequest): Promise<GameTemplate> {
    logger.info('Creating new template', { name: templateData.name });

    // Validate input data
    const validation = validateCreateTemplate(templateData);
    if (!validation.isValid) {
      const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
      logger.warn('Template validation failed', { errors: validation.errors });
      throw error;
    }

    // Sanitize data
    const sanitizedData = sanitizeTemplateData(templateData);

    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');

      // Insert template
      const templateResult = await client.query(
        'INSERT INTO game_templates (name, description) VALUES ($1, $2) RETURNING *',
        [sanitizedData.name, sanitizedData.description]
      );

      const template = templateResult.rows[0];
      const templateId = template.id;

      // Insert rounds
      const rounds: TemplateRound[] = [];
      for (const roundData of sanitizedData.rounds) {
        const roundResult = await client.query(
          'INSERT INTO template_rounds (template_id, round_number, name, max_score) VALUES ($1, $2, $3, $4) RETURNING *',
          [templateId, roundData.round_number, roundData.name, roundData.max_score]
        );
        rounds.push(roundResult.rows[0]);
      }

      await client.query('COMMIT');

      const createdTemplate: GameTemplate = {
        ...template,
        rounds: rounds.sort((a, b) => a.round_number - b.round_number)
      };

      logger.info('Template created successfully', { 
        templateId, 
        name: template.name, 
        roundsCount: rounds.length 
      });

      return createdTemplate;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create template', { 
        error: (error as Error).message, 
        templateName: sanitizedData.name 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all game templates
   * @returns Promise with array of templates
   */
  async getAllTemplates(): Promise<GameTemplate[]> {
    logger.debug('Fetching all templates');

    try {
      const result = await database.query(`
        SELECT 
          t.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', r.id,
                'template_id', r.template_id,
                'round_number', r.round_number,
                'name', r.name,
                'max_score', r.max_score
              ) ORDER BY r.round_number
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'::json
          ) as rounds
        FROM game_templates t
        LEFT JOIN template_rounds r ON t.id = r.template_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `);

      const templates: GameTemplate[] = result.rows.map(row => ({
        ...row,
        rounds: row.rounds || []
      }));

      logger.debug('Templates fetched successfully', { count: templates.length });
      return templates;

    } catch (error) {
      logger.error('Failed to fetch templates', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get template by ID with rounds
   * @param templateId - Template ID
   * @returns Promise with template or null if not found
   */
  async getTemplateById(templateId: number): Promise<GameTemplate | null> {
    logger.debug('Fetching template by ID', { templateId });

    try {
      const result = await database.query(`
        SELECT 
          t.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', r.id,
                'template_id', r.template_id,
                'round_number', r.round_number,
                'name', r.name,
                'max_score', r.max_score
              ) ORDER BY r.round_number
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'::json
          ) as rounds
        FROM game_templates t
        LEFT JOIN template_rounds r ON t.id = r.template_id
        WHERE t.id = $1
        GROUP BY t.id
      `, [templateId]);

      if (result.rows.length === 0) {
        logger.debug('Template not found', { templateId });
        return null;
      }

      const template: GameTemplate = {
        ...result.rows[0],
        rounds: result.rows[0].rounds || []
      };

      logger.debug('Template fetched successfully', { templateId, name: template.name });
      return template;

    } catch (error) {
      logger.error('Failed to fetch template', { 
        error: (error as Error).message, 
        templateId 
      });
      throw error;
    }
  }

  /**
   * Update template basic info (name, description)
   * @param templateId - Template ID
   * @param updateData - Update data
   * @returns Promise with updated template
   */
  async updateTemplate(templateId: number, updateData: Partial<GameTemplate>): Promise<GameTemplate | null> {
    logger.info('Updating template', { templateId, updateData });

    // Validate input data
    const validation = validateUpdateTemplate(updateData);
    if (!validation.isValid) {
      const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
      logger.warn('Template update validation failed', { errors: validation.errors });
      throw error;
    }

    try {
      // Check if template exists
      const existingTemplate = await this.getTemplateById(templateId);
      if (!existingTemplate) {
        logger.warn('Template not found for update', { templateId });
        return null;
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(updateData.name.trim());
        paramIndex++;
      }

      if (updateData.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(updateData.description?.trim() || null);
        paramIndex++;
      }

      if (updates.length === 0) {
        logger.debug('No updates provided', { templateId });
        return existingTemplate;
      }

      // Add template ID as last parameter
      values.push(templateId);

      const result = await database.query(
        `UPDATE game_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const updatedTemplate: GameTemplate = {
        ...result.rows[0],
        rounds: existingTemplate.rounds
      };

      logger.info('Template updated successfully', { templateId, name: updatedTemplate.name });
      return updatedTemplate;

    } catch (error) {
      logger.error('Failed to update template', { 
        error: (error as Error).message, 
        templateId 
      });
      throw error;
    }
  }

  /**
   * Delete template and all its rounds
   * @param templateId - Template ID
   * @returns Promise with boolean indicating success
   */
  async deleteTemplate(templateId: number): Promise<boolean> {
    logger.info('Deleting template', { templateId });

    try {
      // Check if template exists
      const existingTemplate = await this.getTemplateById(templateId);
      if (!existingTemplate) {
        logger.warn('Template not found for deletion', { templateId });
        return false;
      }

      // Check if template is used in any games
      const gamesResult = await database.query(
        'SELECT COUNT(*) as count FROM games WHERE template_id = $1',
        [templateId]
      );

      const gamesCount = parseInt(gamesResult.rows[0].count);
      if (gamesCount > 0) {
        const error = new Error(`Cannot delete template: it is used in ${gamesCount} game(s)`);
        logger.warn('Template deletion blocked - template in use', { templateId, gamesCount });
        throw error;
      }

      // Delete template (rounds will be deleted by CASCADE)
      const result = await database.query(
        'DELETE FROM game_templates WHERE id = $1',
        [templateId]
      );

      const deleted = result.rowCount > 0;
      
      if (deleted) {
        logger.info('Template deleted successfully', { templateId });
      } else {
        logger.warn('Template not found during deletion', { templateId });
      }

      return deleted;

    } catch (error) {
      logger.error('Failed to delete template', { 
        error: (error as Error).message, 
        templateId 
      });
      throw error;
    }
  }
}

// Export singleton instance
export const templateService = new TemplateService();

