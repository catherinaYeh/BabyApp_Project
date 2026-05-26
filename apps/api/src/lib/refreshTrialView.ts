import { prisma } from './prisma.js';
import { logger } from './logger.js';

/**
 * Refreshes baby_food_trial materialized view. Uses CONCURRENTLY so reads aren't blocked.
 * Requires unique index on (baby_id, food_id) — provided by migration 2.
 *
 * In Jest tests we run inside a single-connection client which CONCURRENTLY also
 * needs (no open transaction). Fallback to plain REFRESH if CONCURRENTLY fails.
 */
export async function refreshTrialView(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY baby_food_trial');
  } catch (err) {
    logger.warn(
      { err },
      'CONCURRENTLY refresh failed; falling back to blocking REFRESH MATERIALIZED VIEW',
    );
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW baby_food_trial');
  }
}
