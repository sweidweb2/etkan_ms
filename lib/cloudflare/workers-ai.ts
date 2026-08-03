import {
  SCHEDULE_ASSISTANT_DEFAULT_MODEL,
  SCHEDULE_ASSISTANT_TOOL_NAMES,
} from "@/lib/constants/schedule-assistant";

export type WorkersAiChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: WorkersAiToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type WorkersAiToolCall = {
  id: string;
  type?: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type WorkersAiToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type WorkersAiTokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type WorkersAiRunResult = {
  response?: string | null;
  reasoning?: string | null;
  tool_calls?: WorkersAiToolCall[];
  usage?: WorkersAiTokenUsage | null;
  model: string;
  raw: unknown;
};

export function extractWorkersAiUsage(raw: unknown): WorkersAiTokenUsage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as Record<string, unknown>;
  const result =
    payload.result && typeof payload.result === "object"
      ? (payload.result as Record<string, unknown>)
      : payload;

  const usageCandidate =
    (result.usage && typeof result.usage === "object"
      ? (result.usage as Record<string, unknown>)
      : null) ??
    (payload.usage && typeof payload.usage === "object"
      ? (payload.usage as Record<string, unknown>)
      : null);

  if (!usageCandidate) {
    return null;
  }

  const promptTokens = Number(
    usageCandidate.prompt_tokens ?? usageCandidate.input_tokens ?? NaN
  );
  const completionTokens = Number(
    usageCandidate.completion_tokens ??
      usageCandidate.output_tokens ??
      NaN
  );
  const totalTokens = Number(
    usageCandidate.total_tokens ??
      (Number.isFinite(promptTokens) && Number.isFinite(completionTokens)
        ? promptTokens + completionTokens
        : NaN)
  );

  if (
    !Number.isFinite(promptTokens) &&
    !Number.isFinite(completionTokens) &&
    !Number.isFinite(totalTokens)
  ) {
    return null;
  }

  return {
    prompt_tokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completion_tokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    total_tokens: Number.isFinite(totalTokens)
      ? totalTokens
      : (Number.isFinite(promptTokens) ? promptTokens : 0) +
        (Number.isFinite(completionTokens) ? completionTokens : 0),
  };
}

export function getWorkersAiModelName(): string {
  return (
    process.env.CLOUDFLARE_AI_MODEL?.trim() || SCHEDULE_ASSISTANT_DEFAULT_MODEL
  );
}

function getConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN?.trim();
  const model =
    process.env.CLOUDFLARE_AI_MODEL?.trim() ||
    SCHEDULE_ASSISTANT_DEFAULT_MODEL;

  if (!accountId || !apiToken) {
    throw new Error(
      "Cloudflare AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN."
    );
  }

  return { accountId, apiToken, model };
}

export const SCHEDULE_ASSISTANT_TOOL_DEFINITIONS: WorkersAiToolDefinition[] = [
  {
    type: "function",
    function: {
      name: SCHEDULE_ASSISTANT_TOOL_NAMES.SEARCH_INSTRUCTORS_BY_SUBJECT,
      description:
        "Search instructors who have subject capabilities matching a query (e.g. Arduino).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Subject or course keywords to match.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: SCHEDULE_ASSISTANT_TOOL_NAMES.LIST_FREE_SLOTS_FOR_INSTRUCTORS,
      description:
        "List free instructor schedule slots, optionally filtered by instructor ids and weekdays.",
      parameters: {
        type: "object",
        properties: {
          instructor_ids: {
            type: "array",
            items: { type: "string" },
            description: "Optional instructor profile UUIDs to filter.",
          },
          weekdays: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
              ],
            },
            description: "Optional weekdays to keep (lowercase).",
          },
          from_date: {
            type: "string",
            description: "Optional start date YYYY-MM-DD inclusive.",
          },
          to_date: {
            type: "string",
            description: "Optional end date YYYY-MM-DD inclusive.",
          },
        },
      },
    },
  },
];

export async function runWorkersAiChat(input: {
  messages: WorkersAiChatMessage[];
  tools?: WorkersAiToolDefinition[];
}): Promise<WorkersAiRunResult> {
  const { accountId, apiToken, model } = getConfig();
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: input.messages,
      tools: input.tools,
      stream: false,
    }),
  });

  const payload = (await response.json()) as {
    success?: boolean;
    errors?: { message?: string }[];
    result?: {
      response?: string | null;
      reasoning?: string | null;
      tool_calls?: WorkersAiToolCall[];
      [key: string]: unknown;
    };
  };

  if (!response.ok || payload.success === false) {
    const message =
      payload.errors?.[0]?.message ??
      `Cloudflare AI request failed (${response.status}).`;
    throw new Error(message);
  }

  const result = payload.result ?? {};
  return {
    response: typeof result.response === "string" ? result.response : null,
    reasoning: typeof result.reasoning === "string" ? result.reasoning : null,
    tool_calls: Array.isArray(result.tool_calls) ? result.tool_calls : undefined,
    usage: extractWorkersAiUsage(payload),
    model,
    raw: payload,
  };
}

export function parseToolCallArguments(
  raw: string
): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}
