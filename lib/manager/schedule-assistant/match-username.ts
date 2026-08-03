/**
 * Map a free-text person token onto a closed catalog username.
 * Exact → compact → initial+surname → token parts → small edit distance.
 * Always returns the catalog (DB) username, never the raw phrase.
 */
export function matchCatalogUsername(
  token: string,
  catalogUsernames: string[]
): string | null {
  const raw = token.trim();
  if (!raw) {
    return null;
  }

  const key = raw.toLowerCase();
  const byLower = new Map(
    catalogUsernames.map((name) => [name.toLowerCase(), name] as const)
  );
  const exact = byLower.get(key);
  if (exact) {
    return exact;
  }

  const compactKey = compactAlnum(key);
  if (compactKey) {
    for (const name of catalogUsernames) {
      if (compactAlnum(name.toLowerCase()) === compactKey) {
        return name;
      }
    }
  }

  const parts = splitNameParts(key);
  if (parts.length >= 2) {
    const initialSurname = `${parts[0]![0]}${parts[parts.length - 1]}`;
    const initialHit = byLower.get(initialSurname);
    if (initialHit) {
      return initialHit;
    }

    const joined = parts.join("");
    for (const name of catalogUsernames) {
      const compactName = compactAlnum(name.toLowerCase());
      if (compactName === joined || compactName.includes(joined) || joined.includes(compactName)) {
        return name;
      }
    }

    const partHits = catalogUsernames.filter((name) => {
      const compactName = compactAlnum(name.toLowerCase());
      return parts.every(
        (part) => part.length >= 2 && compactName.includes(part)
      );
    });
    if (partHits.length === 1) {
      return partHits[0]!;
    }
  }

  const containsHits = catalogUsernames.filter((name) => {
    const lower = name.toLowerCase();
    const compactName = compactAlnum(lower);
    return (
      lower.includes(key) ||
      key.includes(lower) ||
      (compactKey.length >= 3 &&
        (compactName.includes(compactKey) || compactKey.includes(compactName)))
    );
  });
  if (containsHits.length === 1) {
    return containsHits[0]!;
  }
  if (containsHits.length > 1) {
    containsHits.sort(
      (a, b) => a.length - b.length || a.localeCompare(b)
    );
    return containsHits[0]!;
  }

  if (compactKey.length < 4) {
    return null;
  }

  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const name of catalogUsernames) {
    const compactName = compactAlnum(name.toLowerCase());
    if (Math.abs(compactName.length - compactKey.length) > 2) {
      continue;
    }
    const distance = levenshtein(compactKey, compactName);
    if (distance <= 2 && distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }
  return best;
}

/** Resolve one or many hint tokens (e.g. ["ali","sweid"] or ["ali sweid"]). */
export function matchCatalogUsernames(
  tokens: string[],
  catalogUsernames: string[]
): string[] {
  const cleaned = tokens.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return [];
  }

  if (cleaned.length >= 2) {
    const phrase =
      matchCatalogUsername(cleaned.join(" "), catalogUsernames) ??
      matchCatalogUsername(cleaned.join(""), catalogUsernames);
    if (phrase) {
      return [phrase];
    }
  }

  const out: string[] = [];
  for (const token of cleaned) {
    const hit = matchCatalogUsername(token, catalogUsernames);
    if (hit && !out.includes(hit)) {
      out.push(hit);
    }
  }
  return out;
}

function compactAlnum(value: string): string {
  return value.replace(/[^a-z0-9]/g, "");
}

function splitNameParts(value: string): string[] {
  return value
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
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
