import {
  SCHEDULE_ASSISTANT_ACTIVE_ROUTES,
  SCHEDULE_ASSISTANT_MAPPER_MAX_TOKENS,
  SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE,
  SCHEDULE_ASSISTANT_RATE_LIMIT_PER_MINUTE,
  SCHEDULE_ASSISTANT_REFUSAL_MESSAGE,
  SCHEDULE_ASSISTANT_ROUTER_MAX_TOKENS,
  type ScheduleAssistantActiveRoute,
} from "@/lib/constants/schedule-assistant";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  summarizeCatalogs,
  scheduleAssistantDebug,
} from "@/lib/manager/schedule-assistant/debug";
import { buildAnswerFromGroups } from "@/lib/manager/schedule-assistant/answer";
import {
  buildMapperMessagesForRoute,
  finalizeMapperGroups,
  mapGroupsForRoute,
} from "@/lib/manager/schedule-assistant/map-route";
import { prefetchForRoute } from "@/lib/manager/schedule-assistant/prefetch";
import {
  buildRouterMessages,
  resolveScheduleAssistantRouterResult,
} from "@/lib/manager/schedule-assistant/router";
import {
  getWorkersAiModelName,
  runWorkersAiChat,
  type WorkersAiTokenUsage,
} from "@/lib/cloudflare/workers-ai";
import { scheduleAssistantPromptSchema } from "@/lib/validators/manager/schedule-assistant";
import type { ScheduleAssistantGroup } from "@/lib/validators/manager/schedule-assistant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth/auth.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { recordCloudflareAiUsage } from "@/services/ops/cloudflare-ai-usage.service";
import { resolveDisplayName } from "@/services/auth/user-display.service";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";
import type { ScheduleAssistantSseEvent } from "@/types/schedule-assistant";
import type { Json } from "@/types/supabase";

const rateLimitByUser = new Map<string, { count: number; windowStart: number }>();

const PREFETCH_TOOL_BY_KEY: Record<
  keyof ScheduleAssistantPrefetchCatalogs,
  string
> = {
  instructors: "list_instructors",
  subjects: "list_subjects",
  matrix: "list_capability_matrix",
  slots: "list_slots_this_week",
};

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

function streamAnswer(
  send: (event: ScheduleAssistantSseEvent) => void,
  text: string
) {
  const chunkSize = 24;
  for (let i = 0; i < text.length; i += chunkSize) {
    send({ type: "token", text: text.slice(i, i + chunkSize) });
  }
}

function isActiveRoute(route: string): route is ScheduleAssistantActiveRoute {
  return (SCHEDULE_ASSISTANT_ACTIVE_ROUTES as readonly string[]).includes(
    route
  );
}

function prefetchKeys(
  catalogs: ScheduleAssistantPrefetchCatalogs
): (keyof ScheduleAssistantPrefetchCatalogs)[] {
  return (
    Object.keys(catalogs) as (keyof ScheduleAssistantPrefetchCatalogs)[]
  ).filter((key) => catalogs[key] !== undefined);
}

function emitPrefetchTools(
  send: (event: ScheduleAssistantSseEvent) => void,
  catalogs: ScheduleAssistantPrefetchCatalogs,
  toolsUsed: string[]
) {
  for (const key of prefetchKeys(catalogs)) {
    const name = PREFETCH_TOOL_BY_KEY[key];
    toolsUsed.push(name);
    send({ type: "tool_start", name });

    let summary = "Loaded.";
    if (key === "instructors") {
      summary = `Listed ${catalogs.instructors!.instructors.length} instructor(s).`;
    } else if (key === "subjects") {
      summary = `Listed ${catalogs.subjects!.subjects.length} subject(s).`;
    } else if (key === "matrix") {
      summary = `Listed ${catalogs.matrix!.matrix.length} capability row(s).`;
    } else if (key === "slots") {
      summary = `Listed ${catalogs.slots!.slots.length} free slot(s).`;
    }

    send({ type: "tool_result", name, summary });
  }
}

function catalogsAreEmptyForRoute(
  route: ScheduleAssistantActiveRoute,
  catalogs: ScheduleAssistantPrefetchCatalogs
): boolean {
  const instructorsEmpty =
    (catalogs.instructors?.total ?? 0) === 0 &&
    (catalogs.instructors?.instructors.length ?? 0) === 0;
  const subjectsEmpty =
    (catalogs.subjects?.total ?? 0) === 0 &&
    (catalogs.subjects?.subjects.length ?? 0) === 0;
  const matrixEmpty =
    (catalogs.matrix?.total ?? 0) === 0 &&
    (catalogs.matrix?.matrix.length ?? 0) === 0;
  const slotsEmpty =
    (catalogs.slots?.total ?? 0) === 0 &&
    (catalogs.slots?.slots.length ?? 0) === 0;

  if (route === "capabilities") {
    return instructorsEmpty && subjectsEmpty && matrixEmpty;
  }
  if (route === "availability") {
    return instructorsEmpty && slotsEmpty;
  }
  return instructorsEmpty && subjectsEmpty && matrixEmpty && slotsEmpty;
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
  const unauthorizedSchedule = await getUnauthorizedError(
    adminClient,
    user.id,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );
  if (unauthorizedSchedule) {
    return new Response(JSON.stringify({ message: "Forbidden." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const unauthorizedAi = await getUnauthorizedError(
    adminClient,
    user.id,
    PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW
  );
  if (unauthorizedAi) {
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
      let llmCalls = 0;
      const toolsUsed: string[] = [];
      let routeLabel = "refuse";
      let skippedLlm2 = false;
      let groups: ScheduleAssistantGroup[] = [];
      let hintsJson: Json = {
        weekdays: [],
        subject_tokens: [],
        username_tokens: [],
      };
      let prefetchKeyList: string[] = [];

      try {
        scheduleAssistantDebug("request.start", { prompt });
        send({
          type: "reasoning",
          text: "Classifying request…",
        });

        const routerMessages = buildRouterMessages(prompt);
        const routerResult = await runWorkersAiChat({
          messages: [
            { role: "system", content: routerMessages.system },
            { role: "user", content: routerMessages.user },
          ],
          max_tokens: SCHEDULE_ASSISTANT_ROUTER_MAX_TOKENS,
        });
        addUsage(usageTotals, routerResult.usage);
        llmCalls += 1;

        scheduleAssistantDebug("llm1.raw", {
          response: routerResult.response,
          reasoning: routerResult.reasoning?.slice(0, 500) ?? null,
          usage: routerResult.usage,
        });

        if (routerResult.reasoning?.trim()) {
          send({
            type: "reasoning",
            text: routerResult.reasoning.trim(),
          });
        }

        const routed = resolveScheduleAssistantRouterResult(
          routerResult.response?.trim() ||
            routerResult.reasoning?.trim() ||
            "",
          prompt
        );
        routeLabel = routed.route;
        hintsJson = routed.hints as unknown as Json;
        scheduleAssistantDebug("router.result", {
          route: routed.route,
          hints: routed.hints,
        });

        if (routed.route === "refuse" || !isActiveRoute(routed.route)) {
          scheduleAssistantDebug("refuse", { route: routed.route });
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
            prompt_tokens: usageTotals.prompt_tokens,
            completion_tokens: usageTotals.completion_tokens,
            total_tokens: usageTotals.total_tokens,
            tool_rounds: llmCalls,
            metadata: {
              route: routed.route,
              groups: [],
              llm_calls: llmCalls,
              skipped_llm2: false,
              prefetch: [],
              tools_used: toolsUsed,
              hints: hintsJson,
              reason: "router_refuse",
            } as Json,
          });

          controller.close();
          return;
        }

        const route = routed.route;

        send({
          type: "reasoning",
          text: `Routed to ${route}.`,
        });
        send({
          type: "reasoning",
          text: "Prefetching catalogs…",
        });

        const catalogs = await prefetchForRoute(
          adminClient,
          user.id,
          route
        );
        prefetchKeyList = prefetchKeys(catalogs);
        scheduleAssistantDebug("prefetch.summary", summarizeCatalogs(catalogs));
        emitPrefetchTools(send, catalogs, toolsUsed);

        if (catalogsAreEmptyForRoute(route, catalogs)) {
          scheduleAssistantDebug("empty_catalogs", { route });
          const answer = SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE;
          streamAnswer(send, answer);

          await recordCloudflareAiUsage(adminClient, {
            user_id: user.id,
            user_label: userLabel,
            feature: "schedule_assistant",
            model: modelName,
            prompt,
            response: answer,
            status: "success",
            prompt_tokens: usageTotals.prompt_tokens,
            completion_tokens: usageTotals.completion_tokens,
            total_tokens: usageTotals.total_tokens,
            tool_rounds: llmCalls,
            metadata: {
              route,
              groups: [],
              llm_calls: llmCalls,
              skipped_llm2: true,
              prefetch: prefetchKeyList,
              tools_used: toolsUsed,
              hints: hintsJson,
              reason: "empty_catalogs",
            } as Json,
          });

          send({ type: "done" });
          controller.close();
          return;
        }

        const mapped = mapGroupsForRoute({
          route,
          hints: routed.hints,
          catalogs,
        });
        scheduleAssistantDebug("map.fast_path", {
          skipped_llm2: mapped.skipped_llm2,
          groups: mapped.skipped_llm2 ? mapped.groups : null,
        });

        if (mapped.skipped_llm2) {
          skippedLlm2 = true;
          groups = mapped.groups;
          send({
            type: "reasoning",
            text: "Exact match — skipping mapper…",
          });
        } else {
          send({
            type: "reasoning",
            text: "Mapping with LLM-2…",
          });
          const mapperMessages = buildMapperMessagesForRoute(
            route,
            prompt,
            catalogs
          );
          const mapperResult = await runWorkersAiChat({
            messages: [
              { role: "system", content: mapperMessages.system },
              { role: "user", content: mapperMessages.user },
            ],
            max_tokens: SCHEDULE_ASSISTANT_MAPPER_MAX_TOKENS,
          });
          addUsage(usageTotals, mapperResult.usage);
          llmCalls += 1;

          scheduleAssistantDebug("llm2.raw", {
            response: mapperResult.response,
            reasoning: mapperResult.reasoning?.slice(0, 500) ?? null,
            usage: mapperResult.usage,
          });

          if (mapperResult.reasoning?.trim()) {
            send({
              type: "reasoning",
              text: mapperResult.reasoning.trim(),
            });
          }

          groups = finalizeMapperGroups({
            route,
            raw:
              mapperResult.response?.trim() ||
              mapperResult.reasoning?.trim() ||
              "",
            catalogs,
          });
          scheduleAssistantDebug("map.final_groups", { groups });
        }

        const { answer, facts } = buildAnswerFromGroups(groups, catalogs);
        scheduleAssistantDebug("answer", {
          answer,
          capability_matches: facts.capabilities?.matches?.length ?? 0,
          availability_slots: facts.availability?.slots?.length ?? 0,
          join_matches: facts.join?.matches?.length ?? 0,
        });
        streamAnswer(send, answer);

        await recordCloudflareAiUsage(adminClient, {
          user_id: user.id,
          user_label: userLabel,
          feature: "schedule_assistant",
          model: modelName,
          prompt,
          response: answer,
          status: "success",
          prompt_tokens: usageTotals.prompt_tokens,
          completion_tokens: usageTotals.completion_tokens,
          total_tokens: usageTotals.total_tokens,
          tool_rounds: llmCalls,
          metadata: {
            route,
            groups,
            llm_calls: llmCalls,
            skipped_llm2: skippedLlm2,
            prefetch: prefetchKeyList,
            tools_used: toolsUsed,
            hints: hintsJson,
          } as Json,
        });

        send({ type: "done" });
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to run the schedule assistant.";

        scheduleAssistantDebug("error", { message });

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
          tool_rounds: llmCalls,
          metadata: {
            route: routeLabel,
            groups,
            llm_calls: llmCalls,
            skipped_llm2: skippedLlm2,
            prefetch: prefetchKeyList,
            tools_used: toolsUsed,
            hints: hintsJson,
          } as Json,
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
