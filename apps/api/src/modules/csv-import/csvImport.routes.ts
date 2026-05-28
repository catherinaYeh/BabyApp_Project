import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { zodValidate } from '../../middleware/zodValidate.js';
import { HttpError } from '../../lib/problems.js';
import { csvImportQuerySchema } from './csvImport.schema.js';
import { importFeedingsFromCsv } from './csvImport.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },
});

const babyParam = z.object({ babyId: z.string().uuid('babyId must be a UUID') });

// Mounted at /api/v1/babies/:babyId/feedings
export const csvImportRouter: Router = Router({ mergeParams: true });

csvImportRouter.post(
  '/import',
  upload.single('file'),
  zodValidate({ params: babyParam, query: csvImportQuerySchema }),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new HttpError(400, 'Bad Request', 'file field is required');
      }
      const result = await importFeedingsFromCsv(req.params.babyId as string, req.file.buffer, {
        dryRun: (req.query as { dryRun?: boolean }).dryRun ?? false,
      });
      res.json(result);
    } catch (err) {
      // Translate multer's file-size error to a friendly 400.
      const e = err as { code?: string };
      if (e.code === 'LIMIT_FILE_SIZE') {
        next(new HttpError(400, 'Bad Request', 'file exceeds 2 MB limit'));
        return;
      }
      next(err);
    }
  },
);
