alter table public.editor_players
  add column energy smallint not null default 100 check (energy between 0 and 100),
  add column salary_monthly_brl numeric(14,2) not null default 0 check (salary_monthly_brl >= 0),
  add column market_value_brl numeric(14,2) not null default 0 check (market_value_brl >= 0),
  add column goals integer not null default 0 check (goals >= 0),
  add column assists integer not null default 0 check (assists >= 0),
  add column own_goals integer not null default 0 check (own_goals >= 0),
  add column average_rating numeric(4,2) check (average_rating between 0 and 10),
  add column contract_ends_on date not null default '2027-12-31';

create table public.career_players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  save_id uuid not null references public.game_saves(id) on delete cascade,
  source_player_id uuid references public.editor_players(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  position_code text not null check (position_code in ('G', 'L', 'Z', 'M', 'A')),
  preferred_foot text not null check (preferred_foot in ('E', 'D')),
  overall smallint not null check (overall between 1 and 100),
  energy smallint not null default 100 check (energy between 0 and 100),
  salary_monthly_brl numeric(14,2) not null default 0 check (salary_monthly_brl >= 0),
  market_value_brl numeric(14,2) not null default 0 check (market_value_brl >= 0),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  own_goals integer not null default 0 check (own_goals >= 0),
  average_rating numeric(4,2) check (average_rating between 0 and 10),
  traits text not null default '',
  age smallint not null check (age between 15 and 60),
  contract_ends_on date not null,
  market_status text not null default 'normal' check (market_status in ('normal', 'sale', 'loan', 'retiring')),
  retirement_year smallint check (retirement_year between 2020 and 2200),
  is_starter boolean not null default false,
  lineup_order smallint,
  pitch_left numeric(5,2) check (pitch_left between 0 and 100),
  pitch_top numeric(5,2) check (pitch_top between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (save_id, source_player_id)
);

create table public.career_player_seasons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  career_player_id uuid not null references public.career_players(id) on delete cascade,
  season smallint not null check (season between 1900 and 2200),
  club_name text not null,
  games integer not null default 0 check (games >= 0),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  average_rating numeric(4,2) check (average_rating between 0 and 10),
  unique (career_player_id, season)
);

create index career_players_owner_save_idx on public.career_players (owner_id, save_id);
create index career_players_source_player_idx on public.career_players (source_player_id);
create index career_player_seasons_owner_player_idx on public.career_player_seasons (owner_id, career_player_id, season desc);

alter table public.career_players enable row level security;
alter table public.career_player_seasons enable row level security;

revoke all on public.career_players, public.career_player_seasons from anon;
grant select, insert, update, delete on public.career_players, public.career_player_seasons to authenticated;

create policy "owners_manage_career_players"
  on public.career_players for all to authenticated
  using (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.game_saves s
      where s.id = save_id and s.owner_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.game_saves s
      where s.id = save_id and s.owner_id = (select auth.uid())
    )
  );

create policy "owners_manage_career_player_seasons"
  on public.career_player_seasons for all to authenticated
  using (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.career_players p
      where p.id = career_player_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.career_players p
      where p.id = career_player_id and p.owner_id = (select auth.uid())
    )
  );
