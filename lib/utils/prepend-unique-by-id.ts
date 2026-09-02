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
