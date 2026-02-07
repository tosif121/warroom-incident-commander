-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.code_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  session_id text NOT NULL UNIQUE,
  repo_url text,
  github_url text,
  code_snippet text NOT NULL,
  language text DEFAULT 'javascript'::text,
  roast_level text DEFAULT 'medium'::text CHECK (roast_level = ANY (ARRAY['gentle'::text, 'medium'::text, 'savage'::text])),
  status text DEFAULT 'analyzing'::text CHECK (status = ANY (ARRAY['analyzing'::text, 'complete'::text, 'failed'::text])),
  overall_score integer CHECK (overall_score >= 0 AND overall_score <= 100),
  security_score integer CHECK (security_score >= 0 AND security_score <= 100),
  performance_score integer CHECK (performance_score >= 0 AND performance_score <= 100),
  maintainability_score integer CHECK (maintainability_score >= 0 AND maintainability_score <= 100),
  badge text CHECK (badge = ANY (ARRAY['🏆 Code Master'::text, '💪 Getting There'::text, '🔥 Needs Work'::text, '💀 Please Refactor'::text])),
  total_issues integer DEFAULT 0,
  critical_issues integer DEFAULT 0,
  CONSTRAINT code_reviews_pkey PRIMARY KEY (id)
);

CREATE TABLE public.code_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  issue_type text NOT NULL CHECK (issue_type = ANY (ARRAY['security'::text, 'performance'::text, 'complexity'::text, 'logic'::text, 'style'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])),
  title text NOT NULL,
  roast text NOT NULL,
  explanation text NOT NULL,
  line_number integer,
  problematic_code text,
  suggested_fix text,
  widget_type text NOT NULL DEFAULT 'GenericRoast'::text CHECK (widget_type = ANY (ARRAY['SecurityBomb'::text, 'SpaghettiMeter'::text, 'PerformanceTurtle'::text, 'GenericRoast'::text])),
  widget_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  impact_score integer DEFAULT 0 CHECK (impact_score >= 0 AND impact_score <= 100),
  CONSTRAINT code_issues_pkey PRIMARY KEY (id),
  CONSTRAINT code_issues_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.code_reviews(id)
);