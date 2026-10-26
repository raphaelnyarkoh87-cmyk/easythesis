-- EasyThesis database: Stage 3
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; it updates what already exists.

-- ---------------------------------------------------------------
-- Plan limits. The app's pricing page reads src/lib/plans.ts;
-- keep these numbers the same. NULL means unlimited.
-- ---------------------------------------------------------------
create table if not exists public.plan_limits (
  plan text primary key check (plan in ('free', 'premium')),
  projects int,
  uploads int,
  chapter_drafts_per_month int,
  literature_searches_per_month int,
  chapters int[] not null
);

insert into public.plan_limits values
  ('free',    1,    2,    2,    10,   array[1]),
  ('premium', null, null, null, null, array[1,2,3,4,5])
on conflict (plan) do update set
  projects = excluded.projects,
  uploads = excluded.uploads,
  chapter_drafts_per_month = excluded.chapter_drafts_per_month,
  literature_searches_per_month = excluded.literature_searches_per_month,
  chapters = excluded.chapters;

alter table public.plan_limits enable row level security;
drop policy if exists "Anyone can read plan limits" on public.plan_limits;
create policy "Anyone can read plan limits" on public.plan_limits
  for select using (true);

-- ---------------------------------------------------------------
-- Profiles: one per user. Plan fields are changed only by the
-- server after a verified payment, never by the user.
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  plan text not null default 'free' check (plan in ('free', 'premium')),
  premium_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Users may change their name only.
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The plan a user actually has right now (Premium lapses automatically).
create or replace function public.effective_plan(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when p.plan = 'premium' and p.premium_until is not null and p.premium_until > now()
      then 'premium'
    else 'free'
  end
  from public.profiles p
  where p.id = uid
$$;

-- Only used inside the database; users cannot look up anyone's plan.
revoke execute on function public.effective_plan(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Projects (one per thesis)
-- ---------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 10 and 500),
  discipline text not null,
  level text not null,
  approach text not null,
  referencing text not null,
  institution text,
  objectives text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;
drop policy if exists "Owners manage projects" on public.projects;
create policy "Owners manage projects" on public.projects
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- Free plan: limited number of projects.
create or replace function public.enforce_project_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  max_projects int;
  current_count int;
begin
  select l.projects into max_projects
  from public.plan_limits l
  where l.plan = public.effective_plan(new.user_id);
  if max_projects is not null then
    select count(*) into current_count from public.projects where user_id = new.user_id;
    if current_count >= max_projects then
      raise exception 'PLAN_LIMIT_PROJECTS' using hint = 'Get Premium to create more thesis projects.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists projects_limit on public.projects;
create trigger projects_limit before insert on public.projects
  for each row execute function public.enforce_project_limit();

-- ---------------------------------------------------------------
-- Chapters (five per project, created automatically)
-- ---------------------------------------------------------------
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  number int not null check (number between 1 and 5),
  status text not null default 'not_started' check (status in ('not_started', 'outlined', 'drafted')),
  sections jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

alter table public.chapters enable row level security;
drop policy if exists "Owners read chapters" on public.chapters;
create policy "Owners read chapters" on public.chapters
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "Owners edit chapters" on public.chapters;
create policy "Owners edit chapters" on public.chapters
  for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

drop trigger if exists chapters_touch on public.chapters;
create trigger chapters_touch before update on public.chapters
  for each row execute function public.touch_updated_at();

create or replace function public.create_chapters()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.chapters (project_id, number)
  select new.id, n from generate_series(1, 5) as n
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists projects_chapters on public.projects;
create trigger projects_chapters after insert on public.projects
  for each row execute function public.create_chapters();

-- ---------------------------------------------------------------
-- Sources. Written only by the server after DOI checks (Stage 4),
-- so users cannot mark an unchecked source as verified.
-- ---------------------------------------------------------------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  authors text[] not null default '{}',
  year int,
  title text not null,
  venue text,
  volume text,
  issue text,
  pages text,
  doi text,
  abstract text,
  retrieved_from text not null check (retrieved_from in ('OpenAlex', 'Semantic Scholar', 'Crossref', 'Consensus', 'Uploaded')),
  verification text not null default 'unverified' check (verification in ('verified', 'unverified', 'not_found')),
  created_at timestamptz not null default now(),
  unique (project_id, doi)
);

alter table public.sources enable row level security;
drop policy if exists "Owners read sources" on public.sources;
create policy "Owners read sources" on public.sources
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "Owners remove sources" on public.sources;
create policy "Owners remove sources" on public.sources
  for delete to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

-- ---------------------------------------------------------------
-- Uploaded documents (files live in the private "documents" bucket)
-- ---------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  size_bytes bigint not null check (size_bytes <= 20971520),
  kind text not null check (kind in ('proposal', 'data', 'literature', 'other')),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;
drop policy if exists "Owners manage documents" on public.documents;
create policy "Owners manage documents" on public.documents
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    and storage_path like auth.uid()::text || '/%'
  );

create or replace function public.enforce_upload_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  max_uploads int;
  current_count int;
begin
  select l.uploads into max_uploads
  from public.plan_limits l
  where l.plan = public.effective_plan(new.user_id);
  if max_uploads is not null then
    select count(*) into current_count from public.documents where user_id = new.user_id;
    if current_count >= max_uploads then
      raise exception 'PLAN_LIMIT_UPLOADS' using hint = 'Get Premium for unlimited uploads.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists documents_limit on public.documents;
create trigger documents_limit before insert on public.documents
  for each row execute function public.enforce_upload_limit();

-- ---------------------------------------------------------------
-- Usage events (chapter drafts, literature searches).
-- Recorded only by the server in Stages 4 and 5.
-- ---------------------------------------------------------------
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('chapter_draft', 'literature_search')),
  project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists usage_user_month_idx on public.usage_events (user_id, kind, created_at);

alter table public.usage_events enable row level security;
drop policy if exists "Users read own usage" on public.usage_events;
create policy "Users read own usage" on public.usage_events
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- Payments. Written only by the server after Paystack confirms (Stage 6).
-- ---------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reference text not null unique,
  amount_pesewas int not null,
  currency text not null default 'GHS',
  channel text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'abandoned')),
  days_granted int not null default 30,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments" on public.payments
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- One call for the dashboard: plan, limits and this month's usage
-- ---------------------------------------------------------------
create or replace function public.my_account()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'full_name', p.full_name,
    'plan', public.effective_plan(p.id),
    'premium_until', p.premium_until,
    'projects', (select count(*) from public.projects where user_id = p.id),
    'uploads', (select count(*) from public.documents where user_id = p.id),
    'chapter_drafts', (select count(*) from public.usage_events
                       where user_id = p.id and kind = 'chapter_draft'
                         and created_at >= date_trunc('month', now())),
    'literature_searches', (select count(*) from public.usage_events
                            where user_id = p.id and kind = 'literature_search'
                              and created_at >= date_trunc('month', now()))
  )
  from public.profiles p
  where p.id = auth.uid()
$$;

revoke execute on function public.my_account() from anon;
grant execute on function public.my_account() to authenticated;

-- ---------------------------------------------------------------
-- File storage: private bucket, each user only sees their own folder
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

drop policy if exists "Users upload own files" on storage.objects;
create policy "Users upload own files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users read own files" on storage.objects;
create policy "Users read own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own files" on storage.objects;
create policy "Users delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
