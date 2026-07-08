-- Drop student link from relationships; contacts are standalone records.

drop index if exists idx_relationship_student;

alter table relationships
drop column if exists student_id;
