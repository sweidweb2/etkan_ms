import { describe, expect, it } from "vitest";
import {
  buildAvatarObjectPath,
  getAvatarObjectPathFromPublicUrl,
} from "@/lib/avatars/storage-path";

describe("avatar storage paths", () => {
  it("builds {userId}/{uuid}.webp", () => {
    expect(buildAvatarObjectPath("user-1", "abc")).toBe("user-1/abc.webp");
    expect(buildAvatarObjectPath("user-1")).toMatch(
      /^user-1\/[0-9a-f-]{36}\.webp$/
    );
  });

  it("extracts the object path from a public avatars URL", () => {
    expect(
      getAvatarObjectPathFromPublicUrl(
        "http://localhost:8000/storage/v1/object/public/avatars/user-1/abc.webp"
      )
    ).toBe("user-1/abc.webp");
  });

  it("ignores URLs from other buckets or invalid URLs", () => {
    expect(
      getAvatarObjectPathFromPublicUrl(
        "http://localhost:8000/storage/v1/object/public/class-covers/c/abc.webp"
      )
    ).toBeNull();
    expect(getAvatarObjectPathFromPublicUrl("not a url")).toBeNull();
  });
});
