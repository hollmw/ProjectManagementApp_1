-- ─────────────────────────────────────────────────────────────────────────────
-- Notion → DRESIO project import
-- Idempotent: skips any project whose notion_page_id already exists.
-- Run this in Supabase SQL Editor → New query → Run.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_id   UUID;
  v_area UUID;
BEGIN

  -- ── 1. Lark Tool ─────────────────────────────────────────────────────────
  -- Status: Done | Team: Tech | 2026-05-05 → 2026-05-15
  SELECT id INTO v_area FROM areas WHERE name = 'Tech' LIMIT 1;

  INSERT INTO tasks (title, status, start_date, due_date, description, notion_page_id, area_id)
  SELECT
    'Lark Tool',
    'done',
    '2026-05-05',
    '2026-05-15',
    'Build a meeting recording to transcript to notes AI tool',
    '3578120c9cff819d9b92ff6a8388b4af',
    v_area
  WHERE NOT EXISTS (
    SELECT 1 FROM tasks WHERE notion_page_id = '3578120c9cff819d9b92ff6a8388b4af'
  )
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    INSERT INTO task_areas (task_id, area_id) VALUES (v_id, v_area) ON CONFLICT DO NOTHING;

    INSERT INTO breakdowns (task_id, title, is_checked, order_index) VALUES
      (v_id, 'Research Whisper',                true,  0),
      (v_id, 'Research Notion''s meeting AI',   true,  1),
      (v_id, 'Research Lark developer tooling', true,  2),
      (v_id, 'Build',                           true,  3),
      (v_id, 'Present',                         true,  4);

    RAISE NOTICE 'Imported: Lark Tool (%)', v_id;
  ELSE
    RAISE NOTICE 'Skipped (already exists): Lark Tool';
  END IF;

  -- ── 2. Research AI Models ─────────────────────────────────────────────────
  -- Status: In progress | Team: Tech | 2026-05-05 → 2026-05-15
  SELECT id INTO v_area FROM areas WHERE name = 'Tech' LIMIT 1;

  INSERT INTO tasks (title, status, start_date, due_date, description, notion_page_id, area_id)
  SELECT
    'Research AI Models',
    'in_progress',
    '2026-05-05',
    '2026-05-15',
    'Research 3D reconstruction AI models like Depth Anything and Sam4DCap',
    '3578120c9cff81aab6faffbe44a71d45',
    v_area
  WHERE NOT EXISTS (
    SELECT 1 FROM tasks WHERE notion_page_id = '3578120c9cff81aab6faffbe44a71d45'
  )
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    INSERT INTO task_areas (task_id, area_id) VALUES (v_id, v_area) ON CONFLICT DO NOTHING;

    INSERT INTO breakdowns (task_id, title, is_checked, order_index) VALUES
      (v_id, 'Research Depth Anything',           false, 0),
      (v_id, 'Research Sam4DCap',                 false, 1),
      (v_id, 'Research existing/potential models', false, 2),
      (v_id, 'Play around with it',               false, 3),
      (v_id, 'Small presentation',                false, 4);

    RAISE NOTICE 'Imported: Research AI Models (%)', v_id;
  ELSE
    RAISE NOTICE 'Skipped (already exists): Research AI Models';
  END IF;

  -- ── 3. do stuff ───────────────────────────────────────────────────────────
  -- Status: In progress | Team: Business | 2026-05-15 → 2026-05-22
  SELECT id INTO v_area FROM areas WHERE name = 'Business' LIMIT 1;

  INSERT INTO tasks (title, status, start_date, due_date, description, notion_page_id, area_id)
  SELECT
    'do stuff',
    'in_progress',
    '2026-05-15',
    '2026-05-22',
    NULL,
    '3618120c9cff81b092bdf26cde158561',
    v_area
  WHERE NOT EXISTS (
    SELECT 1 FROM tasks WHERE notion_page_id = '3618120c9cff81b092bdf26cde158561'
  )
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    INSERT INTO task_areas (task_id, area_id) VALUES (v_id, v_area) ON CONFLICT DO NOTHING;

    INSERT INTO breakdowns (task_id, title, is_checked, order_index) VALUES
      (v_id, 'do stuff 1', false, 0),
      (v_id, 'do stuff 2', false, 1),
      (v_id, 'do stuff 3', false, 2);

    RAISE NOTICE 'Imported: do stuff (%)', v_id;
  ELSE
    RAISE NOTICE 'Skipped (already exists): do stuff';
  END IF;

END $$;
