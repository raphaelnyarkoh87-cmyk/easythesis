-- EasyThesis database: Stage 5 (writing engine)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

-- Text read from each upload, saved so files are only read once.
alter table public.documents add column if not exists extracted_text text;
alter table public.documents add column if not exists extract_note text;

-- Which writing engine produced a draft, for honesty and quality tracking.
alter table public.chapters add column if not exists drafted_with text;

-- A drafting session covers one chapter for two hours, counted once.
alter table public.usage_events add column if not exists chapter int;
