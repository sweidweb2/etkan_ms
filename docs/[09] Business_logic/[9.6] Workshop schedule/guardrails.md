# Workshop schedule assistant — Guardrails

## Allowed intent

The assistant may only help with:

1. Finding instructors by **subject / capability**  
2. Finding **free** time windows on instructor schedules (by weekday and/or date range)

Anything else is out of scope.

## Disallow / mixed prompts

Defense in depth:

### 1. Deterministic intent gate

Before calling Cloudflare:

- Detect weekday tokens (`monday`…`sunday`, abbreviations).  
- Detect schedule/capability language (`instructor`, `free`, `available`, `course`, `subject`, `teach`, etc.) or treat remaining tokens as a possible subject query.  
- If **neither** availability **nor** subject/capability signal → **refuse** with fixed copy (no tools).

### 2. System prompt

- Role: schedule-matching assistant only.  
- Ignore jokes, poems, general chat, code generation, HR/payroll, etc.  
- Mixed example: “find Arduino teachers Tue/Fri **and write a poem**” → answer **only** matching; never the poem.

### 3. Tool whitelist

- Only `search_instructors_by_subject` and `list_free_slots_for_instructors`.  
- Unknown tool names rejected.  
- Args validated with Zod.

### 4. Output discipline

- Recommendations must use instructors/slots returned by tools.  
- Do not invent instructors or times not in tool results.  
- Empty tools → clear “no match” messaging.

## Refusal copy (fixed)

> I can only help find instructors by subject capability and free schedule slots. Try something like: “Arduino instructors free on Tuesday and Friday.”

## Rate limit

Simple in-memory limit per user (e.g. 10 requests / minute) on the assistant route. Exceeded → HTTP 429.
