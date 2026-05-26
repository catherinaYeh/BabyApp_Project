import express, { type Express, type Request } from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { openapiDocument } from './lib/openapi.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimit } from './middleware/rateLimit.js';
import { healthRouter } from './routes/health.js';
import { babyRouter } from './modules/babies/baby.routes.js';
import { foodRouter } from './modules/foods/food.routes.js';
import { feedingRouter } from './modules/feedings/feeding.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: (req as Request).id }),
      autoLogging: { ignore: (req) => req.url === '/healthz' },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use(healthRouter);

  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use('/api/v1', apiRateLimit);
  app.use('/api/v1/babies', babyRouter);
  app.use('/api/v1/foods', foodRouter);
  app.use('/api/v1/babies/:babyId/feedings', feedingRouter);
  // additional v1 resources (trials, achievements, dashboard) added in later phases

  app.use(errorHandler);
  return app;
}
