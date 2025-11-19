/**
 * Public API routes (read-only)
 */
import { Router } from 'express';
import { statsService } from '../services/statsService';

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

export default router;


