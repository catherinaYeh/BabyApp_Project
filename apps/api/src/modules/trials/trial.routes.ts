import { Router } from 'express';
import { z } from 'zod';
import { zodValidate } from '../../middleware/zodValidate.js';
import { recommendationQuerySchema, trialListQuerySchema } from './trial.schema.js';
import * as trialService from './trial.service.js';

const babyParam = z.object({ babyId: z.string().uuid('babyId must be a UUID') });

// Mounted at /api/v1/babies/:babyId
export const trialRouter: Router = Router({ mergeParams: true });

trialRouter.get(
  '/trials',
  zodValidate({ params: babyParam, query: trialListQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(await trialService.listTrials(req.params.babyId as string, req.query as never));
    } catch (err) {
      next(err);
    }
  },
);

trialRouter.get(
  '/recommendations',
  zodValidate({ params: babyParam, query: recommendationQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(
        await trialService.getRecommendations(req.params.babyId as string, req.query as never),
      );
    } catch (err) {
      next(err);
    }
  },
);
