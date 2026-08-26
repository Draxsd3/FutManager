alter table public.game_saves
  add column owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  add column club_name text,
  add column division text,
  add column round smallint not null default 1 check (round > 0),
  add column budget_brl numeric(14,2) not null default 0 check (budget_brl >= 0),
  add column state jsonb not null default '{}'::jsonb,
  add column updated_at timestamptz not null default now();

alter table public.game_saves alter column owner_id set not null;

create table public.editor_clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 2 and 80),
  short_name text not null check (char_length(short_name) between 2 and 8),
  division text not null check (division in ('Série A', 'Série B', 'Série C', 'Série D')),
  founded_year smallint check (founded_year between 1800 and 2100),
  primary_color text not null default '#08783e',
  secondary_color text not null default '#ffffff',
  stadium_name text not null default 'Estádio Municipal',
  stadium_capacity integer not null default 15000 check (stadium_capacity between 500 and 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.editor_players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  club_id uuid not null references public.editor_clubs(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  shirt_number smallint not null check (shirt_number between 1 and 99),
  primary_position text not null check (primary_position in ('G', 'L', 'Z', 'M', 'A')),
  secondary_position text check (secondary_position in ('G', 'L', 'Z', 'M', 'A')),
  overall smallint not null default 60 check (overall between 1 and 100),
  age smallint not null default 22 check (age between 15 and 50),
  preferred_foot text not null default 'D' check (preferred_foot in ('E', 'D', 'A')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, shirt_number)
);

create index game_saves_owner_updated_idx on public.game_saves (owner_id, updated_at desc);
create index editor_clubs_owner_idx on public.editor_clubs (owner_id, division, name);
create index editor_players_owner_club_idx on public.editor_players (owner_id, club_id, primary_position);

alter table public.editor_clubs enable row level security;
alter table public.editor_players enable row level security;

revoke all on public.game_saves, public.save_clubs, public.save_players,
  public.save_finances, public.save_matches, public.save_standings,
  public.save_news, public.editor_clubs, public.editor_players from anon;

grant select, insert, update, delete on public.game_saves, public.save_clubs,
  public.save_players, public.save_finances, public.save_matches,
  public.save_standings, public.save_news, public.editor_clubs,
  public.editor_players to authenticated;

create policy "owners_manage_game_saves"
  on public.game_saves
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owners_manage_editor_clubs"
  on public.editor_clubs
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owners_manage_editor_players"
  on public.editor_players
  for all
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.editor_clubs c
      where c.id = club_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.editor_clubs c
      where c.id = club_id and c.owner_id = (select auth.uid())
    )
  );

create policy "owners_manage_save_clubs"
  on public.save_clubs for all to authenticated
  using (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())));

create policy "owners_manage_save_players"
  on public.save_players for all to authenticated
  using (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())));

create policy "owners_manage_save_finances"
  on public.save_finances for all to authenticated
  using (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())));

create policy "owners_manage_save_matches"
  on public.save_matches for all to authenticated
  using (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())));

create policy "owners_manage_save_standings"
  on public.save_standings for all to authenticated
  using (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())));

create policy "owners_manage_save_news"
  on public.save_news for all to authenticated
  using (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.game_saves s where s.id = save_id and s.owner_id = (select auth.uid())));
