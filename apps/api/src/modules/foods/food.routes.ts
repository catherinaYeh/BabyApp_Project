import { Router } from 'express';
import { zodValidate } from '../../middleware/zodValidate.js';
import {
  foodCreateSchema,
  foodIdParamSchema,
  foodListQuerySchema,
  foodUpdateSchema,
} from './food.schema.js';
import * as foodService from './food.service.js';

export const foodRouter: Router = Router();

foodRouter.get('/', zodValidate({ query: foodListQuerySchema }), async (req, res, next) => {
  try {
    res.json(await foodService.listFoods(req.query as never));
  } catch (err) {
    next(err);
  }
});

foodRouter.post('/', zodValidate({ body: foodCreateSchema }), async (req, res, next) => {
  try {
    res.status(201).json(await foodService.createFood(req.body));
  } catch (err) {
    next(err);
  }
});

foodRouter.get('/:foodId', zodValidate({ params: foodIdParamSchema }), async (req, res, next) => {
  try {
    res.json(await foodService.getFood(req.params.foodId as string));
  } catch (err) {
    next(err);
  }
});

foodRouter.patch(
  '/:foodId',
  zodValidate({ params: foodIdParamSchema, body: foodUpdateSchema }),
  async (req, res, next) => {
    try {
      res.json(await foodService.updateFood(req.params.foodId as string, req.body));
    } catch (err) {
      next(err);
    }
  },
);

foodRouter.delete(
  '/:foodId',
  zodValidate({ params: foodIdParamSchema }),
  async (req, res, next) => {
    try {
      await foodService.deleteFood(req.params.foodId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
