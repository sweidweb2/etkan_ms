-- External ledger: credits (money in) and debits (money out) outside student payments.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  type text not null
    check (type in ('credit', 'debit')),
  amount numeric(10,2) not null,
  description text not null,
  category text,
  payment_method text
    check (
      payment_method is null
      or payment_method in (
        'cash',
        'omt',
        'whish',
        'bank_transfer',
        'card',
        'other'
      )
    ),
  reference_number text,
  recorded_by text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_description_not_blank check (length(trim(description)) > 0),
  constraint transactions_recorded_by_not_blank check (length(trim(recorded_by)) > 0)
);

comment on table public.transactions is
  'External credits and debits not tied to student payment phases (e.g. rent, donations, supplies).';

comment on column public.transactions.type is
  'credit = money in; debit = money out. Amount is always stored as a positive value.';

comment on column public.transactions.category is
  'Optional free-text category label for grouping (rent, utilities, donation, etc.).';

create index idx_transactions_transaction_date
  on public.transactions (transaction_date desc);

create index idx_transactions_type
  on public.transactions (type);

create index idx_transactions_category
  on public.transactions (category);
