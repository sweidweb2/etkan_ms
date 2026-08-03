/**
 * Schedule-assistant pipeline debug logger.
 * Enable with SCHEDULE_ASSISTANT_DEBUG=1 (or unset in production).
 * Always on when NODE_ENV=development unless SCHEDULE_ASSISTANT_DEBUG=0.
 */
export function isScheduleAssistantDebugEnabled(): boolean {
  const flag = process.env.SCHEDULE_ASSISTANT_DEBUG?.trim();
  if (flag === "0" || flag === "false") {
    return false;
  }
  if (flag === "1" || flag === "true") {
    return true;
  }
  return process.env.NODE_ENV === "development";
}

export function scheduleAssistantDebug(
  step: string,
  payload?: Record<string, unknown>
): void {
  if (!isScheduleAssistantDebugEnabled()) {
    return;
  }
  const stamp = new Date().toISOString();
  if (payload === undefined) {
    console.info(`[schedule-assistant ${stamp}] ${step}`);
    return;
  }
  console.info(
    `[schedule-assistant ${stamp}] ${step}`,
    JSON.stringify(payload, null, 2)
  );
}

export function summarizeCatalogs(catalogs: {
  instructors?: { total?: number; instructors?: unknown[] };
  subjects?: { total?: number; subjects?: unknown[] };
  matrix?: { total?: number; matrix?: unknown[] };
  slots?: { total?: number; slots?: unknown[] };
}): Record<string, unknown> {
  return {
    instructors: catalogs.instructors?.total ?? catalogs.instructors?.instructors?.length ?? 0,
    subjects: catalogs.subjects?.total ?? catalogs.subjects?.subjects?.length ?? 0,
    subject_sample: (catalogs.subjects?.subjects ?? []).slice(0, 8),
    matrix: catalogs.matrix?.total ?? catalogs.matrix?.matrix?.length ?? 0,
    matrix_sample: (catalogs.matrix?.matrix ?? []).slice(0, 5),
    slots: catalogs.slots?.total ?? catalogs.slots?.slots?.length ?? 0,
    slot_sample: (catalogs.slots?.slots ?? []).slice(0, 5),
  };
}
