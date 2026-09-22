-- Relay starter schema for Supabase.
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
  about text,
  skills text[] not null default '{}',
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
  mode text not null check (mode in ('Remote','Hybrid','On-site')),
  type public.job_type not null,
  salary text not null,
  skills text[] not null default '{}',
  description text not null,
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
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "jobs_select_authenticated" on public.jobs;
create policy "jobs_select_authenticated" on public.jobs for select to authenticated using (status = 'open' or owner_id = auth.uid());
drop policy if exists "jobs_insert_employer" on public.jobs;
create policy "jobs_insert_employer" on public.jobs for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'employer'));
drop policy if exists "jobs_update_owner" on public.jobs;
create policy "jobs_update_owner" on public.jobs for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "jobs_delete_owner" on public.jobs;
create policy "jobs_delete_owner" on public.jobs for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "applications_select_participants" on public.applications;
create policy "applications_select_participants" on public.applications for select to authenticated using (
  applicant_id = auth.uid() or exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid())
);
drop policy if exists "applications_insert_self" on public.applications;
create policy "applications_insert_self" on public.applications for insert to authenticated with check (
  applicant_id = auth.uid()
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
);
drop policy if exists "applications_update_employer" on public.applications;
create policy "applications_update_employer" on public.applications for update to authenticated using (exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid()));

drop policy if exists "conversations_select_participants" on public.conversations;
create policy "conversations_select_participants" on public.conversations for select to authenticated using (seeker_id = auth.uid() or employer_id = auth.uid());
drop policy if exists "conversations_insert_participants" on public.conversations;
create policy "conversations_insert_participants" on public.conversations for insert to authenticated with check (seeker_id = auth.uid() or employer_id = auth.uid());

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants" on public.messages for select to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.seeker_id = auth.uid() or c.employer_id = auth.uid())));
drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender" on public.messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and (c.seeker_id = auth.uid() or c.employer_id = auth.uid())));

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
    coalesce(new.raw_user_meta_data->>'name', 'Relay user'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
