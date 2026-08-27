# Workshop schedule assistant — Implementation Plan

> **Superseded for the live assistant pipeline:** see [`[9.7] schedule ai/implementation-plan.md`](../[9.7]%20schedule%20ai/implementation-plan.md).  
> This `[9.6]` pack remains historical notes for the first Cloudflare + SSE scaffold. Phase 0 of `[9.7]` wiped the old tier/tool workflow from code.

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Model | `@cf/nvidia/nemotron-3-120b-a12b` (reasoning + tool calling) |
| Transport | Next.js Route Handler → Cloudflare REST (no Workers AI binding) |
| Tool loop | ~~Server-owned traditional tool calling; max 3 recursive rounds~~ → replaced by 3-router plan in `[9.7]` |
| Tools | ~~`search_instructors_by_subject`, `list_free_slots_for_instructors`~~ → see `[9.7]` prefetch catalogs |
| Prompt limit | 300 characters (Zod + input `maxLength`) |
| Authz | `instructor_schedules.view` |
| UI phases | SSE: `reasoning` → `tool_start` / `tool_result` → `token` / `done` / `error` |
| Off-topic | Refuse or ignore; see [guardrails.md](./guardrails.md) |

Schema / data: existing `instructor_schedule_slots`, `mentor_subject_capability`, `mentor_subjects`, `profiles.is_instructor`.

---

## Phase 0 — Foundations

- [x] Env placeholders in `.env.example`
- [x] Constants: max prompt length, default model, tool names
- [x] Domain types for SSE events + tool args
- [x] Zod `scheduleAssistantPromptSchema` (1–300 chars)
- [x] System prompt module
- [x] Intent helpers (weekdays + schedule/capability signals)

## Phase 1 — Read-only tool backends

See [tools-plan.md](./tools-plan.md).

- [x] `searchInstructorsBySubjectQuery`
- [x] `listFreeSlotsForInstructors`
- [x] Vitest on helpers + service with mocked repos

## Phase 2 — Cloudflare agent route + tool loop

- [x] `lib/cloudflare/workers-ai.ts` REST client
- [x] `app/api/manager/instructor-schedules/assistant/route.ts`
- [x] Auth + permission + intent gate + SSE phases
- [x] Cap tool rounds; never log full API token

## Phase 3 — UI on schedules page

- [x] `schedule-assistant-prompt.tsx` at top of instructor schedules panel
- [x] Char counter / hard limit 300
- [x] Phase chips while running; streamed answer panel

## Phase 4 — Guardrails polish

- [x] Mixed-query / refusal tests
- [x] Fixed refusal copy
- [x] Simple per-user rate limit
- [x] Empty-tool-result messaging

## Phase 5 — Docs check-off + QA

- [x] Mark phases complete
- [ ] Manual QA: Arduino + Tue/Fri style prompt (requires Cloudflare env)
- [ ] Confirm off-topic refuses; mixed ignores non-schedule half
