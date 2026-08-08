-- Public student registration applications (application inbox; not auth accounts).

create table public.student_registration_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'accepted', 'rejected')),
  notes text,

  -- Personal
  full_name text not null,
  gender text not null
    check (gender in ('male', 'female', 'prefer_not_to_say')),
  date_of_birth date not null,
  blood_type text not null
    check (blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),

  -- Contact
  email text not null,
  phone text not null,
  additional_phone text,
  city text not null,
  full_address text not null,

  -- Education
  education_level text not null
    check (education_level in (
      'school',
      'uni_year_1',
      'uni_year_2',
      'uni_year_3',
      'uni_year_4_plus',
      'uni_graduate',
      'other'
    )),
  organization_name text,
  speciality text,
  learning_status text not null
    check (learning_status in ('learning', 'stopped', 'graduated')),
  graduation_year integer,
  self_learning_notes text,
  learning_goal text not null,

  -- Skills & discovery
  skills text[] not null default '{}',
  referral_source text not null
    check (referral_source in ('friend', 'social', 'event', 'search', 'other')),
  referral_other text,
  preferred_program text not null
    check (preferred_program in ('general', 'specialized', 'undecided')),

  -- Availability
  available_days text[] not null default '{}',
  preferred_shifts text[] not null default '{}',
  weekly_available_hours integer not null
    check (weekly_available_hours between 1 and 60),
  job_status text not null
    check (job_status in ('employed', 'unemployed', 'student_only', 'freelance')),
  has_transportation boolean not null,

  -- Consents & guardian
  consent_terms boolean not null,
  consent_privacy boolean not null,
  guardian_name text,
  guardian_phone text,

  constraint student_registration_applications_consent_terms_true
    check (consent_terms = true),
  constraint student_registration_applications_consent_privacy_true
    check (consent_privacy = true),
  constraint student_registration_applications_skills_nonempty
    check (cardinality(skills) >= 1),
  constraint student_registration_applications_days_nonempty
    check (cardinality(available_days) >= 1),
  constraint student_registration_applications_shifts_nonempty
    check (cardinality(preferred_shifts) >= 1)
);

comment on table public.student_registration_applications is
  'Public multi-step registration applications awaiting manager review.';

create index idx_student_registration_applications_created_at
  on public.student_registration_applications (created_at desc);

create index idx_student_registration_applications_status
  on public.student_registration_applications (status);

create index idx_student_registration_applications_email_lower
  on public.student_registration_applications (lower(email));

alter table public.student_registration_applications enable row level security;
