-- attendee.status: text enum -> boolean (true = present, false = absent)

alter table attendee
  drop constraint if exists attendee_status_check;

alter table attendee
  alter column status drop default;

alter table attendee
  alter column status type boolean
  using (
    case
      when lower(status::text) in ('present', 'late') then true
      else false
    end
  );

alter table attendee
  alter column status set default true;

alter table attendee
  alter column status set not null;

comment on column attendee.status is
  'Attendance flag for the session: true = present, false = absent.';
