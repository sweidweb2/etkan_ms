# Workshop schedule assistant — Overview

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
| Model | Cloudflare Workers AI `@cf/nvidia/nemotron-3-120b-a12b` (reasoning + tool calling) |
| Call path | Next.js Route Handler → Cloudflare REST `/accounts/{id}/ai/run/{model}` |
| Tools | Whitelisted read-only tools only (see [tools-plan.md](./tools-plan.md)) |
| Authz | `instructor_schedules.view` |
| Prompt limit | 300 characters |

## Secrets

Never put Cloudflare tokens in docs or git. Use env:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_AI_API_TOKEN`
- `CLOUDFLARE_AI_MODEL` (optional override)

Rotate any token that was pasted into chat or committed by mistake.

## Related docs

- [implementation-plan.md](./implementation-plan.md)  
- [guardrails.md](./guardrails.md)  
- [tools-plan.md](./tools-plan.md)  
- [api.md](./api.md)  
