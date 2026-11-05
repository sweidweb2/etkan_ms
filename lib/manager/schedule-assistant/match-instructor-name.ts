import type {
  ScheduleAssistantCompactInstructor,
  ScheduleAssistantInstructorAmbiguity,
  ScheduleAssistantPrefetchCatalogs,
} from "@/types/schedule-assistant";

export type InstructorNameMatch =
  | { status: "matched"; instructor: ScheduleAssistantCompactInstructor }
  | { status: "ambiguous"; candidates: ScheduleAssistantCompactInstructor[] }
  | { status: "none" };

export type InstructorNamesMatch = {
  instructors: ScheduleAssistantCompactInstructor[];
  ambiguities: ScheduleAssistantInstructorAmbiguity[];
};

type CatalogEntry = {
  instructor: ScheduleAssistantCompactInstructor;
  lower: string;
  compact: string;
  parts: string[];
};

const NO_MATCH: InstructorNameMatch = { status: "none" };

/** Unique instructors (by id) across instructor, matrix, and slot catalogs. */
export function collectCatalogInstructors(
  catalogs: ScheduleAssistantPrefetchCatalogs
): ScheduleAssistantCompactInstructor[] {
  const byId = new Map<string, ScheduleAssistantCompactInstructor>();
  const add = (i: string, u: string) => {
    if (!byId.has(i)) {
      byId.set(i, { i, u });
    }
  };
  for (const row of catalogs.instructors?.instructors ?? []) {
    add(row.i, row.u);
  }
  for (const row of catalogs.matrix?.matrix ?? []) {
    add(row.i, row.u);
  }
  for (const slot of catalogs.slots?.slots ?? []) {
    add(slot.i, slot.u);
  }
  return [...byId.values()];
}

/**
 * Map a free-text person phrase onto catalog instructors by full name.
 * Exact → compact → name parts (first/last) → contains → small edit distance.
 * Full names are not unique: several hits in the first matching tier are
 * ambiguous. Always returns catalog entries, never the raw phrase.
 */
export function matchCatalogInstructorName(
  phrase: string,
  catalog: ScheduleAssistantCompactInstructor[]
): InstructorNameMatch {
  const key = normalizeName(phrase);
  if (!key) {
    return NO_MATCH;
  }

  const entries: CatalogEntry[] = catalog.map((instructor) => {
    const lower = normalizeName(instructor.u);
    return {
      instructor,
      lower,
      compact: compactAlnum(lower),
      parts: splitNameParts(lower),
    };
  });

  const exactHits = entries.filter((entry) => entry.lower === key);
  if (exactHits.length > 0) {
    return toMatch(exactHits);
  }

  const compactKey = compactAlnum(key);
  if (compactKey) {
    const compactHits = entries.filter((entry) => entry.compact === compactKey);
    if (compactHits.length > 0) {
      return toMatch(compactHits);
    }
  }

  const keyParts = splitNameParts(key);
  if (keyParts.some((part) => part.length >= 2)) {
    const partHits = entries.filter((entry) =>
      keyParts.every((part) =>
        entry.parts.some((namePart) => namePartMatches(part, namePart))
      )
    );
    if (partHits.length > 0) {
      return toMatch(partHits);
    }
  }

  const containsHits = entries.filter(
    (entry) =>
      key.includes(entry.lower) ||
      (compactKey.length >= 3 &&
        (entry.compact.includes(compactKey) ||
          (entry.compact.length >= 3 && compactKey.includes(entry.compact))))
  );
  if (containsHits.length > 0) {
    return toMatch(containsHits);
  }

  if (compactKey.length < 4) {
    return NO_MATCH;
  }

  let best: CatalogEntry[] = [];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const distance = fuzzyNameDistance(keyParts, compactKey, entry);
    if (distance > 2) {
      continue;
    }
    if (distance < bestDistance) {
      best = [entry];
      bestDistance = distance;
    } else if (distance === bestDistance) {
      best.push(entry);
    }
  }
  return toMatch(best);
}

/**
 * Resolve hint tokens (e.g. ["ali hassan"] or ["ali", "hassan"]) onto
 * catalog instructors. Ambiguous phrases are reported, never guessed.
 */
export function matchCatalogInstructorNames(
  tokens: string[],
  catalog: ScheduleAssistantCompactInstructor[]
): InstructorNamesMatch {
  const cleaned = tokens.map((token) => token.trim()).filter(Boolean);
  const result: InstructorNamesMatch = { instructors: [], ambiguities: [] };
  if (cleaned.length === 0) {
    return result;
  }

  if (cleaned.length >= 2) {
    const phrase = cleaned.join(" ");
    const whole = matchCatalogInstructorName(phrase, catalog);
    if (whole.status === "matched") {
      return { instructors: [whole.instructor], ambiguities: [] };
    }
    if (whole.status === "ambiguous") {
      return {
        instructors: [],
        ambiguities: [{ phrase, candidates: whole.candidates }],
      };
    }
  }

  for (const token of cleaned) {
    const hit = matchCatalogInstructorName(token, catalog);
    if (
      hit.status === "matched" &&
      !result.instructors.some((row) => row.i === hit.instructor.i)
    ) {
      result.instructors.push(hit.instructor);
    } else if (hit.status === "ambiguous") {
      result.ambiguities = mergeInstructorAmbiguities(result.ambiguities, [
        { phrase: token, candidates: hit.candidates },
      ]);
    }
  }
  return result;
}

/** Concatenate ambiguity lists, keeping the first entry per phrase. */
export function mergeInstructorAmbiguities(
  ...lists: ScheduleAssistantInstructorAmbiguity[][]
): ScheduleAssistantInstructorAmbiguity[] {
  const byPhrase = new Map<string, ScheduleAssistantInstructorAmbiguity>();
  for (const list of lists) {
    for (const ambiguity of list) {
      const key = normalizeName(ambiguity.phrase);
      if (!byPhrase.has(key)) {
        byPhrase.set(key, ambiguity);
      }
    }
  }
  return [...byPhrase.values()];
}

function toMatch(entries: CatalogEntry[]): InstructorNameMatch {
  const byId = new Map<string, ScheduleAssistantCompactInstructor>();
  for (const entry of entries) {
    byId.set(entry.instructor.i, entry.instructor);
  }
  const candidates = [...byId.values()].sort(
    (a, b) => a.u.localeCompare(b.u) || a.i.localeCompare(b.i)
  );
  if (candidates.length === 0) {
    return NO_MATCH;
  }
  if (candidates.length === 1) {
    return { status: "matched", instructor: candidates[0]! };
  }
  return { status: "ambiguous", candidates };
}

function namePartMatches(part: string, namePart: string): boolean {
  return part === namePart || (part.length === 1 && namePart.startsWith(part));
}

function fuzzyNameDistance(
  keyParts: string[],
  compactKey: string,
  entry: CatalogEntry
): number {
  let distance = Number.POSITIVE_INFINITY;
  if (Math.abs(entry.compact.length - compactKey.length) <= 2) {
    distance = levenshtein(compactKey, entry.compact);
  }

  let partsDistance = 0;
  for (const part of keyParts) {
    let partBest = Number.POSITIVE_INFINITY;
    for (const namePart of entry.parts) {
      if (namePartMatches(part, namePart)) {
        partBest = 0;
        break;
      }
      if (part.length >= 4 && Math.abs(namePart.length - part.length) <= 2) {
        partBest = Math.min(partBest, levenshtein(part, namePart));
      }
    }
    partsDistance += partBest;
  }

  return Math.min(distance, partsDistance);
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function compactAlnum(value: string): string {
  return value.replace(/[^\p{L}\p{N}]/gu, "");
}

function splitNameParts(value: string): string[] {
  return value
    .split(/[\s._-]+/)
    .map((part) => compactAlnum(part))
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
