# Workshop schedule assistant — Tools plan

> **Historical only.** The live assistant no longer runs a Cloudflare tool loop.  
> Canonical pipeline and prefetch catalogs: [`[9.7] schedule ai/implementation-plan.md`](../[9.7]%20schedule%20ai/implementation-plan.md).  
> Keep this file as a record of the first scaffold’s intended tools.

Create these **read-only** tools for the Cloudflare tool loop. No writes.

## Tool 1 — `search_instructors_by_subject`

**Purpose:** Find instructors whose mentor subject capabilities match a query string.

| | |
|--|--|
| Args | `query` (string, required) — mentor subject keywords (e.g. `"Arduino"`) |
| Returns | `{ instructors: [{ id, username, subjects: string[] }] }` |

**Backend steps**

1. Load all mentor subjects; match names with case-insensitive contains / token overlap.  
2. Load `mentor_subject_capability` pairs.  
3. Keep instructors (`profiles.is_instructor`) who have at least one matched mentor subject.  
4. Return compact JSON for the model.

## Tool 2 — `list_free_slots_for_instructors`

**Purpose:** List **free** slots, optionally filtered by instructor ids and weekdays.

| | |
|--|--|
| Args | `instructor_ids` (uuid[], optional), `weekdays` (string[], optional: `monday`…`sunday`), `from_date` / `to_date` (YYYY-MM-DD, optional) |
| Returns | `{ slots: [{ instructor_id, instructor_username, slot_date, weekday, start_time, end_time, name }] }` |

**Backend steps**

1. Load instructor-entity schedule slots (`type = free` only).  
2. Filter by `record_id` if ids provided.  
3. Filter by date range if provided.  
4. Derive weekday from `slot_date` (local calendar); filter by requested weekdays.  
5. Attach usernames from instructor profiles.

## Execution rules

- Max **3** tool rounds per request.  
- Prefer: subject search first (if query has subject signal), then free slots for returned ids + weekdays.  
- Validate every tool call with Zod before running.  
- Service layer only — repositories for DB; no Supabase in the route.

## Out of scope tools (v1)

- Creating/updating/deleting slots  
- Busy-slot listing (unless later needed)  
- Workshop assignment  
- Web search
