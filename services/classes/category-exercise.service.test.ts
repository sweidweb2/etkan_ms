import { beforeEach, describe, expect, it, vi } from "vitest";
import * as categoryRepository from "@/repositories/category.repository";
import * as exerciseRepository from "@/repositories/exercise.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  createCategoryForManager,
  deleteCategoryForManager,
} from "@/services/classes/category.service";
import { deleteExerciseForManager } from "@/services/classes/exercise.service";

vi.mock("@/repositories/category.repository");
vi.mock("@/repositories/exercise.repository");
vi.mock("@/repositories/subject.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const categoryId = "22222222-2222-4222-8222-222222222222";
const exerciseId = "33333333-3333-4333-8333-333333333333";

describe("createCategoryForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a root category", async () => {
    vi.mocked(categoryRepository.createCategory).mockResolvedValue({
      data: {
        id: categoryId,
        parent_id: null,
        name: "Basics",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);

    const result = await createCategoryForManager(
      adminClient,
      actor.userId,
      actor,
      { name: "Basics", parent_id: "" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.category.name).toBe("Basics");
    }
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });
});

describe("deleteCategoryForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("blocks delete when category is linked", async () => {
    vi.mocked(categoryRepository.findCategoryById).mockResolvedValue({
      data: {
        id: categoryId,
        parent_id: null,
        name: "Basics",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(categoryRepository.countCategoryExercises).mockResolvedValue({
      count: 1,
      error: null,
      data: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(categoryRepository.countSubjectCategories).mockResolvedValue({
      count: 0,
      error: null,
      data: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await deleteCategoryForManager(
      adminClient,
      actor.userId,
      actor,
      categoryId
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/linked/i);
    }
  });
});

describe("deleteExerciseForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("blocks delete when exercise is linked to a subject", async () => {
    vi.mocked(exerciseRepository.findExerciseById).mockResolvedValue({
      data: {
        id: exerciseId,
        title: "Warm-up",
        body: { type: "doc" },
        level: "easy",
        status: "active",
        categories: ["Basics"],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(exerciseRepository.countSubjectExercises).mockResolvedValue({
      count: 2,
      error: null,
      data: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await deleteExerciseForManager(
      adminClient,
      actor.userId,
      actor,
      exerciseId
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/subjects/i);
    }
  });
});
