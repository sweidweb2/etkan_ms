-- Optional referral source on guest intake (standard catalog + free-text when other).
-- Idempotent: columns may already exist on remote from an earlier manual/partial apply.

alter table public.guests
  add column if not exists referred_from text;

alter table public.guests
  add column if not exists referred_from_other text;

alter table public.guests
  drop constraint if exists guests_referred_from_check;

alter table public.guests
  add constraint guests_referred_from_check
  check (
    referred_from is null
    or referred_from in (
      'friend',
      'social',
      'event',
      'search',
      'other'
    )
  );

comment on column public.guests.referred_from is
  'Optional how the guest found Etkan: friend | social | event | search | other.';

comment on column public.guests.referred_from_other is
  'Free-text referral detail when referred_from is other; otherwise null.';

create index if not exists idx_guests_referred_from
  on public.guests (referred_from)
  where referred_from is not null;
