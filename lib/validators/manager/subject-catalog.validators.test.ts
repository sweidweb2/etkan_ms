import { describe, expect, it } from "vitest";
import { createCategorySchema } from "@/lib/validators/manager/create-category";
import { createExerciseSchema } from "@/lib/validators/manager/create-exercise";
import { syncSubjectCatalogLinksSchema } from "@/lib/validators/manager/sync-subject-catalog-links";

describe("createCategorySchema", () => {
  it("accepts a valid category", () => {
    const parsed = createCategorySchema.safeParse({
      name: " Algorithms ",
      parent_id: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Algorithms");
    }
  });

  it("rejects a blank name", () => {
    const parsed = createCategorySchema.safeParse({ name: "   " });
    expect(parsed.success).toBe(false);
  });
});

describe("createExerciseSchema", () => {
  it("requires at least one category and a doc body", () => {
    const ok = createExerciseSchema.safeParse({
      title: "Warm-up",
      level: "easy",
      status: "active",
      category_ids: ["11111111-1111-4111-8111-111111111111"],
      body: { type: "doc", content: [{ type: "paragraph" }] },
    });
    expect(ok.success).toBe(true);

    const missingCategories = createExerciseSchema.safeParse({
      title: "Warm-up",
      level: "easy",
      status: "active",
      category_ids: [],
      body: { type: "doc" },
    });
    expect(missingCategories.success).toBe(false);
  });
});

describe("syncSubjectCatalogLinksSchema", () => {
  it("accepts empty link sets", () => {
    const parsed = syncSubjectCatalogLinksSchema.safeParse({
      subject_id: "11111111-1111-4111-8111-111111111111",
      category_ids: [],
      exercise_ids: [],
    });
    expect(parsed.success).toBe(true);
  });
});
