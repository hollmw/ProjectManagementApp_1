-- Track when a user was invited so we can show "Pending invite" in the UI
-- until they click the link and log in for the first time.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NULL;
