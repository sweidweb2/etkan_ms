-- Hot-path indexes from query/repo audit (FK children + date/list filters).
-- Postgres does not auto-index FK referencing columns.

-- Accounting: income-statement month scans on adjustments.
create index if not exists idx_student_financial_adjustments_effective_date
  on public.student_financial_adjustments (effective_date desc);

-- Class teachers: FK lookups by class and by teacher.
create index if not exists idx_class_teacher_class_id
  on public.class_teacher (class_id);

create index if not exists idx_class_teacher_teacher_id
  on public.class_teacher (teacher_id);

-- Subjects → classes + count_classes_by_subject.
create index if not exists idx_classes_subject_id
  on public.classes (subject_id);

-- Class detail / cron grade paths filter by class_id (unique is user_id, class_id).
create index if not exists idx_student_course_grade_class_id
  on public.student_course_grade (class_id);

-- Manager notification inbox (not per-recipient).
create index if not exists idx_notifications_created_at
  on public.notifications (created_at desc);

create index if not exists idx_notifications_unread_created_at
  on public.notifications (created_at desc)
  where is_read = false;

create index if not exists idx_notifications_category_created_at
  on public.notifications (category, created_at desc);

-- Staff/user list filters.
create index if not exists idx_profiles_role
  on public.profiles (role);

create index if not exists idx_profiles_is_instructor_true
  on public.profiles (id)
  where is_instructor = true;

-- Workshops list by type.
create index if not exists idx_workshops_type
  on public.workshops (type);

-- Semester drop pending lookups.
create index if not exists idx_semester_drop_requests_semester_status
  on public.semester_drop_requests (semester_id, status);

create index if not exists idx_semester_drop_requests_class_status
  on public.semester_drop_requests (class_id, status);

create index if not exists idx_semester_drop_requests_payment_phase_id
  on public.semester_drop_requests (payment_phase_id);

-- Student roster status filters / counts.
create index if not exists idx_student_profiles_status
  on public.student_profiles (status);

-- Unpaid active SPP snapshot for accounting analytics.
create index if not exists idx_student_payment_phases_unpaid_active
  on public.student_payment_phases (created_at desc)
  where status <> 'cancelled' and remaining_amount > 0;

-- Class list filters by semester + status.
create index if not exists idx_classes_semester_status
  on public.classes (semester_id, status);

-- Payment phases opened/closed by semester.
create index if not exists idx_payment_phases_semester_status
  on public.payment_phases (semester_id, status, created_at desc);

-- Common SPP payment history path.
create index if not exists idx_student_payments_spp_payment_date
  on public.student_payments (student_payment_phase_id, payment_date desc);

-- Leading-wildcard manager search (matches blogs pg_trgm pattern).
create extension if not exists pg_trgm;

create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists idx_student_profiles_full_name_trgm
  on public.student_profiles using gin (full_name gin_trgm_ops);

create index if not exists idx_guests_full_name_trgm
  on public.guests using gin (full_name gin_trgm_ops);
