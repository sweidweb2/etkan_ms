import { describe, expect, it } from "vitest";
import {
  PUBLIC_PROJECT_FIELD_LIMITS,
  PUBLIC_PROJECT_IMAGE_MAX_BYTES,
} from "@/lib/constants/manager-public-project";
import {
  createPublicProjectSchema,
  parseCreatePublicProjectFormData,
} from "@/lib/validators/manager/create-public-project";
import { updatePublicProjectSchema } from "@/lib/validators/manager/update-public-project";

function makeImageFile(
  name = "portal.png",
  type = "image/png",
  sizeBytes = 1024
): File {
  const content = new Uint8Array(Math.max(sizeBytes, 1));
  return new File([content], name, { type });
}

const validInput = {
  classification: "students",
  category: "Mobile app",
  title: "Student portal",
  body: "A portal for students.",
  author: "Ali Sweid",
  image: makeImageFile(),
  href: "/projects",
};

describe("createPublicProjectSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = createPublicProjectSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.href).toBe("/projects");
      expect(parsed.data.category).toBe("Mobile app");
      expect(parsed.data.author).toBe("Ali Sweid");
      expect(parsed.data.image.type).toBe("image/png");
    }
  });

  it("accepts an empty author as null", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      author: "   ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.author).toBeNull();
    }
  });

  it("rejects an author over max length", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      author: "a".repeat(PUBLIC_PROJECT_FIELD_LIMITS.author.max + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an empty href as null", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      href: "   ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.href).toBeNull();
    }
  });

  it("accepts an http(s) href", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      href: "https://example.com/app",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing title", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      title: "  ",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a title over max length", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      title: "a".repeat(PUBLIC_PROJECT_FIELD_LIMITS.title.max + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a body over max length", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      body: "a".repeat(PUBLIC_PROJECT_FIELD_LIMITS.body.max + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a missing image", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      image: undefined,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.image).toBeUndefined();
    }
  });

  it("rejects a disallowed image type", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      image: makeImageFile("notes.pdf", "application/pdf"),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an image over the max size", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      image: makeImageFile(
        "huge.png",
        "image/png",
        PUBLIC_PROJECT_IMAGE_MAX_BYTES + 1
      ),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a bad href", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      href: "example.com",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid classification", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      classification: "alumni",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing category", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      category: "  ",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a category over max length", () => {
    const parsed = createPublicProjectSchema.safeParse({
      ...validInput,
      category: "a".repeat(PUBLIC_PROJECT_FIELD_LIMITS.category.max + 1),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseCreatePublicProjectFormData", () => {
  it("parses FormData into typed input", () => {
    const formData = new FormData();
    formData.set("classification", "teachers");
    formData.set("category", "Mobile app");
    formData.set("title", "Teacher app");
    formData.set("body", "For teachers.");
    formData.set("author", "Sara");
    formData.set("image", makeImageFile("teacher.png"));
    formData.set("href", "");

    const parsed = parseCreatePublicProjectFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.classification).toBe("teachers");
      expect(parsed.data.category).toBe("Mobile app");
      expect(parsed.data.author).toBe("Sara");
      expect(parsed.data.href).toBeNull();
      expect(parsed.data.image.name).toBe("teacher.png");
    }
  });

  it("returns field errors for invalid FormData", () => {
    const formData = new FormData();
    formData.set("classification", "students");
    formData.set("category", "Mobile app");
    formData.set("title", "");

    const parsed = parseCreatePublicProjectFormData(formData);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors?.title?.[0]).toBeTruthy();
    }
  });
});

describe("updatePublicProjectSchema", () => {
  it("requires a uuid id", () => {
    const parsed = updatePublicProjectSchema.safeParse({
      ...validInput,
      id: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an update without a new image", () => {
    const parsed = updatePublicProjectSchema.safeParse({
      classification: validInput.classification,
      category: validInput.category,
      title: validInput.title,
      body: validInput.body,
      author: validInput.author,
      href: validInput.href,
      id: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an update with a replacement image", () => {
    const parsed = updatePublicProjectSchema.safeParse({
      ...validInput,
      id: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.image?.type).toBe("image/png");
    }
  });
});
