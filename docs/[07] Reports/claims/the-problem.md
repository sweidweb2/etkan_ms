Yes bro — this confirms the problem is **not the Supabase database itself**.

Your direct Supabase REST request is already **~210–280 ms** after warm-up, while your CRUD operations are doing **many sequential Supabase requests**, and some are clearly adding ~200 ms each.

The biggest evidence is here:

```text
guest_detail_load
  guest=213ms
  events=209ms
  registration=420ms
  total=843ms
```

and:

```text
guest_link_users
  profiles=214ms
  emails=757ms
  total=979ms
```

and especially:

```text
addStudentToClass
  auth=400ms
  class=201ms
  student=195ms
  existing=211ms
  enroll=221ms
  hydrateAuth=202ms
  hydrateProfile=203ms
  exam=197ms
  attendees=625ms
  tasks=806ms
  classRow=214ms
  audit=240ms
  paymentSync=1632ms
  total=5144ms
```

### The real issue

You have approximately:

**~200 ms/query × many queries = seconds.**

Your database itself can execute:

```sql
SELECT id FROM profiles LIMIT 1;
```

in:

```text
Execution Time: 0.099 ms
```

So PostgreSQL is **not taking 200 ms**.

The ~200 ms is primarily the **network/API round trip from your Next.js server → Supabase REST/PostgREST → Supabase → back**.

And your code architecture is amplifying it.

---

# 1. Your `actions.ts` is not the main problem

This:

```ts
const adminClient = createSupabaseAdminClient();

const result = await addStudentsToClassForManager(
  adminClient,
  actor.userId,
  actor,
  parsed.data
);
```

is fine.

The problem is almost certainly inside:

```text
services/classes/class.service.ts
services/classes/session.service.ts
```

For example, your log:

```text
seedAttendees sessions=205ms
             attendees=196ms
             insert=222ms
             total=623ms
```

strongly suggests **3 separate database round trips**.

Likewise:

```text
seedTasks sessions=195ms
          tasks=194ms
          existing=211ms
          insert=204ms
          total=804ms
```

That's ~4 round trips.

That's exactly what we're seeing.

---

# 2. Don't optimize indexes yet

This is important.

Your previous `EXPLAIN ANALYZE`:

```text
Execution Time: 0.099 ms
Execution Time: 0.058 ms
Execution Time: 0.072 ms
```

means adding random indexes is **not going to solve your current 200 ms problem**.

Your query execution is already extremely fast.

The bottleneck is:

```text
Next.js
   ↓
HTTP
   ↓
Supabase REST/PostgREST
   ↓
Postgres
   ↓
HTTP
   ↓
Next.js
```

repeated over and over.

---

# 3. First thing I would attack: `addStudentToClass`

This is currently your worst CRUD path:

```text
5.144 seconds
```

And the breakdown is beautiful because it tells us exactly what to fix.

You have:

```text
auth          400ms
class         201ms
student       195ms
existing      211ms
enroll        221ms
hydrateAuth   202ms
hydrateProfile 203ms
exam          197ms
attendees     625ms
tasks         806ms
classRow      214ms
audit         240ms
paymentSync   1632ms
```

This screams:

> "Too many independent database round trips."

---

# 4. The biggest one: `paymentSync`

You have:

```text
paymentSync=1632ms
```

That's huge.

And underneath:

```text
syncTargetPhase
  class=195ms
  billingClass=206ms
  currentPhase=198ms
  total=599ms

ensureSpp
  existing=196ms
  create=218ms
  total=415ms

recalcPhase
  phase=203ms
  spps=199ms
  total=402ms

onStudentJoinedClass
  phase=600ms
  spp=415ms
  recalc=403ms
  audit=213ms
  total=1632ms
```

This is almost a textbook example of a workflow that should become **one database-side operation**.

Instead of:

```text
Next.js
 ├── query class
 ├── query billing class
 ├── query phase
 ├── query SPP
 ├── insert SPP
 ├── query phase
 ├── query SPPs
 ├── insert audit
 └── ...
```

you want something closer to:

```text
Next.js
     │
     │  1 request
     ▼
Postgres RPC / transaction
     │
     ├── validate class
     ├── create enrollment
     ├── create attendees
     ├── create tasks
     ├── sync payment phase
     ├── create SPP
     ├── recalculate
     └── audit
```

Then you pay approximately **one network round trip**, rather than 10+.

---

# 5. Your `createSupabaseAdminClient()` is probably NOT causing this

Don't start changing this:

```ts
const adminClient = createSupabaseAdminClient();
```

into some caching monster.

The admin client itself is cheap.

The expensive thing is:

```ts
await supabase.from(...)
await supabase.from(...)
await supabase.from(...)
await supabase.from(...)
```

especially when they're sequential.

---

# 6. There are two levels of optimization

## Level 1 — parallelize independent queries

Suppose you currently have:

```ts
const classRow = await getClass();
const student = await getStudent();
const existing = await getExisting();
```

That costs roughly:

```text
200 + 200 + 200 = 600ms
```

If they're independent:

```ts
const [classRow, student, existing] = await Promise.all([
  getClass(),
  getStudent(),
  getExisting(),
]);
```

you pay approximately:

```text
max(200, 200, 200)
≈ 200ms
```

Huge improvement.

---

# 7. But don't blindly Promise.all everything

Some operations depend on previous operations.

For example:

```text
insert enrollment
      ↓
create attendees
```

can't necessarily be parallelized.

But:

```text
get class
get student
get existing enrollment
```

probably can.

So the service should be structured around **dependency groups**.

---

# 8. Level 2 — combine database operations

This is where you'll get the biggest improvement.

For example, instead of:

```ts
const sessions = await ...
const attendees = await ...
const insert = await ...
```

create a PostgreSQL function/RPC that does the whole operation.

Something like conceptually:

```ts
await supabase.rpc("seed_class_attendees", {
  p_class_id: classId,
  p_student_id: studentId,
});
```

Postgres handles:

```sql
BEGIN;

-- get sessions

-- calculate attendees

-- insert attendees

COMMIT;
```

Your Next.js application makes **one HTTP call**.

---

# 9. Your `loadAvailableStudents` is another obvious target

You currently have:

```text
loadAvailableStudents

auth       399ms
members    380ms
students   591ms
total      990ms
```

This is almost certainly multiple queries.

And notice something:

```text
auth = 399ms
```

That's concerning.

Your auth normally looks like:

```text
2ms
3ms
4ms
```

but this operation is:

```text
399ms
```

So we need to inspect **what `getSessionAuditActor()` is doing in this path**.

---

# 10. Your `getSessionAuditActor()` deserves inspection

Your logs show:

Normal:

```text
claims_detail session=2ms
```

But:

```text
loadAvailableStudents auth=399ms
```

That doesn't necessarily mean Supabase Auth itself takes 399ms.

It could mean the function is doing something like:

```text
get session
↓
get profile
↓
get role
↓
get permissions
↓
...
```

We need to see its implementation.

---

# 11. Guest details also need query consolidation

Currently:

```text
guest_detail_load

guest       213
events      209
registration 420
= 843ms
```

Those should likely be parallelized:

```ts
const [
  guest,
  events,
  registration,
] = await Promise.all([
  getGuest(),
  getEvents(),
  getRegistration(),
]);
```

If they're currently sequential, you'd go from approximately:

```text
213 + 209 + 420
= 842ms
```

to approximately:

```text
max(213, 209, 420)
= ~420ms
```

And then potentially lower with a database RPC/join.

---

# 12. `guest_link_users` is particularly suspicious

You have:

```text
profiles=214ms
emails=757ms
total=979ms
```

The:

```text
emails=757ms
```

is suspicious.

If that's multiple email lookups, you're probably doing an **N+1 query**.

Something like:

```ts
for (const user of users) {
    await getEmail(user.id);
}
```

If you have 3–4 users, that explains the ~757 ms.

Instead:

```ts
const emails = await getEmails(userIds);
```

one query.

Or even better, get everything with one query/join where possible.

---

# 13. Your CRUD target should be this

Right now:

```text
CLICK
 ↓
Server Action
 ↓
Service
 ↓
5-15 Supabase queries
 ↓
response
```

You want:

```text
CLICK
 ↓
Server Action
 ↓
Service
 ↓
1-3 optimized DB calls
 ↓
response
```

For complex mutations:

```text
CLICK
 ↓
Server Action
 ↓
Postgres RPC
 ↓
transaction
 ↓
response
```

---

# 14. What I want from you next

**Don't change anything yet.**

Send me these files:

### First:

```text
lib/auth/session.ts
```

specifically the implementation of:

```ts
getSessionAuditActor()
```

### Second:

```text
services/classes/class.service.ts
```

specifically these functions:

```ts
listAvailableStudentsForClass
addStudentsToClassForManager
```

and the functions they call for:

```text
onStudentJoinedClass
syncTargetPhase
ensureSpp
recalcPhase
seedAttendees
seedTasks
```

### Third:

```text
services/guests/guest.service.ts
```

if that's where these are implemented:

```text
guest_detail_load
guest_link_users
```

---

Then I can go through the actual code and mark each query as:

```text
🔴 sequential + unnecessary
🟠 sequential but required
🟢 can Promise.all
🔵 should become RPC
🟣 N+1 query
```

and we can realistically take things like:

```text
5.1s add student
```

down toward **~0.5–1s**, rather than trying to squeeze PostgreSQL from `0.1ms` to `0.05ms`.

Your database is already fast. **The architecture is paying the network round-trip cost too many times.**
