alter table public.editor_players
  add column market_status text not null default 'normal'
    check (market_status in ('normal', 'sale', 'loan'));

create index editor_players_market_status_idx
  on public.editor_players (owner_id, market_status, club_id);

-- Older editor databases have no explicit listings. Seed a small market from
-- each saved roster so the new search is useful immediately after migration.
with ranked_players as (
  select id,
         row_number() over (partition by owner_id, club_id order by shirt_number desc, id) as roster_rank
  from public.editor_players
)
update public.editor_players as players
set market_status = case ranked_players.roster_rank
  when 1 then 'sale'
  when 2 then 'loan'
  else 'normal'
end
from ranked_players
where players.id = ranked_players.id
  and ranked_players.roster_rank <= 2;
