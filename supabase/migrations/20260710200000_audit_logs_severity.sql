-- audit_logs.severity: criticality of the recorded change

alter table audit_logs
  add column severity text not null default 'info'
  check (severity in ('info', 'warning', 'critical'));

comment on column audit_logs.severity is
  'Change criticality: info (routine), warning (sensitive), critical (destructive/high-impact).';

create index idx_audit_logs_severity
on audit_logs(severity);
