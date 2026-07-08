-- In-app notifications for panel users (manager, teacher, student, etc.).

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id) on delete cascade,
  audience text not null default 'manager'
    check (audience in ('admin', 'manager', 'ceo', 'teacher', 'student', 'all')),
  category text not null default 'general'
    check (category in ('system', 'academic', 'billing', 'equipment', 'attendance', 'general')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  title text not null,
  body text not null,
  action_href text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_id
on notifications(recipient_id);

create index if not exists idx_notifications_audience
on notifications(audience);

create index if not exists idx_notifications_created_at
on notifications(created_at desc);

create index if not exists idx_notifications_unread
on notifications(recipient_id, is_read)
where is_read = false;
