/**
 * API routes for game management
 */

import express from 'express';
import { gameService } from '../services/gameService';
import { ApiError } from '../utils/ApiError';
import { CreateGameRequest } from '../../../shared/types';
import { io } from '../server';
import { broadcastGameStatusChange, broadcastRoundChange, broadcastScoresUpdate } from '../services/socketService';

const router = express.Router();

// GET /api/games - Get all games
router.get('/', async (req, res, next) => {
  try {
    const games = await gameService.getGames();
    res.json({ success: true, data: games });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/games/:id - Delete game
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid game ID' });
    }
    const ok = await gameService.deleteGame(id);
    if (!ok) return res.status(404).json({ success: false, error: 'Game not found' });
    res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:id - Get a single game by ID
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ApiError('Invalid game ID', 400);
    }
    const game = await gameService.getGameById(id);
    if (!game) {
      throw new ApiError('Game not found', 404);
    }
    res.json({ success: true, data: game });
  } catch (error) {
    next(error);
  }
});

// POST /api/games - Create a new game
router.post('/', async (req, res, next) => {
  try {
    const createGameData: CreateGameRequest = req.body;
    
    if (!createGameData.name || !createGameData.template_id || !createGameData.team_ids?.length) {
      throw new ApiError('Missing required fields for game creation', 400);
    }

    const newGame = await gameService.createGame(createGameData);
    res.status(201).json({ success: true, data: newGame });
  } catch (error) {
    next(error);
  }
});

// PUT /api/games/:id/participants - Update participants table numbers
router.put('/:id/participants', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ApiError('Invalid game ID', 400);
    }

    const updates = req.body as { team_id: number; table_number: string | null }[];
    const result = await gameService.updateParticipants(id, updates);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PUT /api/games/:id/status - Start/Finish game
router.put('/:id/status', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body as { status: 'created'|'active'|'finished' };
    if (isNaN(id) || !status) throw new ApiError('Invalid payload', 400);
    const game = await gameService.updateStatus(id, status);
    broadcastGameStatusChange(io, id, status);
    res.json({ success: true, data: game });
  } catch (error) {
    next(error);
  }
});

// PUT /api/games/:id/round - Switch round
router.put('/:id/round', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { current_round } = req.body as { current_round: number };
    if (isNaN(id) || current_round === undefined) throw new ApiError('Invalid payload', 400);
    const game = await gameService.updateRound(id, current_round);
    broadcastRoundChange(io, id, current_round);
    res.json({ success: true, data: game });
  } catch (error) {
    next(error);
  }
});

// POST /api/games/:id/scores - Upsert score
router.post('/:id/scores', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { team_id, round_number, score } = req.body as { team_id: number; round_number: number; score: number };
    if (isNaN(id) || team_id === undefined || round_number === undefined || score === undefined) throw new ApiError('Invalid payload', 400);
    const result = await gameService.upsertScore(id, team_id, round_number, score);
    // broadcast full scores list after update
    const rows = await gameService.getScores(id);
    broadcastScoresUpdate(io, id, rows as any[]);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:id/scores - Get all scores
router.get('/:id/scores', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new ApiError('Invalid game ID', 400);
    const rows = await gameService.getScores(id);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

export default router;
