import { describe, expect, it, vi, beforeEach } from "vitest";
import * as publicProjectRepository from "@/repositories/public-project.repository";
import * as publicProjectStorageRepository from "@/repositories/public-project-storage.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  createPublicProjectForManager,
  deletePublicProjectForManager,
  getPublicProjectForManager,
  listPublicProjectsForManager,
  listPublicProjectsForPublic,
  updatePublicProjectForManager,
} from "@/services/public-project.service";

vi.mock("@/repositories/public-project.repository");
vi.mock("@/repositories/public-project-storage.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/authorization.service", () => ({
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

const projectId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const storedImageUrl =
  "https://example.supabase.co/storage/v1/object/public/projects/abc-portal.png";

function makeImageFile(): File {
  return new File([new Uint8Array(32)], "portal.png", { type: "image/png" });
}

const projectRecord = {
  id: projectId,
  classification: "students",
  category: "Mobile app",
  title: "Student portal",
  body: "A portal for students.",
  image_url: storedImageUrl,
  href: "/projects",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

const validCreateInput = {
  classification: "students",
  category: "Mobile app",
  title: "Student portal",
  body: "A portal for students.",
  image: makeImageFile(),
  href: "/projects",
};

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

describe("listPublicProjectsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is unauthorized", async () => {
    await expect(
      listPublicProjectsForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns mapped projects", async () => {
    vi.mocked(publicProjectRepository.listPublicProjects).mockResolvedValue({
      data: [projectRecord],
      ...okResult,
    });

    const projects = await listPublicProjectsForManager(
      adminClient,
      actor.userId
    );

    expect(projects).toEqual([projectRecord]);
  });
});

describe("listPublicProjectsForPublic", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns mapped projects without a manager actor", async () => {
    vi.mocked(publicProjectRepository.listPublicProjects).mockResolvedValue({
      data: [projectRecord],
      ...okResult,
    });

    const projects = await listPublicProjectsForPublic(adminClient);

    expect(projects).toEqual([projectRecord]);
  });
});

describe("getPublicProjectForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when the project is missing", async () => {
    vi.mocked(publicProjectRepository.findPublicProjectById).mockResolvedValue({
      data: null,
      ...okResult,
    });

    const project = await getPublicProjectForManager(
      adminClient,
      actor.userId,
      projectId
    );

    expect(project).toBeNull();
  });
});

describe("createPublicProjectForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is not a manager", async () => {
    const result = await createPublicProjectForManager(
      adminClient,
      null,
      actor,
      validCreateInput
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(publicProjectRepository.createPublicProject).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid input", async () => {
    const result = await createPublicProjectForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validCreateInput, title: "" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.title).toBeDefined();
    }
  });

  it("creates a project, uploads the image, and records an audit log", async () => {
    vi.mocked(
      publicProjectStorageRepository.uploadPublicProjectImage
    ).mockResolvedValue({ error: null });
    vi.mocked(
      publicProjectStorageRepository.getPublicProjectImageUrl
    ).mockReturnValue(storedImageUrl);
    vi.mocked(publicProjectRepository.createPublicProject).mockResolvedValue({
      data: projectRecord,
      ...okResult,
      status: 201,
      statusText: "Created",
    });

    const result = await createPublicProjectForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result).toEqual({
      success: true,
      project: projectRecord,
      message: "Project created.",
    });
    expect(
      publicProjectStorageRepository.uploadPublicProjectImage
    ).toHaveBeenCalledTimes(1);
    expect(publicProjectRepository.createPublicProject).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ image_url: storedImageUrl })
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledTimes(1);
  });
});

describe("updatePublicProjectForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is not a manager", async () => {
    const result = await updatePublicProjectForManager(
      adminClient,
      null,
      actor,
      { ...validCreateInput, id: projectId }
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("returns not found when the project is missing", async () => {
    vi.mocked(publicProjectRepository.findPublicProjectById).mockResolvedValue({
      data: null,
      ...okResult,
    });

    const result = await updatePublicProjectForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validCreateInput, id: projectId }
    );

    expect(result).toEqual({ success: false, error: "Project not found." });
    expect(publicProjectRepository.updatePublicProject).not.toHaveBeenCalled();
  });

  it("updates a project without replacing the image", async () => {
    vi.mocked(publicProjectRepository.findPublicProjectById).mockResolvedValue({
      data: projectRecord,
      ...okResult,
    });
    vi.mocked(publicProjectRepository.updatePublicProject).mockResolvedValue({
      data: { ...projectRecord, title: "Updated portal" },
      ...okResult,
    });

    const result = await updatePublicProjectForManager(
      adminClient,
      actor.userId,
      actor,
      {
        classification: validCreateInput.classification,
        category: validCreateInput.category,
        title: "Updated portal",
        body: validCreateInput.body,
        href: validCreateInput.href,
        id: projectId,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.project.title).toBe("Updated portal");
      expect(result.message).toBe("Project updated.");
    }
    expect(
      publicProjectStorageRepository.uploadPublicProjectImage
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledTimes(1);
  });
});

describe("deletePublicProjectForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    vi.mocked(
      publicProjectStorageRepository.removePublicProjectImages
    ).mockResolvedValue({ error: null });
  });

  it("returns unauthorized when actor is not a manager", async () => {
    const result = await deletePublicProjectForManager(
      adminClient,
      null,
      actor,
      projectId
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(
      publicProjectRepository.deletePublicProjectById
    ).not.toHaveBeenCalled();
    expect(
      publicProjectStorageRepository.removePublicProjectImages
    ).not.toHaveBeenCalled();
  });

  it("deletes the stored image and the project row", async () => {
    vi.mocked(publicProjectRepository.findPublicProjectById).mockResolvedValue({
      data: projectRecord,
      ...okResult,
    });
    vi.mocked(publicProjectRepository.deletePublicProjectById).mockResolvedValue(
      {
        data: null,
        ...okResult,
      }
    );

    const result = await deletePublicProjectForManager(
      adminClient,
      actor.userId,
      actor,
      projectId
    );

    expect(result).toEqual({
      success: true,
      message: "Project deleted.",
    });
    expect(
      publicProjectStorageRepository.removePublicProjectImages
    ).toHaveBeenCalledWith(adminClient, ["abc-portal.png"]);
    expect(
      publicProjectRepository.deletePublicProjectById
    ).toHaveBeenCalledWith(adminClient, projectId);
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledTimes(1);
  });

  it("does not delete the row when the stored image cannot be removed", async () => {
    vi.mocked(publicProjectRepository.findPublicProjectById).mockResolvedValue({
      data: projectRecord,
      ...okResult,
    });
    vi.mocked(
      publicProjectStorageRepository.removePublicProjectImages
    ).mockResolvedValue({ error: { message: "Storage failed." } });

    const result = await deletePublicProjectForManager(
      adminClient,
      actor.userId,
      actor,
      projectId
    );

    expect(result).toEqual({
      success: false,
      error: "Unable to delete the project image. Please try again.",
    });
    expect(
      publicProjectRepository.deletePublicProjectById
    ).not.toHaveBeenCalled();
  });
});
