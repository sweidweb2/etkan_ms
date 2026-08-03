# Workshop schedule assistant — API

> **Superseded for the live assistant pipeline:** see [`[9.7] schedule ai/implementation-plan.md`](../[9.7]%20schedule%20ai/implementation-plan.md).  
> Endpoint, authz, prompt limit, and SSE event shapes below still match production; the Cloudflare call pattern is the 3-router flow (not a tool loop).

## Endpoint

`POST /api/manager/instructor-schedules/assistant`

**Auth:** session required + `instructor_schedules.view`

**Body**

```json
{ "prompt": "Arduino instructors free Tuesday and Friday" }
```

`prompt`: trimmed string, length 1–300.

**Response:** `text/event-stream` (SSE)

## SSE events

Each event is `data: {json}\n\n` with shape:

```ts
type ScheduleAssistantSseEvent =
  | { type: "reasoning"; text: string }
  | { type: "tool_start"; name: string; args?: unknown }
  | { type: "tool_result"; name: string; summary: string }
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "refused"; message: string };
```

Prefetch catalogs are surfaced to the UI as `tool_start` / `tool_result` (e.g. `list_instructors`); there is no model tool-calling loop.

## Env (no secrets in git)

| Variable | Required | Notes |
|----------|----------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | yes | Account id for Workers AI REST |
| `CLOUDFLARE_AI_API_TOKEN` | yes | Bearer token |
| `CLOUDFLARE_AI_MODEL` | no | Default `@cf/nvidia/nemotron-3-120b-a12b` |

## Cloudflare REST

`POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}`

Headers: `Authorization: Bearer {TOKEN}`, `Content-Type: application/json`

Server pipeline (see [9.7](../[9.7]%20schedule%20ai/implementation-plan.md)):

1. LLM-1 classifies `route` (+ hints) — `messages` + `max_tokens` only (no `tools`).  
2. Server prefetches closed catalogs from the route.  
3. Exact fast-path or LLM-2 maps the prompt onto catalogs.  
4. Deterministic formatter streams the answer as `token` events.
