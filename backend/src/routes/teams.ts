/**
 * Teams API routes
 * Handles CRUD operations for teams
 */

import express from 'express';
import { teamService } from '../services/teamService';
import { uploadTeamLogo, deleteFile } from '../middleware/upload';
import { logger } from '../utils/logger';
import { CreateTeamRequest, UpdateTeamRequest } from '../types/shared';

const router = express.Router();

/**
 * GET /api/teams
 * Get all teams
 */
router.get('/', async (req, res) => {
  try {
    const teams = await teamService.getAllTeams();
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error('GET /api/teams failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/teams/:id
 * Get team by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const team = await teamService.getTeamById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    logger.error('GET /api/teams/:id failed', { 
      teamId: req.params.id,
      error: (error as Error).message 
    });
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/teams
 * Create new team
 */
router.post('/', async (req, res) => {
  try {
    const { name }: CreateTeamRequest = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Team name is required'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Team name must be 100 characters or less'
      });
    }

    const team = await teamService.createTeam({ name: name.trim() });
    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    logger.error('POST /api/teams failed', { 
      teamName: req.body.name,
      error: (error as Error).message 
    });
    
    if ((error as Error).message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: (error as Error).message
      });
    }

    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * PUT /api/teams/:id
 * Update team
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const { name }: UpdateTeamRequest = req.body;
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Team name must be a non-empty string'
        });
      }

      if (name.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Team name must be 100 characters or less'
        });
      }
    }

    const updateData: UpdateTeamRequest = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }

    const team = await teamService.updateTeam(id, updateData);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    logger.error('PUT /api/teams/:id failed', { 
      teamId: req.params.id,
      error: (error as Error).message 
    });

    if ((error as Error).message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: (error as Error).message
      });
    }

    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/teams/:id/logo
 * Upload team logo
 */
router.post('/:id/logo', uploadTeamLogo, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Get current team to check if it has an existing logo
    const existingTeam = await teamService.getTeamById(id);
    if (!existingTeam) {
      // Delete uploaded file since team doesn't exist
      deleteFile(req.file.filename);
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Delete old logo if exists
    if (existingTeam.logo_path) {
      deleteFile(existingTeam.logo_path);
    }

    // Update team with new logo path
    const team = await teamService.updateTeamLogo(id, req.file.filename);
    
    res.json({
      success: true,
      data: team,
      message: 'Logo uploaded successfully'
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file) {
      deleteFile(req.file.filename);
    }

    logger.error('POST /api/teams/:id/logo failed', { 
      teamId: req.params.id,
      error: (error as Error).message 
    });

    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * DELETE /api/teams/:id
 * Delete team
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    // Get team to delete logo file
    const team = await teamService.getTeamById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    const deleted = await teamService.deleteTeam(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Delete logo file if exists
    if (team.logo_path) {
      deleteFile(team.logo_path);
    }

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    logger.error('DELETE /api/teams/:id failed', { 
      teamId: req.params.id,
      error: (error as Error).message 
    });

    if ((error as Error).message.includes('participated in games')) {
      return res.status(409).json({
        success: false,
        error: (error as Error).message
      });
    }

    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
