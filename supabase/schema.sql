create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id text not null check (board_id in ('particulares', 'chapa', 'vtc')),
  status text not null default 'entrada' check (status in ('entrada', 'diagnostico', 'presupuesto', 'piezas', 'reparacion', 'control', 'entrega')),
  priority text not null default 'normal' check (priority in ('urgente', 'alta', 'media', 'normal', 'baja', 'esperando_cliente')),
  plate text not null,
  vehicle text not null,
  client_name text not null,
  phone text not null,
  work_description text not null default '',
  internal_notes text,
  pending_parts text,
  mechanic text,
  appointment_start timestamptz,
  appointment_end timestamptz,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.job_files (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_type text not null check (file_type in ('presupuesto', 'albaran')),
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text,
  refresh_token text,
  expiry_date bigint,
  scope text,
  token_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs enable row level security;
alter table public.clients enable row level security;
alter table public.job_files enable row level security;
alter table public.google_connections enable row level security;

create policy "Users can manage their jobs" on public.jobs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their clients" on public.clients
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their files" on public.job_files
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read their google connection" on public.google_connections
for select using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('taller-files', 'taller-files', false)
on conflict (id) do nothing;

create policy "Users can upload own files" on storage.objects
for insert with check (bucket_id = 'taller-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read own files" on storage.objects
for select using (bucket_id = 'taller-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own files" on storage.objects
for delete using (bucket_id = 'taller-files' and auth.uid()::text = (storage.foldername(name))[1]);

create index if not exists jobs_user_board_status_idx on public.jobs (user_id, board_id, status);
create index if not exists jobs_user_plate_idx on public.jobs (user_id, plate);
create index if not exists clients_user_plate_normalized_idx on public.clients (user_id, plate_normalized);
create index if not exists job_files_user_job_idx on public.job_files (user_id, job_id);

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
