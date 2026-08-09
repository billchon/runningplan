-- Applied directly via Supabase MCP (2026-08-09) — kept here for the migration history record.
-- Persists the tracked GPS path so run-history can show a map preview of each run (PRD 4.4).
-- Previously the path only lived transiently in the run-tracking screen's draft store and was
-- discarded once run-result computed its aggregate stats.

alter table public.runs add column if not exists path jsonb;
