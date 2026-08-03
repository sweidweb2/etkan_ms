import {
  SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH,
  SCHEDULE_ASSISTANT_WEEKDAYS,
  type ScheduleAssistantRoute,
  type ScheduleAssistantWeekday,
} from "@/lib/constants/schedule-assistant";
import { SCHEDULE_ASSISTANT_ROUTER_SYSTEM_PROMPT } from "@/lib/manager/schedule-assistant/system-prompt";
import {
  scheduleAssistantRouterResultSchema,
  type ScheduleAssistantHints,
  type ScheduleAssistantRouterResult,
} from "@/lib/validators/manager/schedule-assistant";

const EMPTY_HINTS: ScheduleAssistantHints = {
  weekdays: [],
  subject_tokens: [],
  username_tokens: [],
};

const REFUSE_RESULT: ScheduleAssistantRouterResult = {
  route: "refuse",
  hints: EMPTY_HINTS,
};

const WEEKDAY_ALIASES: Record<string, ScheduleAssistantWeekday> = {
  sun: "sunday",
  sunday: "sunday",
  mon: "monday",
  monday: "monday",
  tue: "tuesday",
  tues: "tuesday",
  tuesday: "tuesday",
  wed: "wednesday",
  weds: "wednesday",
  wednesday: "wednesday",
  thu: "thursday",
  thur: "thursday",
  thurs: "thursday",
  thursday: "thursday",
  fri: "friday",
  friday: "friday",
  sat: "saturday",
  saturday: "saturday",
};

const AVAILABILITY_HINTS =
  /\b(free|available|availability|open\s+slot|open\s+time|schedule|schedules|slot|slots|busy|when|weekday|weekdays|this\s+week)\b/i;

const CAPABILITY_HINTS =
  /\b(instructor|instructors|teacher|teachers|teach|teaches|teaching|course|courses|subject|subjects|capability|capabilities|can\s+teach|skilled|skill)\b/i;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "have",
  "i",
  "in",
  "me",
  "need",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "who",
  "can",
  "find",
  "looking",
  "please",
  "want",
  "what",
  "when",
  "is",
  "are",
  "free",
  "available",
  "availability",
  "slot",
  "slots",
  "schedule",
  "schedules",
  "instructor",
  "instructors",
  "teacher",
  "teachers",
  "teach",
  "teaches",
  "teaching",
  "course",
  "courses",
  "subject",
  "subjects",
  "capability",
  "capabilities",
  ...SCHEDULE_ASSISTANT_WEEKDAYS,
]);

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence) as unknown;
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeWeekdays(values: string[]): ScheduleAssistantWeekday[] {
  const found = new Set<ScheduleAssistantWeekday>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    const weekday = WEEKDAY_ALIASES[key];
    if (weekday) {
      found.add(weekday);
    }
  }
  return SCHEDULE_ASSISTANT_WEEKDAYS.filter((day) => found.has(day));
}

function normalizeTokenList(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const token = value.trim().toLowerCase().slice(0, 120);
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    out.push(token);
    if (out.length >= 20) {
      break;
    }
  }
  return out;
}

function normalizeHints(hints: ScheduleAssistantHints): ScheduleAssistantHints {
  return {
    weekdays: normalizeWeekdays(hints.weekdays as string[]),
    subject_tokens: normalizeTokenList(hints.subject_tokens),
    username_tokens: normalizeTokenList(hints.username_tokens),
  };
}

function extractWeekdaysFromText(text: string): ScheduleAssistantWeekday[] {
  const found = new Set<ScheduleAssistantWeekday>();
  const tokens = text.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const token of tokens) {
    const weekday = WEEKDAY_ALIASES[token];
    if (weekday) {
      found.add(weekday);
    }
  }
  return SCHEDULE_ASSISTANT_WEEKDAYS.filter((day) => found.has(day));
}

function extractSubjectTokens(text: string): string[] {
  return normalizeTokenList(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s+-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
  );
}

export function parseScheduleAssistantRouterResult(
  raw: string | null | undefined
): ScheduleAssistantRouterResult {
  const parsedJson = extractJsonObject(raw ?? "");
  const parsed = scheduleAssistantRouterResultSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return REFUSE_RESULT;
  }

  return {
    route: parsed.data.route,
    hints: normalizeHints(parsed.data.hints),
  };
}

/**
 * Deterministic route when LLM JSON is missing, truncated, or falsely refuses.
 */
export function heuristicRouteFromPrompt(
  prompt: string
): ScheduleAssistantRouterResult | null {
  const weekdays = extractWeekdaysFromText(prompt);
  const hasAvailability = AVAILABILITY_HINTS.test(prompt) || weekdays.length > 0;
  const hasCapabilityLanguage = CAPABILITY_HINTS.test(prompt);
  const subjectTokens = extractSubjectTokens(prompt);
  const hasSubjectTokens = subjectTokens.length > 0;

  // Subject tokens alone (e.g. poem leftovers) are not enough for capabilities;
  // they only strengthen join when availability is also present.
  const hasCapabilitySignal =
    hasCapabilityLanguage || (hasSubjectTokens && hasAvailability);

  if (!hasAvailability && !hasCapabilityLanguage) {
    return null;
  }

  const hints: ScheduleAssistantHints = {
    weekdays,
    subject_tokens: subjectTokens,
    username_tokens: [],
  };

  let route: ScheduleAssistantRoute;
  if (hasCapabilitySignal && hasAvailability) {
    route = "capability_availability";
  } else if (hasCapabilityLanguage) {
    route = "capabilities";
  } else {
    route = "availability";
  }

  return { route, hints };
}

export function resolveScheduleAssistantRouterResult(
  raw: string | null | undefined,
  prompt: string
): ScheduleAssistantRouterResult {
  const parsed = parseScheduleAssistantRouterResult(raw);
  if (parsed.route !== "refuse") {
    return parsed;
  }

  return heuristicRouteFromPrompt(prompt) ?? REFUSE_RESULT;
}

export function buildRouterMessages(prompt: string): {
  system: string;
  user: string;
} {
  return {
    system: SCHEDULE_ASSISTANT_ROUTER_SYSTEM_PROMPT,
    user: prompt.slice(0, SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH),
  };
}
