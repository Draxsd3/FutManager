-- Durable source identity and factual EUR values; game BRL fields remain simulation.
alter table public.editor_clubs add column if not exists transfermarkt jsonb;
alter table public.editor_players add column if not exists transfermarkt jsonb;
