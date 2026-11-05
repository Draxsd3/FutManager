-- The collected catalog can contain unknown capacities and repeated/unavailable
-- shirt numbers. They are source data, not the registered match squad. The
-- editor still validates manual shirt changes, but the database must retain
-- every imported player rather than silently discarding them.
alter table public.editor_clubs drop constraint if exists editor_clubs_stadium_capacity_check;
alter table public.editor_clubs add constraint editor_clubs_stadium_capacity_check
  check (stadium_capacity between 0 and 500000);
alter table public.editor_clubs drop constraint if exists editor_clubs_name_check;
alter table public.editor_clubs add constraint editor_clubs_name_check check (char_length(name) between 1 and 250);
alter table public.editor_players drop constraint if exists editor_players_name_check;
alter table public.editor_players add constraint editor_players_name_check check (char_length(name) between 1 and 250);
alter table public.editor_players drop constraint if exists editor_players_age_check;
alter table public.editor_players add constraint editor_players_age_check check (age between 14 and 65);
alter table public.editor_players drop constraint if exists editor_players_shirt_number_check;
alter table public.editor_players add constraint editor_players_shirt_number_check check (shirt_number between 1 and 999);
alter table public.editor_players drop constraint if exists editor_players_club_id_shirt_number_key;
