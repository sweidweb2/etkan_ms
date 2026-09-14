import { describe, expect, it } from "vitest";
import {
  AUTHOR_STORAGE_BUCKET,
  BLOGS_STORAGE_BUCKET,
  buildBlogImageStoragePath,
  getBlogImageObjectPathFromPublicUrl,
  sanitizeBlogImageFileName,
} from "@/lib/manager/blogs/storage-path";
import { estimateReadingTimeMinutes } from "@/lib/manager/blogs/reading-time";
import { sanitizeBlogHtml } from "@/lib/manager/blogs/sanitize-blog-html";
import { isBackupStorageBucket } from "@/lib/constants/backup-storage";

describe("blog helpers", () => {
  it("registers blogs storage buckets for backup", () => {
    expect(isBackupStorageBucket(BLOGS_STORAGE_BUCKET)).toBe(true);
    expect(isBackupStorageBucket(AUTHOR_STORAGE_BUCKET)).toBe(true);
  });

  it("builds storage keys under the blogs bucket", () => {
    expect(sanitizeBlogImageFileName("My Photo.png")).toBe("My-Photo.png");
    expect(
      buildBlogImageStoragePath(BLOGS_STORAGE_BUCKET, "cover.webp", "id1")
    ).toBe("blogs/id1-cover.webp");
    expect(
      getBlogImageObjectPathFromPublicUrl(
        "https://x.supabase.co/storage/v1/object/public/auther/a-avatar.png",
        AUTHOR_STORAGE_BUCKET
      )
    ).toBe("a-avatar.png");
  });

  it("estimates reading time and sanitizes html", () => {
    expect(estimateReadingTimeMinutes("<p>one two</p>")).toBe(1);
    expect(sanitizeBlogHtml('<img src=x onerror="alert(1)">')).not.toContain(
      "onerror"
    );
  });
});
