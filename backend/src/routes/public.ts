/**
 * Public API routes (read-only)
 */
import { Router } from 'express';
import { statsService } from '../services/statsService';
import { gameService } from '../services/gameService';

const router = Router();

router.get('/last-game', async (req, res, next) => {
  try {
    const data = await statsService.getLastGame();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const { season } = req.query as any;
    const seasonNum = season ? Number(season) : undefined;
    const data = await statsService.getStats(seasonNum);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/ranking', async (req, res, next) => {
  try {
    const { sort, order, page, limit, season } = req.query as any;
    const data = await statsService.getGlobalRanking({ sort, order, page: Number(page), limit: Number(limit), season: season ? Number(season) : undefined });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/teams', async (req, res, next) => {
  try {
    const { page, limit } = req.query as any;
    const data = await statsService.getTeamsPaginated({ page: Number(page), limit: Number(limit) });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/teams/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await statsService.getTeamProfile(id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/games/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid game ID' });
    }
    const game = await gameService.getGameById(id);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    res.json({ success: true, data: game });
  } catch (e) {
    next(e);
  }
});

router.get('/games/:id/scores', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid game ID' });
    }
    const scores = await gameService.getScores(id);
    res.json({ success: true, data: scores });
  } catch (e) {
    next(e);
  }
});

export default router;


