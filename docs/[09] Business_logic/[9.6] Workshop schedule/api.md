# Workshop schedule assistant — API

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

## Env (no secrets in git)

| Variable | Required | Notes |
|----------|----------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | yes | Account id for Workers AI REST |
| `CLOUDFLARE_AI_API_TOKEN` | yes | Bearer token |
| `CLOUDFLARE_AI_MODEL` | no | Default `@cf/nvidia/nemotron-3-120b-a12b` |

## Cloudflare REST

`POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}`

Headers: `Authorization: Bearer {TOKEN}`, `Content-Type: application/json`

Payload includes `messages` + OpenAI-style `tools` for traditional function calling. Tool loop runs on the server; final answer is streamed to the client as `token` events.
