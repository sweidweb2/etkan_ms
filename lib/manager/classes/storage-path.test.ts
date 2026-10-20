import { describe, expect, it } from "vitest";
import {
  buildClassCoverStoragePath,
  getClassCoverObjectPathFromPublicUrl,
  splitClassCoverStoragePath,
} from "@/lib/manager/classes/storage-path";

describe("class cover storage paths", () => {
  it("builds a webp key under the class id", () => {
    expect(buildClassCoverStoragePath("class-1", "cover-1")).toBe(
      "class-covers/class-1/cover-1.webp"
    );
  });

  it("splits the bucket prefix from the object key", () => {
    expect(
      splitClassCoverStoragePath("class-covers/class-1/cover-1.webp")
    ).toEqual({
      bucket: "class-covers",
      objectPath: "class-1/cover-1.webp",
    });
  });

  it("reads the object key from a public storage URL", () => {
    expect(
      getClassCoverObjectPathFromPublicUrl(
        "http://127.0.0.1:54321/storage/v1/object/public/class-covers/class-1/cover-1.webp"
      )
    ).toBe("class-1/cover-1.webp");
  });

  it("ignores URLs from other buckets", () => {
    expect(
      getClassCoverObjectPathFromPublicUrl(
        "http://127.0.0.1:54321/storage/v1/object/public/projects/photo.webp"
      )
    ).toBeNull();
  });
});
