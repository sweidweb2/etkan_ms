import { describe, expect, it } from "vitest";
import {
  AUTHOR_STORAGE_BUCKET,
  BLOGS_STORAGE_BUCKET,
  buildBlogImageStoragePath,
  getBlogImageObjectPathFromPublicUrl,
  getBlogImagePublicUrl,
  sanitizeBlogImageFileName,
  splitBlogImageStoragePath,
} from "@/lib/manager/blogs/storage-path";
import {
  estimateReadingTimeMinutes,
  plainTextFromHtml,
} from "@/lib/manager/blogs/reading-time";
import { sanitizeBlogHtml } from "@/lib/manager/blogs/sanitize-blog-html";
import {
  createBlogSchema,
  parseCreateBlogFormData,
  parseCreateBlogFromJsonFormData,
} from "@/lib/validators/manager/create-blog";

describe("blog storage paths", () => {
  it("sanitizes filenames", () => {
    expect(sanitizeBlogImageFileName("../weird name!!.PNG")).toBe(
      "weird-name.PNG"
    );
    expect(sanitizeBlogImageFileName("")).toBe("image");
  });

  it("builds and splits bucket paths", () => {
    const path = buildBlogImageStoragePath(
      BLOGS_STORAGE_BUCKET,
      "cover.jpg",
      "abc"
    );
    expect(path).toBe("blogs/abc-cover.jpg");
    expect(splitBlogImageStoragePath(path, BLOGS_STORAGE_BUCKET)).toEqual({
      bucket: BLOGS_STORAGE_BUCKET,
      objectPath: "abc-cover.jpg",
    });
  });

  it("builds public URLs and extracts object paths", () => {
    const url = getBlogImagePublicUrl(
      "https://example.supabase.co",
      "blogs/abc-cover.jpg",
      BLOGS_STORAGE_BUCKET
    );
    expect(url).toBe(
      "https://example.supabase.co/storage/v1/object/public/blogs/abc-cover.jpg"
    );
    expect(
      getBlogImageObjectPathFromPublicUrl(url, BLOGS_STORAGE_BUCKET)
    ).toBe("abc-cover.jpg");
    expect(
      getBlogImageObjectPathFromPublicUrl(url, AUTHOR_STORAGE_BUCKET)
    ).toBeNull();
  });
});

describe("reading time", () => {
  it("strips html and estimates minutes", () => {
    expect(plainTextFromHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world"
    );
    expect(estimateReadingTimeMinutes("")).toBe(1);
    const words = Array.from({ length: 450 }, () => "word").join(" ");
    expect(estimateReadingTimeMinutes(`<p>${words}</p>`)).toBe(3);
  });
});

describe("sanitizeBlogHtml", () => {
  it("strips scripts and event handlers", () => {
    const dirty =
      '<p onclick="alert(1)">Hi</p><script>alert(2)</script><a href="javascript:alert(3)">x</a>';
    const clean = sanitizeBlogHtml(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("Hi");
  });
});

describe("createBlogSchema", () => {
  it("accepts a valid draft payload", () => {
    const parsed = createBlogSchema.safeParse({
      slug: "hello-world",
      title: "Hello world",
      summary: "A short summary for the card.",
      body_html: "<p>Body</p>",
      categories: ["Updates", "Community"],
      sources: ["https://example.com"],
      author_name: "Ada Lovelace",
      status: "draft",
      is_featured: false,
      meta_title: null,
      meta_description: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid slugs and oversized categories", () => {
    const badSlug = createBlogSchema.safeParse({
      slug: "Hello World",
      title: "Hello",
      summary: "Summary text",
      body_html: "",
      categories: [],
      sources: [],
      author_name: "Ada",
      status: "draft",
      is_featured: false,
      meta_title: null,
      meta_description: null,
    });
    expect(badSlug.success).toBe(false);

    const tooManyCategories = createBlogSchema.safeParse({
      slug: "hello",
      title: "Hello",
      summary: "Summary text",
      body_html: "",
      categories: Array.from({ length: 9 }, (_, i) => `Cat${i}`),
      sources: [],
      author_name: "Ada",
      status: "published",
      is_featured: true,
      meta_title: null,
      meta_description: null,
    });
    expect(tooManyCategories.success).toBe(false);
  });

  it("parses FormData categories from comma text", () => {
    const formData = new FormData();
    formData.set("slug", "news-post");
    formData.set("title", "News post");
    formData.set("summary", "Summary for news");
    formData.set("body_html", "<p>Hi</p>");
    formData.set("categories", "News, Community");
    formData.set("sources", "");
    formData.set("author_name", "Ada");
    formData.set("status", "draft");
    formData.set("is_featured", "false");
    formData.set("meta_title", "");
    formData.set("meta_description", "");

    const parsed = parseCreateBlogFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.categories).toEqual(["News", "Community"]);
      expect(parsed.data.is_featured).toBe(false);
    }
  });

  it("parses advanced JSON create with optional files", () => {
    const formData = new FormData();
    formData.set(
      "blog_json",
      JSON.stringify({
        slug: "from-json",
        title: "From JSON",
        summary: "Imported via advanced create",
        body_html: "<p>Body</p>",
        categories: ["News"],
        sources: [],
        author_name: "Ada",
        status: "published",
        is_featured: true,
        meta_title: null,
        meta_description: null,
      })
    );

    const parsed = parseCreateBlogFromJsonFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slug).toBe("from-json");
      expect(parsed.data.status).toBe("published");
      expect(parsed.data.is_featured).toBe(true);
      expect(parsed.data.categories).toEqual(["News"]);
    }
  });

  it("rejects invalid advanced JSON", () => {
    const formData = new FormData();
    formData.set("blog_json", "{not-json");
    const parsed = parseCreateBlogFromJsonFormData(formData);
    expect(parsed.success).toBe(false);
  });
});
