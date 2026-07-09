-- scheduled_payments: reminder checkpoints for outstanding subscribed semester balances

create table scheduled_payments (
    id uuid primary key default gen_random_uuid(),
    subscribed_semester_id uuid not null
        references subscribed_semesters(id) on delete cascade,
    payment_date timestamptz not null,
    amount numeric(10,2),
    status text not null default 'scheduled'
        check (status in ('scheduled', 'reminded', 'completed', 'missed', 'cancelled')),
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table scheduled_payments is
    'Payment reminder checkpoints for a subscribed semester. Informational only; does not record actual payments.';

comment on column scheduled_payments.payment_date is
    'Reminder date for the manager and student to follow up on an outstanding balance.';

comment on column scheduled_payments.amount is
    'Optional expected payment amount at this checkpoint.';

comment on column scheduled_payments.status is
    'Reminder lifecycle: scheduled, reminded, completed, missed, or cancelled.';

comment on column scheduled_payments.note is
    'Optional context for the reminder (e.g. agreed follow-up or partial payment plan).';

create index idx_scheduled_payments_subscribed_semester_id
on scheduled_payments(subscribed_semester_id);

create index idx_scheduled_payments_payment_date
on scheduled_payments(payment_date);

create index idx_scheduled_payments_status
on scheduled_payments(status);
