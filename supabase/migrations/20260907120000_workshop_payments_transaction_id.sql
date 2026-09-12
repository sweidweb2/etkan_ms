-- Link workshop payments to income-statement transactions (1:1).

alter table public.workshop_payments
  add column transaction_id uuid null
    references public.transactions (id)
    on delete set null;

comment on column public.workshop_payments.transaction_id is
  'Linked income-statement transaction mirrored from this workshop payment (credit/debit).';

create unique index workshop_payments_transaction_id_uidx
  on public.workshop_payments (transaction_id)
  where transaction_id is not null;
