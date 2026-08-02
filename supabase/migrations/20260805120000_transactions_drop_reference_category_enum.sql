-- Drop unused reference_number; constrain category to known ledger labels.

alter table public.transactions
  drop column if exists reference_number;

alter table public.transactions
  drop constraint if exists transactions_category_check;

update public.transactions
set category = 'other'
where category is null
   or category not in (
     'rent',
     'utilities',
     'salaries',
     'supplies',
     'equipment',
     'maintenance',
     'marketing',
     'donation',
     'bank_fees',
     'travel',
     'insurance',
     'other'
   );

alter table public.transactions
  alter column category set default 'other';

alter table public.transactions
  alter column category set not null;

alter table public.transactions
  add constraint transactions_category_check
  check (
    category in (
      'rent',
      'utilities',
      'salaries',
      'supplies',
      'equipment',
      'maintenance',
      'marketing',
      'donation',
      'bank_fees',
      'travel',
      'insurance',
      'other'
    )
  );
