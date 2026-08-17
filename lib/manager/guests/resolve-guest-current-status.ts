import { isGuestStatus, type GuestStatus } from "@/lib/constants/guest";

type StatusEventLike = {
  status: string;
  created_at: string;
};

/** Latest recorded pipeline node, used to highlight the schema. */
export function latestRecordedPipelineStatus(
  events: readonly StatusEventLike[]
): GuestStatus | null {
  const ordered = [...events].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  for (const event of ordered) {
    if (isGuestStatus(event.status)) {
      return event.status;
    }
  }

  return null;
}
