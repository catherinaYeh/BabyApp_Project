import { Router } from 'express';
import { zodValidate } from '../../middleware/zodValidate.js';
import {
  babyOnlyParamSchema,
  feedingCreateSchema,
  feedingListQuerySchema,
  feedingUpdateSchema,
} from './feeding.schema.js';
import { z } from 'zod';
import * as feedingService from './feeding.service.js';

// Sub-router mounted at /api/v1/babies/:babyId/feedings
export const feedingRouter: Router = Router({ mergeParams: true });

const babyAndFeedingParam = z.object({
  babyId: z.string().uuid('babyId must be a UUID'),
  feedingId: z.string().uuid('feedingId must be a UUID'),
});

feedingRouter.get(
  '/',
  zodValidate({ params: babyOnlyParamSchema, query: feedingListQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(await feedingService.listFeedings(req.params.babyId as string, req.query as never));
    } catch (err) {
      next(err);
    }
  },
);

feedingRouter.post(
  '/',
  zodValidate({ params: babyOnlyParamSchema, body: feedingCreateSchema }),
  async (req, res, next) => {
    try {
      const result = await feedingService.createFeeding(req.params.babyId as string, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

feedingRouter.get(
  '/:feedingId',
  zodValidate({ params: babyAndFeedingParam }),
  async (req, res, next) => {
    try {
      res.json(
        await feedingService.getFeeding(
          req.params.babyId as string,
          req.params.feedingId as string,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

feedingRouter.patch(
  '/:feedingId',
  zodValidate({ params: babyAndFeedingParam, body: feedingUpdateSchema }),
  async (req, res, next) => {
    try {
      res.json(
        await feedingService.updateFeeding(
          req.params.babyId as string,
          req.params.feedingId as string,
          req.body,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

feedingRouter.delete(
  '/:feedingId',
  zodValidate({ params: babyAndFeedingParam }),
  async (req, res, next) => {
    try {
      await feedingService.deleteFeeding(
        req.params.babyId as string,
        req.params.feedingId as string,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
