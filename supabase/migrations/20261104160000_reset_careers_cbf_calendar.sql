-- User-authorized global reset for the shared CBF 2026 career calendar.
-- Preserve accounts, editor/imported clubs, players, uniforms and import checkpoints.
-- The FK cascades remove only data owned by the retired game_saves.
begin;
delete from public.game_saves
where state ->> 'careerRuleset' is distinct from 'cbf-2026-reset-20261104';

-- An old browser/tab must not recreate a retired career after this reset.
alter table public.game_saves
  add constraint game_saves_cbf_career_ruleset
  check (coalesce(state ->> 'careerRuleset', '') = 'cbf-2026-reset-20261104');
commit;
