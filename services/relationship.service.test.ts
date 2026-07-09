import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as relationshipRepository from "@/repositories/relationship.repository";
import {
  createRelationshipForManager,
  listRelationshipsForManager,
  updateRelationshipForManager,
} from "@/services/relationship.service";

vi.mock("@/repositories/relationship.repository");

const adminClient = {} as never;

const relationshipId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

const relationshipRecord = {
  id: relationshipId,
  name: "Khaled Ahmad",
  phone: "+961 3 123 456",
  relation_with: "Father",
  major: "Engineering",
  speciality: "Civil Engineering",
  is_useful: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

const validCreateInput = {
  name: "Khaled Ahmad",
  phone: "+961 3 123 456",
  relation_with: "Father",
  major: "Engineering",
  speciality: "Civil Engineering",
  is_useful: true,
};

const validUpdateInput = {
  id: relationshipId,
  ...validCreateInput,
  name: "Khaled Ahmad Updated",
};

describe("listRelationshipsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listRelationshipsForManager(adminClient, ROLES.TEACHER)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns mapped relationships", async () => {
    vi.mocked(relationshipRepository.listRelationships).mockResolvedValue({
      data: [relationshipRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const relationships = await listRelationshipsForManager(
      adminClient,
      ROLES.MANAGER
    );

    expect(relationships).toEqual([
      {
        id: relationshipId,
        name: "Khaled Ahmad",
        phone: "+961 3 123 456",
        relation_with: "Father",
        major: "Engineering",
        speciality: "Civil Engineering",
        is_useful: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when no relationships exist", async () => {
    vi.mocked(relationshipRepository.listRelationships).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const relationships = await listRelationshipsForManager(
      adminClient,
      ROLES.MANAGER
    );

    expect(relationships).toEqual([]);
  });

  it("maps nullable relationship fields to defaults", async () => {
    vi.mocked(relationshipRepository.listRelationships).mockResolvedValue({
      data: [
        {
          id: relationshipId,
          name: "Minimal Contact",
          phone: null,
          relation_with: null,
          major: null,
          speciality: null,
          is_useful: null,
          created_at: null,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const relationships = await listRelationshipsForManager(
      adminClient,
      ROLES.MANAGER
    );

    expect(relationships).toEqual([
      {
        id: relationshipId,
        name: "Minimal Contact",
        phone: null,
        relation_with: null,
        major: null,
        speciality: null,
        is_useful: true,
        created_at: "",
      },
    ]);
  });
});

describe("createRelationshipForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns unauthorized when actor is not a manager", async () => {
    const result = await createRelationshipForManager(
      adminClient,
      ROLES.TEACHER,
      validCreateInput
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("creates a relationship", async () => {
    vi.mocked(relationshipRepository.createRelationship).mockResolvedValue({
      data: relationshipRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });

    const result = await createRelationshipForManager(
      adminClient,
      ROLES.MANAGER,
      validCreateInput
    );

    expect(result).toEqual({
      success: true,
      relationship: {
        id: relationshipId,
        name: "Khaled Ahmad",
        phone: "+961 3 123 456",
        relation_with: "Father",
        major: "Engineering",
        speciality: "Civil Engineering",
        is_useful: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      message: "Relationship created.",
    });
  });

  it("returns validation errors for invalid input", async () => {
    const result = await createRelationshipForManager(adminClient, ROLES.MANAGER, {
      ...validCreateInput,
      name: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("returns error when repository create fails", async () => {
    vi.mocked(relationshipRepository.createRelationship).mockResolvedValue({
      data: null,
      error: { message: "insert failed", name: "PostgrestError", details: "", hint: "", code: "500" },
      count: null,
      status: 500,
      statusText: "Error",
    });

    const result = await createRelationshipForManager(
      adminClient,
      ROLES.MANAGER,
      validCreateInput
    );

    expect(result).toEqual({
      success: false,
      error: "Unable to create relationship. Please try again.",
    });
  });
});

describe("updateRelationshipForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns unauthorized when actor is not a manager", async () => {
    const result = await updateRelationshipForManager(
      adminClient,
      ROLES.TEACHER,
      validUpdateInput
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("returns not found when relationship does not exist", async () => {
    vi.mocked(relationshipRepository.findRelationshipById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateRelationshipForManager(
      adminClient,
      ROLES.MANAGER,
      validUpdateInput
    );

    expect(result).toEqual({
      success: false,
      error: "Relationship not found.",
    });
  });

  it("updates a relationship", async () => {
    vi.mocked(relationshipRepository.findRelationshipById).mockResolvedValue({
      data: relationshipRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(relationshipRepository.updateRelationship).mockResolvedValue({
      data: {
        ...relationshipRecord,
        name: "Khaled Ahmad Updated",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateRelationshipForManager(
      adminClient,
      ROLES.MANAGER,
      validUpdateInput
    );

    expect(result).toEqual({
      success: true,
      relationship: {
        id: relationshipId,
        name: "Khaled Ahmad Updated",
        phone: "+961 3 123 456",
        relation_with: "Father",
        major: "Engineering",
        speciality: "Civil Engineering",
        is_useful: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      message: "Relationship updated.",
    });
  });

  it("returns validation errors for invalid id", async () => {
    const result = await updateRelationshipForManager(adminClient, ROLES.MANAGER, {
      ...validUpdateInput,
      id: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.id).toBeDefined();
    }
  });
});
