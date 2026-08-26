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

  if current_squad_size >= 35 then
    raise exception using
      errcode = '23514',
      message = 'O elenco não pode ultrapassar 35 jogadores.';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_editor_club_squad_limit() from public, anon, authenticated;

drop trigger if exists enforce_editor_club_squad_limit on public.editor_players;
create trigger enforce_editor_club_squad_limit
before insert or update of club_id on public.editor_players
for each row execute function public.enforce_editor_club_squad_limit();
