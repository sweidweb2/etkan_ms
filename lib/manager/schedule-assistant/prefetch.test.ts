import { beforeEach, describe, expect, it, vi } from "vitest";
import { prefetchForRoute } from "@/lib/manager/schedule-assistant/prefetch";
import * as scheduleAssistantService from "@/services/schedule/schedule-assistant.service";
import * as authorizationService from "@/services/auth/authorization.service";

vi.mock("@/services/schedule/schedule-assistant.service", () => ({
  listInstructorsCatalog: vi.fn(),
  listSubjectsCatalog: vi.fn(),
  listCapabilityMatrixCatalog: vi.fn(),
  listSlotsThisWeekCatalog: vi.fn(),
}));

vi.mock("@/services/auth/authorization.service", () => ({
  assertPermission: vi.fn().mockResolvedValue(undefined),
}));

const adminClient = {} as never;
const actorId = "11111111-1111-4111-8111-111111111111";

const instructors = {
  instructors: [{ i: "1", u: "ali" }],
  truncated: false,
  total: 1,
};
const subjects = {
  subjects: ["Arduino"],
  truncated: false,
  total: 1,
};
const matrix = {
  matrix: [{ u: "ali", sub: ["Arduino"] }],
  truncated: false,
  total: 1,
};
const slots = {
  slots: [
    {
      i: "1",
      u: "ali",
      d: "2026-08-07",
      w: "friday",
      s: "09:00",
      e: "11:00",
    },
  ],
  truncated: false,
  total: 1,
};

describe("prefetchForRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scheduleAssistantService.listInstructorsCatalog).mockResolvedValue(
      instructors
    );
    vi.mocked(scheduleAssistantService.listSubjectsCatalog).mockResolvedValue(
      subjects
    );
    vi.mocked(
      scheduleAssistantService.listCapabilityMatrixCatalog
    ).mockResolvedValue(matrix);
    vi.mocked(
      scheduleAssistantService.listSlotsThisWeekCatalog
    ).mockResolvedValue(slots);
  });

  it("returns empty bundle for refuse after permission check", async () => {
    const result = await prefetchForRoute(adminClient, actorId, "refuse");
    expect(result).toEqual({});
    expect(authorizationService.assertPermission).toHaveBeenCalledOnce();
    expect(
      scheduleAssistantService.listInstructorsCatalog
    ).not.toHaveBeenCalled();
  });

  it("loads instructors + subjects + matrix for capabilities", async () => {
    const result = await prefetchForRoute(
      adminClient,
      actorId,
      "capabilities"
    );
    expect(Object.keys(result).sort()).toEqual([
      "instructors",
      "matrix",
      "subjects",
    ]);
    expect(result.slots).toBeUndefined();
  });

  it("loads instructors + slots for availability", async () => {
    const result = await prefetchForRoute(
      adminClient,
      actorId,
      "availability"
    );
    expect(Object.keys(result).sort()).toEqual(["instructors", "slots"]);
    expect(result.matrix).toBeUndefined();
  });

  it("loads all catalogs for capability_availability", async () => {
    const result = await prefetchForRoute(
      adminClient,
      actorId,
      "capability_availability"
    );
    expect(Object.keys(result).sort()).toEqual([
      "instructors",
      "matrix",
      "slots",
      "subjects",
    ]);
  });
});
