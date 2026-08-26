alter table public.career_players
  add column secondary_position_code text
  check (secondary_position_code is null or secondary_position_code in ('G', 'L', 'Z', 'M', 'A'));
