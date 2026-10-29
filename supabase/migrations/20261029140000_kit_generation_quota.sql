-- Durable quota for the paid image-generation endpoint. No direct client writes.
create table if not exists public.kit_generation_usage (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
alter table public.kit_generation_usage enable row level security;
revoke all on public.kit_generation_usage from anon, authenticated;
create or replace function public.claim_kit_generation() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    return false;
  end if;
  insert into public.kit_generation_usage(owner_id, window_start, attempts)
  values (auth.uid(), now(), 1)
  on conflict (owner_id) do update
  set attempts = case when kit_generation_usage.window_start <= now() - interval '1 hour' then 1 else kit_generation_usage.attempts + 1 end,
      window_start = case when kit_generation_usage.window_start <= now() - interval '1 hour' then now() else kit_generation_usage.window_start end
  where kit_generation_usage.attempts < 3 or kit_generation_usage.window_start <= now() - interval '1 hour';
  return found;
end;
$$;
revoke all on function public.claim_kit_generation() from public, anon;
grant execute on function public.claim_kit_generation() to authenticated;
