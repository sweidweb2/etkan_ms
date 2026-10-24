-- Curated card aurora key for class list cards (`lib/constants/class-card-gradients.ts`).

alter table public.classes
  add column if not exists card_gradient text;

comment on column public.classes.card_gradient is
  'Key into the class card gradient directory (e.g. violet-aurora).';

-- Backfill existing rows with a stable pick from the directory (hash of id).
update public.classes
set card_gradient = (
  array[
    'violet-aurora',
    'teal-lagoon',
    'magenta-dusk',
    'sky-mint',
    'coral-bloom',
    'indigo-glow',
    'lime-breeze',
    'rose-mist',
    'cyan-flare',
    'amber-haze',
    'orchid-wave',
    'ocean-spark',
    'peach-sunset',
    'emerald-veil',
    'lavender-pulse',
    'sapphire-mist'
  ]
)[1 + (abs(hashtext(id::text)) % 16)]
where card_gradient is null;

alter table public.classes
  alter column card_gradient set default 'violet-aurora';

alter table public.classes
  alter column card_gradient set not null;

alter table public.classes
  drop constraint if exists classes_card_gradient_check;

alter table public.classes
  add constraint classes_card_gradient_check
  check (
    card_gradient in (
      'violet-aurora',
      'teal-lagoon',
      'magenta-dusk',
      'sky-mint',
      'coral-bloom',
      'indigo-glow',
      'lime-breeze',
      'rose-mist',
      'cyan-flare',
      'amber-haze',
      'orchid-wave',
      'ocean-spark',
      'peach-sunset',
      'emerald-veil',
      'lavender-pulse',
      'sapphire-mist'
    )
  );
