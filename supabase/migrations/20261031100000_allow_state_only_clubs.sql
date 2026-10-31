-- Brazilian clubs outside A-D must not be incorrectly registered in Série D.
alter table public.editor_clubs drop constraint if exists editor_clubs_division_check;
alter table public.editor_clubs add constraint editor_clubs_division_check
  check (division in ('Série A', 'Série B', 'Série C', 'Série D', 'Sem divisão nacional'));
