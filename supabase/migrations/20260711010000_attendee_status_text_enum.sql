-- attendee.status: boolean -> text enum (present|absent|late|excused)
-- Restores the statuses from the initial schema after 20260709180000_attendee_status_boolean.

alter table attendee
  alter column status drop default;

alter table attendee
  alter column status type text
  using (
    case
      when status is true then 'present'
      else 'absent'
    end
  );

alter table attendee
  alter column status set default 'present';

alter table attendee
  alter column status set not null;

alter table attendee
  drop constraint if exists attendee_status_check;

alter table attendee
  add constraint attendee_status_check
  check (status in ('present', 'absent', 'late', 'excused'));

comment on column attendee.status is
  'Attendance status for the session: present, absent, late, or excused.';
