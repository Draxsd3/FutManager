-- Full Transfermarkt rosters are not 35-player match registration lists.
create or replace function public.enforce_editor_club_squad_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_squad_size integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.club_id::text, 0));

  select count(*)
    into current_squad_size
    from public.editor_players
   where club_id = new.club_id
     and id <> new.id;

  if current_squad_size >= 200 then
    raise exception using
      errcode = '23514',
      message = 'O elenco não pode ultrapassar 200 jogadores (limite técnico).';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_editor_club_squad_limit() from public, anon, authenticated;

