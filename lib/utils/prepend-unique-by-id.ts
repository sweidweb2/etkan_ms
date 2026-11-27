/**
 * Prepend created row(s) without duplicating keys already present.
 *
 * After a server action, `revalidatePath` can update list props with the new
 * row before the client `onCreated` handler runs. Naive `[created, ...current]`
 * then shows the item twice until a full refresh.
 */
export function prependUniqueByKey<T>(
  current: readonly T[],
  created: T | readonly T[],
  getKey: (item: T) => string
): T[] {
  const items = (Array.isArray(created) ? [...created] : [created]) as T[];
  if (items.length === 0) {
    return [...current];
  }

  const createdKeys = new Set(items.map(getKey));
  return [
    ...items,
    ...current.filter((row) => !createdKeys.has(getKey(row))),
  ];
}

/**
 * Append created row(s) without duplicating keys already present.
 */
export function appendUniqueByKey<T>(
  current: readonly T[],
  created: T | readonly T[],
  getKey: (item: T) => string
): T[] {
  const items = (Array.isArray(created) ? [...created] : [created]) as T[];
  if (items.length === 0) {
    return [...current];
  }

  const createdKeys = new Set(items.map(getKey));
  return [
    ...current.filter((row) => !createdKeys.has(getKey(row))),
    ...items,
  ];
}

export function prependUniqueById<T extends { id: string }>(
  current: readonly T[],
  created: T | readonly T[]
): T[] {
  return prependUniqueByKey(current, created, (item) => item.id);
}

export function appendUniqueById<T extends { id: string }>(
  current: readonly T[],
  created: T | readonly T[]
): T[] {
  return appendUniqueByKey(current, created, (item) => item.id);
}

/**
 * Apply a (possibly partial) board update onto the full list.
 * Keeps rows missing from `next` so filtered kanban persists cannot wipe them.
 */
export function mergeItemsById<T extends { id: string }>(
  current: readonly T[],
  next: readonly T[]
): T[] {
  if (next.length === 0) {
    return [...current];
  }

  const nextById = new Map(next.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const merged = current.map((item) => {
    const updated = nextById.get(item.id);
    if (updated) {
      seen.add(item.id);
      return updated;
    }
    return item;
  });

  for (const item of next) {
    if (!seen.has(item.id)) {
      merged.push(item);
    }
  }

  return merged;
}
