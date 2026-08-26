alter table public.editor_clubs
  add column country text not null default 'Brasil',
  add column level smallint not null default 10 check (level between 1 and 20),
  add column coach_name text not null default 'Técnico interino',
  add column kit_style text not null default 'listrada' check (kit_style in ('lisa', 'listrada', 'faixa'));

alter table public.editor_players
  add column star_rating smallint not null default 2 check (star_rating between 0 and 5),
  add column quality_primary text not null default 'Passe',
  add column quality_secondary text not null default 'Marcação';
