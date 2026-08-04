import {
  SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE,
  SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH,
} from "@/lib/constants/schedule-assistant";
import { SCHEDULE_ASSISTANT_SYNTH_SYSTEM_PROMPT } from "@/lib/manager/schedule-assistant/system-prompt";
import type {
  ScheduleAssistantResolvedFacts,
} from "@/lib/manager/schedule-assistant/resolve-groups";
import type {
  ScheduleAssistantCompactMatrixRow,
  ScheduleAssistantCompactSlot,
} from "@/types/schedule-assistant";

function hasCapabilityMatches(facts: ScheduleAssistantResolvedFacts): boolean {
  return (facts.capabilities?.matches.length ?? 0) > 0;
}

function hasAvailabilityMatches(facts: ScheduleAssistantResolvedFacts): boolean {
  return (facts.availability?.slots.length ?? 0) > 0;
}

function hasJoinMatches(facts: ScheduleAssistantResolvedFacts): boolean {
  return (
    (facts.join?.matches.length ?? 0) > 0 ||
    (facts.join?.slots.length ?? 0) > 0
  );
}

function formatCapabilityLines(
  matches: ScheduleAssistantCompactMatrixRow[]
): string[] {
  return [...matches]
    .sort((a, b) => a.u.localeCompare(b.u))
    .map((row) => {
      const subjects = [...row.sub].sort((a, b) => a.localeCompare(b));
      if (subjects.length === 0) {
        return `${row.u}: (no subjects)`;
      }
      return `${row.u}: ${subjects.join(", ")}`;
    });
}

/** Convert compact `HH:mm` (24h) to `h:mm AM/PM`. */
function formatTime12h(value: string): string {
  const [hoursRaw, minutesRaw = "00"] = value.slice(0, 5).split(":");
  const hours24 = Number(hoursRaw);
  if (!Number.isFinite(hours24) || hours24 < 0 || hours24 > 23) {
    return value.slice(0, 5);
  }
  const minutes = minutesRaw.padStart(2, "0").slice(0, 2);
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

function formatSlotWindow(slot: ScheduleAssistantCompactSlot): string {
  return `${slot.w} ${formatTime12h(slot.s)}–${formatTime12h(slot.e)}`;
}

function formatSlotLine(slot: ScheduleAssistantCompactSlot): string {
  return `${slot.u}: ${formatSlotWindow(slot)}`;
}

function formatAvailabilityLines(slots: ScheduleAssistantCompactSlot[]): string[] {
  return [...slots]
    .sort((a, b) => {
      const byDate = a.d.localeCompare(b.d);
      if (byDate !== 0) {
        return byDate;
      }
      const byStart = a.s.localeCompare(b.s);
      if (byStart !== 0) {
        return byStart;
      }
      return a.u.localeCompare(b.u);
    })
    .map(formatSlotLine);
}

function formatJoinLines(
  matches: ScheduleAssistantCompactMatrixRow[],
  slots: ScheduleAssistantCompactSlot[]
): string[] {
  const subjectsByUser = new Map(
    matches.map((row) => [row.u.toLowerCase(), row] as const)
  );
  const sortedSlots = [...slots].sort((a, b) => {
    const byUser = a.u.localeCompare(b.u);
    if (byUser !== 0) {
      return byUser;
    }
    const byDate = a.d.localeCompare(b.d);
    if (byDate !== 0) {
      return byDate;
    }
    return a.s.localeCompare(b.s);
  });

  return sortedSlots.map((slot) => {
    const match = subjectsByUser.get(slot.u.toLowerCase());
    const subjects = match
      ? [...match.sub].sort((a, b) => a.localeCompare(b)).join(", ")
      : "";
    const label = subjects ? `${slot.u} (${subjects})` : slot.u;
    return `${label}: ${formatSlotWindow(slot)}`;
  });
}

function sectionCount(facts: ScheduleAssistantResolvedFacts): number {
  return (
    (hasCapabilityMatches(facts) ? 1 : 0) +
    (hasAvailabilityMatches(facts) ? 1 : 0) +
    (hasJoinMatches(facts) ? 1 : 0)
  );
}

/**
 * Deterministic manager-facing answer from resolved facts.
 * Prefer this over synth for the default path.
 */
export function formatAnswerFromFacts(
  facts: ScheduleAssistantResolvedFacts
): string {
  const multi = sectionCount(facts) > 1;
  const parts: string[] = [];

  if (hasCapabilityMatches(facts)) {
    const lines = formatCapabilityLines(facts.capabilities!.matches);
    parts.push(
      multi ? `Capabilities\n${lines.join("\n")}` : lines.join("\n")
    );
  }

  if (hasAvailabilityMatches(facts)) {
    const lines = formatAvailabilityLines(facts.availability!.slots);
    parts.push(
      multi ? `Availability\n${lines.join("\n")}` : lines.join("\n")
    );
  }

  if (hasJoinMatches(facts)) {
    const lines = formatJoinLines(
      facts.join!.matches,
      facts.join!.slots
    );
    if (lines.length === 0 && facts.join!.matches.length > 0) {
      const fallback = formatCapabilityLines(facts.join!.matches);
      parts.push(multi ? `Matched\n${fallback.join("\n")}` : fallback.join("\n"));
    } else if (lines.length > 0) {
      parts.push(multi ? `Matched\n${lines.join("\n")}` : lines.join("\n"));
    }
  }

  if (parts.length === 0) {
    return SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE;
  }

  return parts.join("\n\n");
}

export function buildSynthMessages(
  prompt: string,
  facts: ScheduleAssistantResolvedFacts
): { system: string; user: string } {
  return {
    system: SCHEDULE_ASSISTANT_SYNTH_SYSTEM_PROMPT,
    user: `Q: ${prompt.slice(0, SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH)}\nDATA: ${JSON.stringify(facts)}`,
  };
}
