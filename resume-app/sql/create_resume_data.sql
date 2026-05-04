-- Resume Data table: stores rich structured data extracted from a user's resume.
-- Used by the autofill system to populate job application forms.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS resume_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Basic info
  full_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  github TEXT DEFAULT '',
  website TEXT DEFAULT '',
  location TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT '',

  -- Professional
  work_title TEXT DEFAULT '',
  years_experience INTEGER DEFAULT 0,
  summary TEXT DEFAULT '',

  -- Structured arrays
  skills JSONB DEFAULT '[]'::jsonb,
  tools JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  experience JSONB DEFAULT '[]'::jsonb,

  -- Extra
  work_authorization TEXT DEFAULT '',

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE resume_data ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users can read own resume_data"
  ON resume_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resume_data"
  ON resume_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resume_data"
  ON resume_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (used by API routes with service role key)
