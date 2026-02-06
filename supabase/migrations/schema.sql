-- WARROOM INCIDENT COMMANDER - CLEAN PRODUCTION SCHEMA
-- Zero dummy data - Everything real-time from frontend


-- 1. Services (External Database Connections)
create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text not null check (status in ('healthy', 'degraded', 'down', 'unknown')) default 'unknown',
  response_time_ms integer default 0,
  uptime_percent numeric(5,2) default 99.9,
  
  -- External Database Connection
  connected_db_url text,
  connected_db_key text,
  
  -- Schema Information
  schema_info jsonb,
  monitored_tables text[],
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 2. Incidents
create table if not exists incidents (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id) on delete cascade,
  title text,
  type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null check (status in ('active', 'investigating', 'resolved')),
  description text,
  root_cause text,
  resolution_notes text,
  ui_config jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  duration_seconds integer
);


-- 3. Incident Events
create table if not exists incident_events (
  id uuid default gen_random_uuid() primary key,
  incident_id uuid references incidents(id) on delete cascade,
  event_type text not null check (event_type in ('detected', 'investigating', 'action_taken', 'recovered')),
  description text not null,
  user_id text default 'system',
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 4. Error Logs
create table if not exists error_logs (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  severity text check (severity in ('info', 'warn', 'error', 'critical')),
  message text not null,
  stack_trace text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 5. Metrics
create table if not exists metrics (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references services(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  metric_type text not null,
  value numeric not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 6. Indexes
create index if not exists idx_incidents_service_id on incidents(service_id);
create index if not exists idx_incidents_status on incidents(status);
create index if not exists idx_incidents_created_at on incidents(created_at desc);
create index if not exists idx_events_incident_id on incident_events(incident_id);
create index if not exists idx_events_created_at on incident_events(created_at desc);
create index if not exists idx_metrics_service_id on metrics(service_id);
create index if not exists idx_metrics_timestamp on metrics(timestamp desc);
create index if not exists idx_logs_service_id on error_logs(service_id);
create index if not exists idx_logs_created_at on error_logs(created_at desc);


-- 7. Triggers
create or replace function calculate_incident_duration()
returns trigger as $$
begin
  if new.resolved_at is not null and old.resolved_at is null then
    new.duration_seconds := extract(epoch from (new.resolved_at - new.created_at))::integer;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger incident_duration_trigger
  before update on incidents
  for each row
  execute function calculate_incident_duration();

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger services_updated_at
  before update on services
  for each row
  execute function update_updated_at();


-- 8. Row Level Security
alter table services enable row level security;
alter table incidents enable row level security;
alter table incident_events enable row level security;
alter table error_logs enable row level security;
alter table metrics enable row level security;

create policy "Enable all for services" on services for all using (true) with check (true);
create policy "Enable all for incidents" on incidents for all using (true) with check (true);
create policy "Enable all for events" on incident_events for all using (true) with check (true);
create policy "Enable all for logs" on error_logs for all using (true) with check (true);
create policy "Enable all for metrics" on metrics for all using (true) with check (true);


-- 9. Realtime
alter publication supabase_realtime add table services;
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table incident_events;
alter publication supabase_realtime add table error_logs;
alter publication supabase_realtime add table metrics;
