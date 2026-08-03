import { describe, expect, it } from "vitest";
import { extractWorkersAiMessageFields } from "@/lib/cloudflare/workers-ai";
import { matchCatalogSubject } from "@/lib/manager/schedule-assistant/match-subject";
import {
  matchCatalogUsername,
  matchCatalogUsernames,
} from "@/lib/manager/schedule-assistant/match-username";
import { scrubGroups } from "@/lib/manager/schedule-assistant/scrub";
import { tryExactFastPath } from "@/lib/manager/schedule-assistant/fast-path";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";

describe("extractWorkersAiMessageFields", () => {
  it("reads OpenAI-style choices message content/reasoning", () => {
    const fields = extractWorkersAiMessageFields({
      choices: [
        {
          message: {
            content: '{"route":"capabilities"}',
            reasoning: "thinking…",
          },
        },
      ],
    });
    expect(fields.response).toBe('{"route":"capabilities"}');
    expect(fields.reasoning).toBe("thinking…");
  });

  it("falls back to legacy response/reasoning keys", () => {
    const fields = extractWorkersAiMessageFields({
      response: "legacy-json",
      reasoning: "legacy-reason",
    });
    expect(fields.response).toBe("legacy-json");
    expect(fields.reasoning).toBe("legacy-reason");
  });
});

describe("matchCatalogSubject", () => {
  it("exact and contains matches", () => {
    const catalog = ["Python", "Arduino Basics"];
    expect(matchCatalogSubject("python", catalog)).toBe("Python");
    expect(matchCatalogSubject("arduino", catalog)).toBe("Arduino Basics");
  });

  it("fuzzy-matches Arduino → Ardiuno typo in catalog", () => {
    expect(matchCatalogSubject("Arduino", ["Ardiuno", "Python"])).toBe(
      "Ardiuno"
    );
    expect(matchCatalogSubject("ardino", ["Ardiuno", "Python"])).toBe(
      "Ardiuno"
    );
  });
});

describe("matchCatalogUsername", () => {
  const catalog = ["asweid", "3alawiye", "Mahdi_ezzidein", "Ali_lezze2"];

  it("maps spoken names onto DB usernames", () => {
    expect(matchCatalogUsername("asweid", catalog)).toBe("asweid");
    expect(matchCatalogUsername("ali sweid", catalog)).toBe("asweid");
    expect(matchCatalogUsername("Ali Sweid", catalog)).toBe("asweid");
    expect(matchCatalogUsernames(["ali", "sweid"], catalog)).toEqual([
      "asweid",
    ]);
  });

  it("handles underscore usernames", () => {
    expect(matchCatalogUsername("mahdi ezzidein", catalog)).toBe(
      "Mahdi_ezzidein"
    );
  });
});

describe("fast-path + scrub canonicalize to DB values", () => {
  const catalogs: ScheduleAssistantPrefetchCatalogs = {
    instructors: {
      instructors: [
        { i: "1", u: "asweid" },
        { i: "2", u: "3alawiye" },
      ],
      truncated: false,
      total: 2,
    },
    subjects: {
      subjects: ["Ardiuno", "Python"],
      truncated: false,
      total: 2,
    },
    matrix: {
      matrix: [
        { u: "asweid", sub: ["Python"] },
        { u: "3alawiye", sub: ["Ardiuno", "Python"] },
      ],
      truncated: false,
      total: 2,
    },
    slots: {
      slots: [],
      truncated: false,
      total: 0,
    },
  };

  it("fast-path resolves ali sweid + arduino hints", () => {
    const hit = tryExactFastPath({
      route: "capabilities",
      hints: {
        weekdays: [],
        subject_tokens: [],
        username_tokens: ["ali sweid"],
      },
      catalogs,
    });
    expect(hit?.groups[0]?.usernames).toEqual(["asweid"]);

    const subjectHit = tryExactFastPath({
      route: "capabilities",
      hints: {
        weekdays: [],
        subject_tokens: ["ardino"],
        username_tokens: [],
      },
      catalogs,
    });
    expect(subjectHit?.groups[0]?.subject_names).toEqual(["Ardiuno"]);
  });

  it("scrub maps LLM aliases onto catalog strings", () => {
    const scrubbed = scrubGroups(
      [
        {
          id: "g1",
          direction: "username_to_capability",
          usernames: ["Ali Sweid"],
          subject_names: ["Arduino"],
          weekdays: [],
          start_time: null,
          end_time: null,
        },
      ],
      catalogs
    );
    expect(scrubbed[0]?.usernames).toEqual(["asweid"]);
    expect(scrubbed[0]?.subject_names).toEqual(["Ardiuno"]);
  });
});
