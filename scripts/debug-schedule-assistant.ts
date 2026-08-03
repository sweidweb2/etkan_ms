/**
 * Debug the schedule-assistant pipeline against live catalogs (+ optional Cloudflare).
 *
 * Usage:
 *   npx tsx scripts/debug-schedule-assistant.ts
 *   npx tsx scripts/debug-schedule-assistant.ts --llm
 *   npx tsx scripts/debug-schedule-assistant.ts --llm --prompt "Who teaches Arduino?"
 */
import { loadEnvLocal } from "@/scripts/lib/load-env-local";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";

loadEnvLocal();
process.env.SCHEDULE_ASSISTANT_DEBUG = "1";

import {
  SCHEDULE_ASSISTANT_MAPPER_MAX_TOKENS,
  SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE,
  SCHEDULE_ASSISTANT_REFUSAL_MESSAGE,
  SCHEDULE_ASSISTANT_ROUTER_MAX_TOKENS,
  type ScheduleAssistantActiveRoute,
} from "@/lib/constants/schedule-assistant";
import { runWorkersAiChat } from "@/lib/cloudflare/workers-ai";
import { buildAnswerFromGroups } from "@/lib/manager/schedule-assistant/answer";
import {
  summarizeCatalogs,
  scheduleAssistantDebug,
} from "@/lib/manager/schedule-assistant/debug";
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

const DEFAULT_PROMPTS = [
  "Who teaches Arduino?",
  "Who is free Friday?",
  "Arduino instructors free Friday.",
  "write me a poem",
];

function parseArgs(argv: string[]) {
  const prompts: string[] = [];
  let useLlm = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--llm") {
      useLlm = true;
      continue;
    }
    if (arg === "--prompt") {
      const next = argv[i + 1];
      if (next) {
        prompts.push(next);
        i += 1;
      }
      continue;
    }
  }
  return {
    useLlm,
    prompts: prompts.length > 0 ? prompts : DEFAULT_PROMPTS,
  };
}

async function resolveActorUserId(
  admin: ReturnType<typeof createSeedAdminClient>
): Promise<string> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, username")
    .eq("role", "manager")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data?.id) {
    throw new Error("No manager profile found for debug prefetch auth.");
  }
  console.log(`Using actor ${data.username} (${data.id})`);
  return data.id;
}

async function dumpCatalogs(
  admin: ReturnType<typeof createSeedAdminClient>,
  actorUserId: string
) {
  const [capabilities, availability, join] = await Promise.all([
    prefetchForRoute(admin, actorUserId, "capabilities"),
    prefetchForRoute(admin, actorUserId, "availability"),
    prefetchForRoute(admin, actorUserId, "capability_availability"),
  ]);

  console.log("\n=== CATALOG DUMP ===");
  console.log(
    "capabilities:",
    JSON.stringify(summarizeCatalogs(capabilities), null, 2)
  );
  console.log(
    "availability:",
    JSON.stringify(summarizeCatalogs(availability), null, 2)
  );
  console.log("join:", JSON.stringify(summarizeCatalogs(join), null, 2));
}

async function runPrompt(input: {
  prompt: string;
  useLlm: boolean;
  admin: ReturnType<typeof createSeedAdminClient>;
  actorUserId: string;
}) {
  const { prompt, useLlm, admin, actorUserId } = input;
  console.log(`\n=== PROMPT: ${JSON.stringify(prompt)} ===`);

  let rawRouter = "";
  if (useLlm) {
    const routerMessages = buildRouterMessages(prompt);
    const routerResult = await runWorkersAiChat({
      messages: [
        { role: "system", content: routerMessages.system },
        { role: "user", content: routerMessages.user },
      ],
      max_tokens: SCHEDULE_ASSISTANT_ROUTER_MAX_TOKENS,
    });
    rawRouter =
      routerResult.response?.trim() ||
      routerResult.reasoning?.trim() ||
      "";
    scheduleAssistantDebug("llm1.raw", {
      response: routerResult.response,
      reasoning: routerResult.reasoning?.slice(0, 400),
    });
  }

  const routed = resolveScheduleAssistantRouterResult(rawRouter, prompt);
  scheduleAssistantDebug("router.result", {
    route: routed.route,
    hints: routed.hints,
    usedHeuristicFallback: !useLlm || rawRouter.length === 0,
  });

  if (routed.route === "refuse") {
    console.log("OUT:", SCHEDULE_ASSISTANT_REFUSAL_MESSAGE);
    return;
  }

  const route = routed.route as ScheduleAssistantActiveRoute;
  const catalogs = await prefetchForRoute(admin, actorUserId, route);
  scheduleAssistantDebug("prefetch.summary", summarizeCatalogs(catalogs));

  const mapped = mapGroupsForRoute({
    route,
    hints: routed.hints,
    catalogs,
  });
  scheduleAssistantDebug("map.fast_path", {
    skipped_llm2: mapped.skipped_llm2,
    groups: mapped.skipped_llm2 ? mapped.groups : null,
  });

  let groups = mapped.skipped_llm2 ? mapped.groups : [];

  if (!mapped.skipped_llm2) {
    if (!useLlm) {
      scheduleAssistantDebug("map.needs_llm2", {
        note: "Re-run with --llm to call Cloudflare mapper",
      });
      console.log(
        "OUT:",
        SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE,
        "(no LLM-2 in this run)"
      );
      return;
    }

    const mapperMessages = buildMapperMessagesForRoute(route, prompt, catalogs);
    const mapperResult = await runWorkersAiChat({
      messages: [
        { role: "system", content: mapperMessages.system },
        { role: "user", content: mapperMessages.user },
      ],
      max_tokens: SCHEDULE_ASSISTANT_MAPPER_MAX_TOKENS,
    });
    const rawMapper =
      mapperResult.response?.trim() ||
      mapperResult.reasoning?.trim() ||
      "";
    scheduleAssistantDebug("llm2.raw", {
      response: mapperResult.response,
      reasoning: mapperResult.reasoning?.slice(0, 500),
      catalog_user_snippet: mapperMessages.user.slice(0, 500),
    });

    groups = finalizeMapperGroups({
      route,
      raw: rawMapper,
      catalogs,
    });
    scheduleAssistantDebug("map.final_groups", { groups });
  }

  const { answer, facts } = buildAnswerFromGroups(groups, catalogs);
  scheduleAssistantDebug("answer.facts", {
    capabilities: facts.capabilities?.matches?.length ?? 0,
    availability: facts.availability?.slots?.length ?? 0,
    join: facts.join?.matches?.length ?? 0,
  });
  console.log("OUT:", answer);
}

async function main() {
  const { useLlm, prompts } = parseArgs(process.argv.slice(2));
  console.log(`debug-schedule-assistant useLlm=${useLlm}`);

  const admin = createSeedAdminClient();
  const actorUserId = await resolveActorUserId(admin);
  await dumpCatalogs(admin, actorUserId);

  for (const prompt of prompts) {
    await runPrompt({ prompt, useLlm, admin, actorUserId });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
