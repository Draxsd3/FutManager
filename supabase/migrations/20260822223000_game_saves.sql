create table public.game_saves (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manager_name text not null,
  in_game_date date not null,
  created_at timestamptz not null default now()
);

create table public.save_clubs (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references public.game_saves(id) on delete cascade,
  club_id uuid references public.clubs(id),
  name text not null,
  budget_brl numeric(14,2) not null default 0,
  reputation smallint not null default 50 check (reputation between 0 and 100),
  unique(save_id, name)
);

create table public.save_players (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references public.game_saves(id) on delete cascade,
  player_id uuid references public.players(id),
  club_id uuid not null references public.save_clubs(id) on delete cascade,
  name text not null,
  position_code text not null,
  overall smallint not null check (overall between 1 and 100),
  morale smallint not null default 70 check (morale between 0 and 100),
  fitness smallint not null default 100 check (fitness between 0 and 100)
);

create table public.save_finances (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references public.game_saves(id) on delete cascade,
  occurred_on date not null,
  category text not null,
  amount_brl numeric(14,2) not null,
  description text not null
);

create table public.save_matches (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references public.game_saves(id) on delete cascade,
  match_date date not null,
  home_club_id uuid not null references public.save_clubs(id),
  away_club_id uuid not null references public.save_clubs(id),
  home_score smallint check (home_score >= 0),
  away_score smallint check (away_score >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'played')),
  check (home_club_id <> away_club_id)
);

create table public.save_standings (
  save_id uuid not null references public.game_saves(id) on delete cascade,
  club_id uuid not null references public.save_clubs(id) on delete cascade,
  played smallint not null default 0,
  wins smallint not null default 0,
  draws smallint not null default 0,
  losses smallint not null default 0,
  goals_for smallint not null default 0,
  goals_against smallint not null default 0,
  primary key (save_id, club_id)
);

create table public.save_news (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references public.game_saves(id) on delete cascade,
  published_on date not null,
  headline text not null,
  body text not null,
  kind text not null check (kind in ('match', 'finance', 'club'))
);

alter table public.game_saves enable row level security;
alter table public.save_clubs enable row level security;
alter table public.save_players enable row level security;
alter table public.save_finances enable row level security;
alter table public.save_matches enable row level security;
alter table public.save_standings enable row level security;
alter table public.save_news enable row level security;
