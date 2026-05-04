-- Study Plans table: caches the AI-generated study plan per user so the
-- page can hydrate from the DB instead of re-running the AI on every visit.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- The user's prompt that produced this plan
  prompt TEXT NOT NULL DEFAULT '',

  -- AI output
  overview TEXT DEFAULT '',
  chapters JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Snapshot of the base resume used to build this plan.
  -- When the user's current base resume id differs, the plan is stale.
  resume_id UUID,

  -- Metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS study_plans_user_id_idx ON study_plans(user_id);

-- Enable RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own plan
CREATE POLICY "Users can read own study_plan"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study_plan"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study_plan"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study_plan"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (used by API routes with service role key).
