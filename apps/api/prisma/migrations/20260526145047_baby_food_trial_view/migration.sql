-- Materialized view: per-baby per-food trial status
-- Derives status from feeding_record (event stream) instead of storing on rows.
CREATE MATERIALIZED VIEW baby_food_trial AS
SELECT
  b.id  AS baby_id,
  f.id  AS food_id,
  COUNT(fr.id)                       AS attempts,
  MAX(fr.fed_at)                     AS last_fed_at,
  BOOL_OR(fr.reaction <> 'NONE')     AS has_reaction,
  CASE
    WHEN COUNT(fr.id) = 0                 THEN 'UNTRIED'
    WHEN BOOL_OR(fr.reaction <> 'NONE')   THEN 'ALLERGIC'
    WHEN COUNT(fr.id) >= 3                THEN 'UNLOCKED'
    ELSE                                       'TRYING'
  END                                AS status
FROM baby b
CROSS JOIN food_item f
LEFT JOIN feeding_record fr
  ON fr.baby_id = b.id AND fr.food_id = f.id
GROUP BY b.id, f.id;

-- Required by REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX baby_food_trial_unique
  ON baby_food_trial (baby_id, food_id);

-- Secondary indexes for common filters
CREATE INDEX baby_food_trial_baby_status_idx
  ON baby_food_trial (baby_id, status);
