import { Router } from 'express';
import { z } from 'zod';
import { zodValidate } from '../../middleware/zodValidate.js';
import * as dashboardService from './dashboard.service.js';

const babyParam = z.object({ babyId: z.string().uuid('babyId must be a UUID') });

// Mounted at /api/v1/babies/:babyId
export const dashboardRouter: Router = Router({ mergeParams: true });

dashboardRouter.get('/dashboard', zodValidate({ params: babyParam }), async (req, res, next) => {
  try {
    res.json(await dashboardService.getDashboard(req.params.babyId as string));
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/progress', zodValidate({ params: babyParam }), async (req, res, next) => {
  try {
    res.json(await dashboardService.getProgress(req.params.babyId as string));
  } catch (err) {
    next(err);
  }
});
