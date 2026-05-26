import { Router } from 'express';
import { zodValidate } from '../../middleware/zodValidate.js';
import {
  babyCreateSchema,
  babyIdParamSchema,
  babyListQuerySchema,
  babyUpdateSchema,
} from './baby.schema.js';
import * as babyService from './baby.service.js';

export const babyRouter: Router = Router();

babyRouter.get('/', zodValidate({ query: babyListQuerySchema }), async (req, res, next) => {
  try {
    res.json(await babyService.listBabies(req.query as never));
  } catch (err) {
    next(err);
  }
});

babyRouter.post('/', zodValidate({ body: babyCreateSchema }), async (req, res, next) => {
  try {
    res.status(201).json(await babyService.createBaby(req.body));
  } catch (err) {
    next(err);
  }
});

babyRouter.get('/:babyId', zodValidate({ params: babyIdParamSchema }), async (req, res, next) => {
  try {
    res.json(await babyService.getBaby(req.params.babyId as string));
  } catch (err) {
    next(err);
  }
});

babyRouter.patch(
  '/:babyId',
  zodValidate({ params: babyIdParamSchema, body: babyUpdateSchema }),
  async (req, res, next) => {
    try {
      res.json(await babyService.updateBaby(req.params.babyId as string, req.body));
    } catch (err) {
      next(err);
    }
  },
);

babyRouter.delete(
  '/:babyId',
  zodValidate({ params: babyIdParamSchema }),
  async (req, res, next) => {
    try {
      await babyService.deleteBaby(req.params.babyId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
