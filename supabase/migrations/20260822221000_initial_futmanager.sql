create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code char(2) not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid references public.countries(id),
  name text not null,
  short_name text,
  level smallint check (level > 0),
  created_at timestamptz not null default now(),
  unique(country_id, name)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  country_id uuid references public.countries(id),
  legal_name text not null,
  common_name text not null,
  short_name text,
  founded_year smallint check (founded_year between 1800 and 2100),
  created_at timestamptz not null default now()
);

create table public.positions (
  code text primary key,
  name text not null,
  category text not null check (category in ('goalkeeper', 'defender', 'midfielder', 'forward'))
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  known_as text,
  birth_date date,
  nationality_country_id uuid references public.countries(id),
  height_cm smallint check (height_cm between 100 and 250),
  weight_kg smallint check (weight_kg between 30 and 200),
  preferred_foot text check (preferred_foot in ('left', 'right', 'both')),
  created_at timestamptz not null default now()
);

create table public.player_positions (
  player_id uuid not null references public.players(id) on delete cascade,
  position_code text not null references public.positions(code),
  is_primary boolean not null default false,
  primary key (player_id, position_code)
);

create table public.squads (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id),
  player_id uuid not null references public.players(id),
  season_id uuid not null references public.seasons(id),
  shirt_number smallint check (shirt_number between 1 and 99),
  joined_on date,
  left_on date,
  unique(club_id, player_id, season_id)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id),
  club_id uuid not null references public.clubs(id),
  starts_on date,
  ends_on date,
  salary_monthly_brl numeric(14,2) check (salary_monthly_brl >= 0),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  base_url text,
  created_at timestamptz not null default now()
);

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id),
  collector_version text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

create table public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id),
  source_url text not null,
  content_hash text not null,
  raw_data jsonb not null,
  collected_at timestamptz not null default now(),
  unique(import_run_id, source_url, content_hash)
);

create table public.external_entities (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id),
  entity_type text not null check (entity_type in ('club', 'player', 'competition')),
  entity_id uuid not null,
  external_id text not null,
  source_url text,
  confidence smallint not null default 100 check (confidence between 0 and 100),
  last_confirmed_at timestamptz,
  unique(source_id, entity_type, external_id)
);

create table public.import_errors (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id),
  snapshot_id uuid references public.source_snapshots(id),
  stage text not null check (stage in ('collect', 'normalize', 'validate', 'publish')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.manual_overrides (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  field_name text not null,
  value jsonb not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique(entity_type, entity_id, field_name)
);

create index players_name_idx on public.players using gin (to_tsvector('simple', full_name));
create index external_entities_lookup_idx on public.external_entities (entity_type, entity_id);
create index source_snapshots_import_run_idx on public.source_snapshots (import_run_id);

alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public;

alter table public.countries enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.clubs enable row level security;
alter table public.positions enable row level security;
alter table public.players enable row level security;
alter table public.player_positions enable row level security;
alter table public.squads enable row level security;
alter table public.contracts enable row level security;
alter table public.data_sources enable row level security;
alter table public.import_runs enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.external_entities enable row level security;
alter table public.import_errors enable row level security;
alter table public.manual_overrides enable row level security;
