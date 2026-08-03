workshops
----------
id
name
subject
status(draft,proposal,scheduled,in_progress,completed,cancelled)
type(course,online,workshop)
phone
target_audience
nb_participants
proposal_notes
number_of_sessions
price
start_date
end_date
delivery_place
created_by
created_at
updated_at
deleted_at

workshop_instructors
--------------------
id
workshop_id
user_id
role
    lead
    assistant
    guest
wage_type
    fixed
    per_session
    percentage
wage_amount
notes
created_at

workshop_documents
------------------
id
workshop_id
name
storage_path
file_size
mime_type
uploaded_by
created_at

workshop_payments
-----------------
id
workshop_id
amount
type [debit,credit]
payment_date
payment_method
notes
created_by
created_at

Notes
-----
- `subject` is free-text for now (not an FK to `subjects`).
- `workshop_payments` is a ledger (debit/credit), not invoice status workflow.
- **v1 delete:** hard delete workshop; children cascade in DB; Storage objects removed in service.
- `deleted_at` exists on `workshops` but is unused in v1 (hard delete only).

See [implementation-plan.md](./implementation-plan.md) for phased build plan.
