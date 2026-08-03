/**
 * Map a free-text subject token onto a closed catalog name.
 * Exact → contains → small edit distance (typos like Arduino/Ardiuno).
 */
export function matchCatalogSubject(
  token: string,
  catalogSubjects: string[]
): string | null {
  const key = token.trim().toLowerCase();
  if (!key) {
    return null;
  }

  const byLower = new Map(
    catalogSubjects.map((name) => [name.toLowerCase(), name] as const)
  );
  const exact = byLower.get(key);
  if (exact) {
    return exact;
  }

  const containsHits = catalogSubjects.filter((name) => {
    const lower = name.toLowerCase();
    return lower.includes(key) || key.includes(lower);
  });
  if (containsHits.length === 1) {
    return containsHits[0]!;
  }
  if (containsHits.length > 1) {
    containsHits.sort((a, b) => a.length - b.length || a.localeCompare(b));
    return containsHits[0]!;
  }

  if (key.length < 5) {
    return null;
  }

  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const name of catalogSubjects) {
    const lower = name.toLowerCase();
    if (Math.abs(lower.length - key.length) > 2) {
      continue;
    }
    const distance = levenshtein(key, lower);
    if (distance <= 2 && distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }
  return best;
}

function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j] ?? 0;
    }
  }

  return prev[b.length] ?? b.length;
}
