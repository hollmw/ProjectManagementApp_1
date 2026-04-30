-- Add notion_page_id to tasks so we can update existing Notion pages
-- rather than creating duplicates on every sync.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS notion_page_id TEXT DEFAULT NULL;
