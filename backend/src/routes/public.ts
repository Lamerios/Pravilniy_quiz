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
    const data = await statsService.getStats();
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


