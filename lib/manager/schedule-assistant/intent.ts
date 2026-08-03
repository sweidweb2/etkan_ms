import {
  SCHEDULE_ASSISTANT_WEEKDAYS,
  type ScheduleAssistantWeekday,
} from "@/lib/constants/schedule-assistant";

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
  /\b(free|available|availability|open\s+slot|open\s+time|schedule|schedules|slot|slots|busy|time|times|when|weekday|weekdays)\b/i;

const CAPABILITY_HINTS =
  /\b(instructor|instructors|teacher|teachers|teach|teaching|course|courses|subject|subjects|capability|capabilities|can\s+teach|skilled|skill)\b/i;

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
  ...SCHEDULE_ASSISTANT_WEEKDAYS,
]);

export type ScheduleAssistantIntent = {
  hasScheduleIntent: boolean;
  weekdays: ScheduleAssistantWeekday[];
  subjectQuery: string | null;
};

export function extractWeekdaysFromText(text: string): ScheduleAssistantWeekday[] {
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

export function extractSubjectQueryHint(text: string): string | null {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s+-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

  if (tokens.length === 0) {
    return null;
  }

  return tokens.join(" ").slice(0, 120);
}

export function analyzeScheduleAssistantIntent(
  prompt: string
): ScheduleAssistantIntent {
  const weekdays = extractWeekdaysFromText(prompt);
  const hasAvailabilityLanguage = AVAILABILITY_HINTS.test(prompt);
  const hasCapabilityLanguage = CAPABILITY_HINTS.test(prompt);
  const subjectQuery = extractSubjectQueryHint(prompt);

  const hasScheduleIntent =
    weekdays.length > 0 ||
    hasAvailabilityLanguage ||
    hasCapabilityLanguage;

  return {
    hasScheduleIntent,
    weekdays,
    subjectQuery: hasScheduleIntent ? subjectQuery : null,
  };
}

export function weekdayFromYmd(ymd: string): ScheduleAssistantWeekday {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  return SCHEDULE_ASSISTANT_WEEKDAYS[date.getDay()]!;
}
