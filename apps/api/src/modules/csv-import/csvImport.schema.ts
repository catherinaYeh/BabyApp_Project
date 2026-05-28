import { z } from 'zod';

export const csvImportQuerySchema = z.object({
  dryRun: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

export type CsvImportQuery = z.infer<typeof csvImportQuerySchema>;
