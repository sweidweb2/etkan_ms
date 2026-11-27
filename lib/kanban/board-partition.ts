/**
 * Board save invariant: placements must be a complete partition of known ids
 * (every known id exactly once; no unknowns).
 */
export function assertCompleteIdPartition(
  knownIds: ReadonlySet<string>,
  placementIds: readonly string[],
  messages: {
    outOfDate: string;
    notFound: string;
  }
): { ok: true } | { ok: false; error: string } {
  const seen = new Set<string>();
  for (const id of placementIds) {
    if (seen.has(id)) {
      return { ok: false, error: messages.outOfDate };
    }
    seen.add(id);
    if (!knownIds.has(id)) {
      return { ok: false, error: messages.notFound };
    }
  }

  if (seen.size !== knownIds.size) {
    return { ok: false, error: messages.outOfDate };
  }

  return { ok: true };
}
