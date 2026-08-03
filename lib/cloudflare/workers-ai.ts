import { SCHEDULE_ASSISTANT_DEFAULT_MODEL } from "@/lib/constants/schedule-assistant";

export type WorkersAiChatMessage = {
  role: "system" | "user" | "assistant";
  content?: string | null;
};

export type WorkersAiTokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type WorkersAiRunResult = {
  response?: string | null;
  reasoning?: string | null;
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

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalize Workers AI / OpenAI-compatible chat payloads.
 * Nemotron returns `choices[0].message.{content,reasoning}` (not `response`).
 */
export function extractWorkersAiMessageFields(result: Record<string, unknown>): {
  response: string | null;
  reasoning: string | null;
} {
  const legacyResponse = asNonEmptyString(result.response);
  const legacyReasoning = asNonEmptyString(result.reasoning);

  const choices = Array.isArray(result.choices) ? result.choices : [];
  const first = choices[0];
  const message =
    first && typeof first === "object"
      ? ((first as Record<string, unknown>).message as
          | Record<string, unknown>
          | undefined)
      : undefined;

  const choiceContent = asNonEmptyString(message?.content);
  const choiceReasoning = asNonEmptyString(
    message?.reasoning ?? message?.reasoning_content
  );

  return {
    response: legacyResponse ?? choiceContent,
    reasoning: legacyReasoning ?? choiceReasoning,
  };
}

export async function runWorkersAiChat(input: {
  messages: WorkersAiChatMessage[];
  max_tokens?: number;
}): Promise<WorkersAiRunResult> {
  const { accountId, apiToken, model } = getConfig();
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const body: Record<string, unknown> = {
    messages: input.messages,
    stream: false,
  };

  if (typeof input.max_tokens === "number") {
    body.max_tokens = input.max_tokens;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as {
    success?: boolean;
    errors?: { message?: string }[];
    result?: Record<string, unknown>;
  };

  if (!response.ok || payload.success === false) {
    const message =
      payload.errors?.[0]?.message ??
      `Cloudflare AI request failed (${response.status}).`;
    throw new Error(message);
  }

  const result = payload.result ?? {};
  const fields = extractWorkersAiMessageFields(result);

  return {
    response: fields.response,
    reasoning: fields.reasoning,
    usage: extractWorkersAiUsage(payload),
    model,
    raw: payload,
  };
}
