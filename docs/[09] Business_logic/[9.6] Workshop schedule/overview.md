# Workshop schedule assistant — Overview

> **Superseded for the live assistant pipeline:** see [`[9.7] schedule ai/implementation-plan.md`](../[9.7]%20schedule%20ai/implementation-plan.md).  
> This `[9.6]` pack remains historical notes for the first Cloudflare + SSE scaffold. The live path is the **3-router** pipeline (LLM-1 route → server prefetch → LLM-2/fast-path → deterministic format).

## Goal

On **Instructor schedules** (`/manager/instructor-schedules`), managers can type a short natural-language prompt to find instructors who:

1. Have **subject capabilities** matching the request (e.g. Arduino), and/or  
2. Have **free** schedule slots on requested weekdays (e.g. Tuesday and Friday).

Example:

> I need instructors for an Arduino course with free time Friday and Tuesday

## Non-goals (v1)

- Creating or editing schedule slots from the assistant  
- Assigning instructors to workshops  
- Multi-turn chat history  
- General Q&A, coding help, poems, payroll, or other off-topic tasks  
- Vision / speech / image models  

## Stack

| Piece | Choice |
|-------|--------|
| Model | Cloudflare Workers AI `@cf/nvidia/nemotron-3-120b-a12b` (reasoning; no tool calling on hot path) |
| Call path | Next.js Route Handler → Cloudflare REST `/accounts/{id}/ai/run/{model}` |
| Pipeline | 3-router: LLM-1 route → hardcoded prefetch catalogs → LLM-2 mapper or exact fast-path → format ([9.7](../[9.7]%20schedule%20ai/implementation-plan.md)) |
| Authz | `instructor_schedules.view` |
| Prompt limit | 300 characters |

## Secrets

Never put Cloudflare tokens in docs or git. Use env:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_AI_API_TOKEN`
- `CLOUDFLARE_AI_MODEL` (optional override)

Rotate any token that was pasted into chat or committed by mistake.

## Related docs

- [`[9.7] schedule ai` — live implementation plan](../[9.7]%20schedule%20ai/implementation-plan.md)  
- [implementation-plan.md](./implementation-plan.md) (historical scaffold)  
- [guardrails.md](./guardrails.md)  
- [tools-plan.md](./tools-plan.md) (historical tool-loop notes)  
- [api.md](./api.md)  
