alter table public.editor_clubs
  add column if not exists state text;

create index if not exists editor_clubs_owner_state_idx
  on public.editor_clubs (owner_id, state, division);
