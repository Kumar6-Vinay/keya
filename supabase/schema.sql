-- Keya cloud backup schema (Supabase / Postgres).
-- Each family can read and write only its own rows (row-level security). Deleting a family deletes everything.
-- Run in the Supabase SQL editor. Choose the Mumbai region when creating the project.

create table if not exists families (
  id uuid primary key references auth.users(id) on delete cascade,
  consent_at timestamptz not null,
  consent_notice text not null,
  tz text not null default 'Asia/Kolkata',
  limit_min int not null default 12,
  created_at timestamptz not null default now()
);

create table if not exists children (
  id uuid primary key,
  family_id uuid not null references families(id) on delete cascade,
  nickname text not null check (char_length(nickname) <= 16),
  cls int not null check (cls between 1 and 5),
  lang text not null check (lang in ('en','hi')),
  avatar text not null,
  open_classes int[] not null default '{}'
);

create table if not exists skill_state (
  child_id uuid not null references children(id) on delete cascade,
  skill_id text not null,
  state text not null,
  p_known real not null,
  next_review date,
  review_step int not null default -1,
  mastered_on date,
  updated_on date,
  primary key (child_id, skill_id)
);

create table if not exists misconceptions (
  child_id uuid not null references children(id) on delete cascade,
  skill_id text not null,
  mistake text not null,
  items_seen int not null,
  first_seen date not null,
  last_seen date not null,
  primary key (child_id, skill_id, mistake)
);

create table if not exists sessions (
  id uuid primary key,
  child_id uuid not null references children(id) on delete cascade,
  day date not null,
  game text not null,
  minutes int not null,
  items int not null,
  alone int not null,
  grown text[] not null default '{}'
);

-- Per-item attempts: kept 90 days (see the cleanup job below), then only session summaries remain.
create table if not exists attempts (
  session_id uuid not null references sessions(id) on delete cascade,
  n int not null,
  child_id uuid not null references children(id) on delete cascade,
  skill_id text not null,
  correct boolean not null,
  hint int not null,
  mistake text,
  phase text not null,
  day date not null,
  primary key (session_id, n)
);

alter table families enable row level security;
alter table children enable row level security;
alter table skill_state enable row level security;
alter table misconceptions enable row level security;
alter table sessions enable row level security;
alter table attempts enable row level security;

create policy "own family" on families for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own children" on children for all using (family_id = auth.uid()) with check (family_id = auth.uid());

create or replace function owns_child(c uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from children where id = c and family_id = auth.uid()) $$;

create policy "own skill_state" on skill_state for all using (owns_child(child_id)) with check (owns_child(child_id));
create policy "own misconceptions" on misconceptions for all using (owns_child(child_id)) with check (owns_child(child_id));
create policy "own sessions" on sessions for all using (owns_child(child_id)) with check (owns_child(child_id));
create policy "own attempts" on attempts for all using (owns_child(child_id)) with check (owns_child(child_id));

-- Retention: drop per-item attempts after 90 days. Schedule daily with pg_cron (Database > Extensions > pg_cron).
-- select cron.schedule('prune-attempts', '30 2 * * *', $$ delete from attempts where day < current_date - 90 $$);
