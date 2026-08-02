-- Allow free-text categories when "other" is chosen (credit/debit presets stay app-validated).

alter table public.transactions
  drop constraint if exists transactions_category_check;
