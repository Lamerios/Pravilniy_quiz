/**
 * Templates API routes
 * Handles HTTP endpoints for game template CRUD operations
 */

import { Router, Request, Response } from 'express';
import { templateService } from '../services/templateService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../../../shared/types';

const router = Router();

/**
 * GET /api/templates
 * Get all game templates
 */
router.get('/', async (req: Request, res: Response<ApiResponse>) => {
  try {
    logger.info('GET /api/templates - Fetching all templates');
    
    const templates = await templateService.getAllTemplates();
    
    res.json({
      success: true,
      data: templates,
      message: `Found ${templates.length} templates`
    });

  } catch (error) {
    logger.error('GET /api/templates failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/templates/:id
 * Get template by ID with rounds
 */
router.get('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    logger.info('GET /api/templates/:id - Fetching template', { templateId });
    
    const template = await templateService.getTemplateById(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Template found'
    });

  } catch (error) {
    logger.error('GET /api/templates/:id failed', { 
      error: (error as Error).message,
      templateId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

/**
 * POST /api/templates
 * Create new game template with rounds
 */
router.post('/', async (req: Request, res: Response<ApiResponse>) => {
  try {
    logger.info('POST /api/templates - Creating new template', { 
      name: req.body.name,
      roundsCount: req.body.rounds?.length 
    });
    
    const template = await templateService.createTemplate(req.body);
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });

  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('POST /api/templates failed', { error: errorMessage });
    
    // Check if it's a validation error
    if (errorMessage.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update template basic information
 */
router.put('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    logger.info('PUT /api/templates/:id - Updating template', { 
      templateId,
      updateData: req.body 
    });
    
    const template = await templateService.updateTemplate(templateId, req.body);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });

  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('PUT /api/templates/:id failed', { 
      error: errorMessage,
      templateId: req.params.id
    });
    
    // Check if it's a validation error
    if (errorMessage.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete template and all its rounds
 */
router.delete('/:id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    logger.info('DELETE /api/templates/:id - Deleting template', { templateId });
    
    const deleted = await templateService.deleteTemplate(templateId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('DELETE /api/templates/:id failed', { 
      error: errorMessage,
      templateId: req.params.id
    });
    
    // Check if template is in use
    if (errorMessage.includes('Cannot delete template')) {
      return res.status(409).json({
        success: false,
        error: errorMessage
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

export default router;

