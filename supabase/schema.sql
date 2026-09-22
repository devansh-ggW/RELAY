-- Relay production schema. Run once in Supabase SQL Editor for a fresh environment.
create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('seeker','employer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_type as enum ('Full-time','Part-time','Freelance','Contract');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'seeker',
  name text not null,
  email text,
  city text,
  state text,
  about text,
  headline text,
  skills text[] not null default '{}',
  phone text,
  date_of_birth date,
  age integer,
  age_confirmed boolean not null default false,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  onboarding_complete boolean not null default false,
  experience_years integer,
  avatar_url text,
  profile_public boolean not null default true,
  available_for_work boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company text not null,
  category text not null,
  location text not null,
  state text,
  mode text not null check (mode in ('Remote','Hybrid','On-site')),
  type public.job_type not null,
  salary text not null,
  skills text[] not null default '{}',
  description text not null,
  application_url text,
  owner_name text,
  min_age integer not null default 18,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'Applied' check (status in ('Applied','Reviewing','Interview','Offer','Rejected')),
  cover_note text,
  created_at timestamptz not null default now(),
  unique(job_id, applicant_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  employer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_unique_pair unique(job_id, seeker_id, employer_id),
  constraint conversations_distinct_people check (seeker_id <> employer_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_jobs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table if not exists public.profile_public (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text not null,
  headline text,
  city text,
  state text,
  skills text[] not null default '{}',
  about text,
  experience_years integer,
  avatar_url text,
  profile_public boolean not null default true,
  available_for_work boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.profile_public enable row level security;

drop policy if exists profile_public_select_employers on public.profile_public;
create policy profile_public_select_employers on public.profile_public
for select to authenticated
using (
  profile_public = true
  and available_for_work = true
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'employer'
      and p.age_confirmed = true
      and p.onboarding_complete = true
  )
);

alter table public.applications
  add column if not exists applicant_name text,
  add column if not exists applicant_headline text,
  add column if not exists applicant_city text,
  add column if not exists applicant_state text,
  add column if not exists applicant_skills text[] not null default '{}',
  add column if not exists applicant_about text,
  add column if not exists applicant_experience_years integer;

create or replace function public.sync_profile_public()
returns trigger
language plpgsql
security definer set search_path = public
as $
begin
  insert into public.profile_public (id,name,headline,city,state,skills,about,experience_years,avatar_url,profile_public,available_for_work,updated_at)
  values (new.id,new.name,new.headline,new.city,new.state,new.skills,new.about,new.experience_years,new.avatar_url,new.profile_public,new.available_for_work,now())
  on conflict (id) do update set
    name=excluded.name, headline=excluded.headline, city=excluded.city, state=excluded.state,
    skills=excluded.skills, about=excluded.about, experience_years=excluded.experience_years,
    avatar_url=excluded.avatar_url, profile_public=excluded.profile_public, available_for_work=excluded.available_for_work, updated_at=now();
  return new;
end;
$;

drop trigger if exists sync_profile_public_trigger on public.profiles;
create trigger sync_profile_public_trigger
after insert or update of name,headline,city,state,skills,about,experience_years,avatar_url,profile_public,available_for_work
on public.profiles
for each row execute procedure public.sync_profile_public();

insert into public.profile_public (id,name,headline,city,state,skills,about,experience_years,avatar_url,profile_public,available_for_work)
select id,name,headline,city,state,skills,about,experience_years,avatar_url,profile_public,available_for_work
from public.profiles
on conflict (id) do update set
  name=excluded.name, headline=excluded.headline, city=excluded.city, state=excluded.state,
  skills=excluded.skills, about=excluded.about, experience_years=excluded.experience_years,
  avatar_url=excluded.avatar_url, available_for_work=excluded.available_for_work, updated_at=now();

create or replace function public.snapshot_application_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $
begin
  select p.name,p.headline,p.city,p.state,p.skills,p.about,p.experience_years
  into new.applicant_name,new.applicant_headline,new.applicant_city,new.applicant_state,new.applicant_skills,new.applicant_about,new.applicant_experience_years
  from public.profiles p where p.id = new.applicant_id;
  return new;
end;
$;

drop trigger if exists snapshot_application_profile_trigger on public.applications;
create trigger snapshot_application_profile_trigger
before insert on public.applications
for each row execute procedure public.snapshot_application_profile();

revoke execute on function public.sync_profile_public() from public,anon,authenticated;
revoke execute on function public.snapshot_application_profile() from public,anon,authenticated;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('job','profile','message','application')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.reports enable row level security;

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age is null or age between 18 and 100);
alter table public.profiles drop constraint if exists profiles_onboarding_gate;
alter table public.profiles add constraint profiles_onboarding_gate check (
  onboarding_complete = false
  or (
    age between 18 and 100
    and age_confirmed = true
    and terms_accepted_at is not null
    and privacy_accepted_at is not null
  )
);

drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_select_allowed on public.profiles;
drop policy if exists profiles_select_employer_directory on public.profiles;
create policy profiles_select_self on public.profiles
for select to authenticated
using (id = (select auth.uid()));

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists jobs_select_authenticated on public.jobs;
drop policy if exists jobs_select_open on public.jobs;
create policy jobs_select_open on public.jobs
for select to anon, authenticated
using (status = 'open' or owner_id = (select auth.uid()));

drop policy if exists jobs_insert_employer on public.jobs;
create policy jobs_insert_employer on public.jobs
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'employer'
      and p.age_confirmed = true
      and p.onboarding_complete = true
  )
);

drop policy if exists jobs_update_owner on public.jobs;
create policy jobs_update_owner on public.jobs
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists jobs_delete_owner on public.jobs;
create policy jobs_delete_owner on public.jobs
for delete to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists applications_select_participants on public.applications;
create policy applications_select_participants on public.applications
for select to authenticated
using (
  applicant_id = (select auth.uid())
  or exists (
    select 1 from public.jobs j
    where j.id = job_id and j.owner_id = (select auth.uid())
  )
);

drop policy if exists applications_insert_self on public.applications;
create policy applications_insert_self on public.applications
for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and exists (
    select 1
    from public.jobs j
    join public.profiles p on p.id = (select auth.uid())
    where j.id = job_id
      and j.status = 'open'
      and p.role = 'seeker'
      and p.age_confirmed = true
      and p.onboarding_complete = true
  )
);

drop policy if exists applications_update_employer on public.applications;
create policy applications_update_employer on public.applications
for update to authenticated
using (
  exists (
    select 1 from public.jobs j
    where j.id = job_id and j.owner_id = (select auth.uid())
  )
);

drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants on public.conversations
for select to authenticated
using (seeker_id = (select auth.uid()) or employer_id = (select auth.uid()));

drop policy if exists conversations_insert_participants on public.conversations;
create policy conversations_insert_participants on public.conversations
for insert to authenticated
with check (
  seeker_id <> employer_id
  and (seeker_id = (select auth.uid()) or employer_id = (select auth.uid()))
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.age_confirmed = true
      and p.onboarding_complete = true
  )
);

drop policy if exists messages_select_participants on public.messages;
create policy messages_select_participants on public.messages
for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.seeker_id = (select auth.uid()) or c.employer_id = (select auth.uid()))
  )
);

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.seeker_id = (select auth.uid()) or c.employer_id = (select auth.uid()))
  )
);

drop policy if exists saved_jobs_select_self on public.saved_jobs;
create policy saved_jobs_select_self on public.saved_jobs
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists saved_jobs_insert_self on public.saved_jobs;
create policy saved_jobs_insert_self on public.saved_jobs
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists saved_jobs_delete_self on public.saved_jobs;
create policy saved_jobs_delete_self on public.saved_jobs
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports
for insert to authenticated
with check (reporter_id = (select auth.uid()));

drop policy if exists reports_select_self on public.reports;
create policy reports_select_self on public.reports
for select to authenticated
using (reporter_id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'employer' then 'employer'::public.user_role else 'seeker'::public.user_role end,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''),'@',1), 'Relay user'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop view if exists public.talent_profiles;
create view public.talent_profiles as
select id, name, headline, city, state, skills, about, experience_years, avatar_url, available_for_work, created_at
from public.profiles
where role = 'seeker'
  and onboarding_complete = true
  and profile_public = true
  and available_for_work = true;
grant select on public.talent_profiles to authenticated;

drop view if exists public.employer_applications;
create view public.employer_applications as
select
  a.id as application_id,
  a.job_id,
  a.applicant_id,
  a.status,
  a.cover_note,
  a.created_at,
  j.owner_id,
  j.title as job_title,
  j.company as job_company,
  j.location as job_location,
  p.name as applicant_name,
  p.headline as applicant_headline,
  p.city as applicant_city,
  p.state as applicant_state,
  p.skills as applicant_skills,
  p.about as applicant_about,
  p.experience_years
from public.applications a
join public.jobs j on j.id = a.job_id
join public.profiles p on p.id = a.applicant_id
where j.owner_id = (select auth.uid());
grant select on public.employer_applications to authenticated;

create index if not exists jobs_status_created_idx on public.jobs(status, created_at desc);
create index if not exists jobs_owner_idx on public.jobs(owner_id);
create index if not exists applications_applicant_idx on public.applications(applicant_id);
create index if not exists conversations_employer_idx on public.conversations(employer_id);
create index if not exists conversations_seeker_idx on public.conversations(seeker_id);
create index if not exists messages_conversation_idx on public.messages(conversation_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists saved_jobs_job_idx on public.saved_jobs(job_id);
create index if not exists reports_reporter_idx on public.reports(reporter_id);
alter publication supabase_realtime add table public.messages;
