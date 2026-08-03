# Workshop schedule assistant — Guardrails

> **Live pipeline:** [`[9.7] schedule ai/implementation-plan.md`](../[9.7]%20schedule%20ai/implementation-plan.md).  
> Allowed intents and refusal tone below still apply; defense-in-depth details follow the 3-router design (not the old tool whitelist).

## Allowed intent

The assistant may only help with:

1. Finding instructors by **subject / capability**  
2. Finding **free** time windows on instructor schedules (by weekday and/or date range)

Anything else is out of scope.

## Disallow / mixed prompts

Defense in depth:

### 1. LLM-1 route + refuse

- LLM-1 returns `route`: `capabilities` | `availability` | `capability_availability` | `refuse` (plus light hints).  
- Heuristic fallback may recover clear schedule/capability asks when JSON is unusable; otherwise **`refuse`**.  
- On `refuse`: emit canned SSE refusal — no prefetch, no mapper, no answer LLM.

### 2. System prompts

- Router and mapper prompts: schedule-matching only.  
- Ignore jokes, poems, general chat, code generation, HR/payroll, etc.  
- Mixed example: “find Arduino teachers Tue/Fri **and write a poem**” → answer **only** matching; never the poem.

### 3. Closed catalogs (not a tool whitelist)

- Prefetch is hardcoded from `route` (instructors, subjects/matrix, free slots as needed).  
- LLM-2 may only map onto catalog entries; server scrubs / resolves groups against closed lists.  
- No inventing instructors, subjects, or times outside catalogs.

### 4. Output discipline

- Answers come from resolved groups + catalog facts (deterministic formatter by default).  
- Empty / unmatched catalogs → clear “no match” messaging.

## Refusal copy (fixed)

> I only help with instructor capabilities and free schedule slots. Try: "Arduino instructors free Tuesday."

## Rate limit

Simple in-memory limit per user (e.g. 10 requests / minute) on the assistant route. Exceeded → HTTP 429.
