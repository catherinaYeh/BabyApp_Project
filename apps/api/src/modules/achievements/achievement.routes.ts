import { Router } from 'express';
import { z } from 'zod';
import { zodValidate } from '../../middleware/zodValidate.js';
import * as achService from './achievement.service.js';

const babyParam = z.object({ babyId: z.string().uuid('babyId must be a UUID') });

// /api/v1/achievements (global)
export const achievementRouter: Router = Router();

achievementRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await achService.listAchievements());
  } catch (err) {
    next(err);
  }
});

// /api/v1/babies/:babyId/achievements (scoped, mounted with mergeParams)
export const babyAchievementRouter: Router = Router({ mergeParams: true });

babyAchievementRouter.get('/', zodValidate({ params: babyParam }), async (req, res, next) => {
  try {
    res.json(await achService.listBabyAchievements(req.params.babyId as string));
  } catch (err) {
    next(err);
  }
});
