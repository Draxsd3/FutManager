-- Applied to the existing FutManager project to reconcile the catalog schema
-- without deleting career data or seeding market listings. Idempotent after the
-- earlier catalog migrations; do not replay unrelated reset migrations blindly.
alter table public.editor_clubs add column if not exists state text;
create index if not exists editor_clubs_owner_state_idx on public.editor_clubs (owner_id, state, division);
alter table public.editor_players add column if not exists market_status text not null default 'normal';
alter table public.editor_players drop constraint if exists editor_players_market_status_check;
alter table public.editor_players add constraint editor_players_market_status_check check (market_status in ('normal', 'sale', 'loan'));
create index if not exists editor_players_market_status_idx on public.editor_players (owner_id, market_status, club_id);
alter table public.editor_clubs drop constraint if exists editor_clubs_division_check;
alter table public.editor_clubs add constraint editor_clubs_division_check check (division in ('Série A', 'Série B', 'Série C', 'Série D', 'Sem divisão nacional'));
alter table public.editor_clubs add column if not exists transfermarkt jsonb;
alter table public.editor_players add column if not exists transfermarkt jsonb;
create or replace function public.enforce_editor_club_squad_limit() returns trigger language plpgsql set search_path = '' as $$
declare current_squad_size integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.club_id::text, 0));
  select count(*) into current_squad_size from public.editor_players where club_id = new.club_id and id <> new.id;
  if current_squad_size >= 200 then
    raise exception using errcode = '23514', message = 'O elenco não pode ultrapassar 200 jogadores (limite técnico).';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_editor_club_squad_limit() from public, anon, authenticated;
alter table public.editor_clubs drop constraint if exists editor_clubs_stadium_capacity_check;
alter table public.editor_clubs add constraint editor_clubs_stadium_capacity_check check (stadium_capacity between 0 and 500000);
alter table public.editor_clubs drop constraint if exists editor_clubs_name_check;
alter table public.editor_clubs add constraint editor_clubs_name_check check (char_length(name) between 1 and 250);
alter table public.editor_players drop constraint if exists editor_players_name_check;
alter table public.editor_players add constraint editor_players_name_check check (char_length(name) between 1 and 250);
alter table public.editor_players drop constraint if exists editor_players_age_check;
alter table public.editor_players add constraint editor_players_age_check check (age between 14 and 65);
alter table public.editor_players drop constraint if exists editor_players_shirt_number_check;
alter table public.editor_players add constraint editor_players_shirt_number_check check (shirt_number between 1 and 999);
alter table public.editor_players drop constraint if exists editor_players_club_id_shirt_number_key;
notify pgrst, 'reload schema';
