create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table public.jobs
  add column if not exists priority text not null default 'normal',
  add column if not exists pending_parts text,
  add column if not exists updated_at timestamptz not null default now();

update public.jobs
set priority = 'normal'
where priority is null;

alter table public.jobs
  alter column priority set default 'normal',
  alter column priority set not null;

alter table public.jobs
  drop constraint if exists jobs_priority_check;

alter table public.jobs
  add constraint jobs_priority_check
  check (priority in ('urgente', 'alta', 'media', 'normal', 'baja', 'esperando_cliente'));

create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plate text not null,
  plate_normalized text not null,
  vehicle text,
  client_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plate_normalized)
);

alter table public.jobs enable row level security;
alter table public.clients enable row level security;
alter table public.job_files enable row level security;
alter table public.google_connections enable row level security;

drop policy if exists "Users can manage their jobs" on public.jobs;
create policy "Users can manage their jobs" on public.jobs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their clients" on public.clients;
create policy "Users can manage their clients" on public.clients
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their files" on public.job_files;
create policy "Users can manage their files" on public.job_files
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can read their google connection" on public.google_connections;
create policy "Users can read their google connection" on public.google_connections
for select using (auth.uid() = user_id);

create index if not exists jobs_user_board_status_idx on public.jobs (user_id, board_id, status);
create index if not exists jobs_user_plate_idx on public.jobs (user_id, plate);
create index if not exists clients_user_plate_normalized_idx on public.clients (user_id, plate_normalized);
create index if not exists job_files_user_job_idx on public.job_files (user_id, job_id);

insert into storage.buckets (id, name, public)
values ('taller-files', 'taller-files', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own files" on storage.objects;
create policy "Users can upload own files" on storage.objects
for insert with check (bucket_id = 'taller-files' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can read own files" on storage.objects;
create policy "Users can read own files" on storage.objects
for select using (bucket_id = 'taller-files' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files" on storage.objects
for delete using (bucket_id = 'taller-files' and auth.uid()::text = (storage.foldername(name))[1]);

comment on table public.job_files is 'Adjuntos privados de trabajos.';
comment on table public.google_connections is 'Tokens OAuth de Google Calendar por usuario.';

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_google_connections_updated_at on public.google_connections;
create trigger set_google_connections_updated_at
before update on public.google_connections
for each row execute function public.set_updated_at();
