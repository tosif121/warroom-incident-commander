-- CODE CRITIC: PRODUCTION SCHEMA 🚀
-- "The UI Strikes Back" Fresh Start

-- 1. CLEAN SLATE
-- This will wipe any existing Code Critic tables to ensure a clean install.
DROP PUBLICATION IF EXISTS supabase_realtime;
DROP TABLE IF EXISTS code_issues CASCADE;
DROP TABLE IF EXISTS code_reviews CASCADE;

-- 2. REVIEWS (The Roast Session)
CREATE TABLE code_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  repo_url TEXT,
  code_snippet TEXT NOT NULL,
  language TEXT DEFAULT 'javascript',
  roast_level TEXT DEFAULT 'medium', -- gentle, medium, savage
  status TEXT DEFAULT 'analyzing' -- analyzing, complete
);

-- 3. ISSUES (The Critique & Generative Widgets)
CREATE TABLE code_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES code_reviews(id) ON DELETE CASCADE,
  issue_type TEXT, -- security, performance, style, logic
  severity TEXT, -- critical, high, medium, low
  title TEXT,
  roast TEXT, -- The funny critique
  explanation TEXT, -- Serious explanation
  code_snippet TEXT, -- Specific line/block
  suggested_fix TEXT,
  widget_type TEXT, -- SecurityBomb, SpaghettiMeter, PerformanceTurtle
  widget_config JSONB DEFAULT '{}'::jsonb, -- Config for the Generative Widget
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ENABLE REALTIME (Multiplayer Magic)
ALTER TABLE code_reviews REPLICA IDENTITY FULL;
ALTER TABLE code_issues REPLICA IDENTITY FULL;

CREATE PUBLICATION supabase_realtime FOR TABLE code_reviews, code_issues;
