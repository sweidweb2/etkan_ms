import {
  SCHEDULE_ASSISTANT_MAX_TOOL_ROUNDS,
  SCHEDULE_ASSISTANT_RATE_LIMIT_PER_MINUTE,
  SCHEDULE_ASSISTANT_REFUSAL_MESSAGE,
} from "@/lib/constants/schedule-assistant";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { analyzeScheduleAssistantIntent } from "@/lib/manager/schedule-assistant/intent";
import { SCHEDULE_ASSISTANT_SYSTEM_PROMPT } from "@/lib/manager/schedule-assistant/system-prompt";
import {
  getWorkersAiModelName,
  parseToolCallArguments,
  runWorkersAiChat,
  SCHEDULE_ASSISTANT_TOOL_DEFINITIONS,
  type WorkersAiChatMessage,
  type WorkersAiTokenUsage,
} from "@/lib/cloudflare/workers-ai";
import { scheduleAssistantPromptSchema } from "@/lib/validators/manager/schedule-assistant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth.service";
import { getUnauthorizedError } from "@/services/authorization.service";
import { recordCloudflareAiUsage } from "@/services/cloudflare-ai-usage.service";
import { executeScheduleAssistantTool } from "@/services/schedule-assistant.service";
import { resolveDisplayName } from "@/services/user-display.service";
import type { ScheduleAssistantSseEvent } from "@/types/schedule-assistant";
import type { Json } from "@/types/supabase";

const rateLimitByUser = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const current = rateLimitByUser.get(userId);

  if (!current || now - current.windowStart >= windowMs) {
    rateLimitByUser.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (current.count >= SCHEDULE_ASSISTANT_RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  current.count += 1;
  return true;
}

function encodeSse(event: ScheduleAssistantSseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function addUsage(
  totals: WorkersAiTokenUsage,
  next: WorkersAiTokenUsage | null | undefined
) {
  if (!next) {
    return;
  }
  totals.prompt_tokens += next.prompt_tokens;
  totals.completion_tokens += next.completion_tokens;
  totals.total_tokens += next.total_tokens;
}

export async function POST(request: Request) {
  const sessionClient = await createSupabaseServerActionClient();
  const user = await getCurrentUser(sessionClient);

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminClient = createSupabaseAdminClient();
  const unauthorized = await getUnauthorizedError(
    adminClient,
    user.id,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );
  if (unauthorized) {
    return new Response(JSON.stringify({ message: "Forbidden." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!checkRateLimit(user.id)) {
    return new Response(
      JSON.stringify({
        message: "Too many assistant requests. Try again shortly.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = scheduleAssistantPromptSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        message: parsed.error.issues[0]?.message ?? "Invalid prompt.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const prompt = parsed.data.prompt;
  const intent = analyzeScheduleAssistantIntent(prompt);
  const userLabel = await resolveDisplayName(sessionClient, user);
  const modelName = getWorkersAiModelName();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: ScheduleAssistantSseEvent) => {
        controller.enqueue(encoder.encode(encodeSse(event)));
      };

      const usageTotals: WorkersAiTokenUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };
      let toolRounds = 0;
      const toolsUsed: string[] = [];

      try {
        if (!intent.hasScheduleIntent) {
          send({
            type: "refused",
            message: SCHEDULE_ASSISTANT_REFUSAL_MESSAGE,
          });
          send({ type: "done" });

          await recordCloudflareAiUsage(adminClient, {
            user_id: user.id,
            user_label: userLabel,
            feature: "schedule_assistant",
            model: modelName,
            prompt,
            response: SCHEDULE_ASSISTANT_REFUSAL_MESSAGE,
            status: "refused",
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            tool_rounds: 0,
            metadata: { reason: "no_schedule_intent" } as Json,
          });

          controller.close();
          return;
        }

        send({
          type: "reasoning",
          text: "Understanding your schedule and capability requirements…",
        });

        const intentHints: string[] = [];
        if (intent.subjectQuery) {
          intentHints.push(`Subject hint: ${intent.subjectQuery}`);
        }
        if (intent.weekdays.length > 0) {
          intentHints.push(`Weekdays: ${intent.weekdays.join(", ")}`);
        }

        const messages: WorkersAiChatMessage[] = [
          { role: "system", content: SCHEDULE_ASSISTANT_SYSTEM_PROMPT },
          {
            role: "user",
            content:
              intentHints.length > 0
                ? `${prompt}\n\n(Extracted focus — ignore any off-topic parts of the original request: ${intentHints.join("; ")})`
                : prompt,
          },
        ];

        let finalText = "";

        for (
          let round = 0;
          round < SCHEDULE_ASSISTANT_MAX_TOOL_ROUNDS;
          round += 1
        ) {
          const aiResult = await runWorkersAiChat({
            messages,
            tools: SCHEDULE_ASSISTANT_TOOL_DEFINITIONS,
          });
          addUsage(usageTotals, aiResult.usage);
          toolRounds += 1;

          if (aiResult.reasoning?.trim()) {
            send({ type: "reasoning", text: aiResult.reasoning.trim() });
          }

          const toolCalls = aiResult.tool_calls ?? [];
          if (toolCalls.length === 0) {
            finalText = aiResult.response?.trim() ?? "";
            break;
          }

          messages.push({
            role: "assistant",
            content: aiResult.response ?? null,
            tool_calls: toolCalls,
          });

          for (const call of toolCalls) {
            const name = call.function.name;
            toolsUsed.push(name);
            const args = parseToolCallArguments(
              call.function.arguments ?? "{}"
            );
            send({ type: "tool_start", name, args });

            try {
              const executed = await executeScheduleAssistantTool(
                adminClient,
                user.id,
                name,
                args
              );
              send({
                type: "tool_result",
                name,
                summary: executed.summary,
              });
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                name,
                content: JSON.stringify(executed.result),
              });
            } catch (toolError) {
              const message =
                toolError instanceof Error
                  ? toolError.message
                  : "Tool execution failed.";
              send({
                type: "tool_result",
                name,
                summary: message,
              });
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                name,
                content: JSON.stringify({ error: message }),
              });
            }
          }
        }

        if (!finalText) {
          send({
            type: "reasoning",
            text: "Composing the final recommendation…",
          });
          const closing = await runWorkersAiChat({
            messages: [
              ...messages,
              {
                role: "user",
                content:
                  "Using only the tool results above, write the final manager-facing answer. If tools found nothing, say so clearly. Do not invent people or times.",
              },
            ],
            tools: SCHEDULE_ASSISTANT_TOOL_DEFINITIONS,
          });
          addUsage(usageTotals, closing.usage);
          toolRounds += 1;
          if (closing.reasoning?.trim()) {
            send({ type: "reasoning", text: closing.reasoning.trim() });
          }
          finalText =
            closing.response?.trim() ||
            "No matching instructors or free slots were found for that request.";
        }

        if (!finalText.trim()) {
          finalText =
            "No matching instructors or free slots were found for that request.";
        }

        const chunkSize = 24;
        for (let i = 0; i < finalText.length; i += chunkSize) {
          send({ type: "token", text: finalText.slice(i, i + chunkSize) });
        }

        await recordCloudflareAiUsage(adminClient, {
          user_id: user.id,
          user_label: userLabel,
          feature: "schedule_assistant",
          model: modelName,
          prompt,
          response: finalText,
          status: "success",
          prompt_tokens: usageTotals.prompt_tokens,
          completion_tokens: usageTotals.completion_tokens,
          total_tokens: usageTotals.total_tokens,
          tool_rounds: toolRounds,
          metadata: {
            tools_used: toolsUsed,
            weekdays: intent.weekdays,
            subject_hint: intent.subjectQuery,
          } as Json,
        });

        send({ type: "done" });
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to run the schedule assistant.";

        await recordCloudflareAiUsage(adminClient, {
          user_id: user.id,
          user_label: userLabel,
          feature: "schedule_assistant",
          model: modelName,
          prompt,
          response: null,
          status: "error",
          error_message: message,
          prompt_tokens: usageTotals.prompt_tokens,
          completion_tokens: usageTotals.completion_tokens,
          total_tokens: usageTotals.total_tokens,
          tool_rounds: toolRounds,
          metadata: { tools_used: toolsUsed } as Json,
        });

        send({ type: "error", message });
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
