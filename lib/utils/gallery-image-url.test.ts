import { describe, expect, it } from "vitest";
import {
  isSupabasePublicStorageUrl,
  toEmbeddableGalleryImageUrl,
} from "@/lib/utils/gallery-image-url";

describe("isSupabasePublicStorageUrl", () => {
  it("detects public storage object URLs", () => {
    expect(
      isSupabasePublicStorageUrl(
        "http://127.0.0.1:54521/storage/v1/object/public/gallery/abc.webp"
      )
    ).toBe(true);
    expect(
      isSupabasePublicStorageUrl(
        "https://xyz.supabase.co/storage/v1/object/public/gallery/abc.webp"
      )
    ).toBe(true);
  });

  it("rejects Drive and other URLs", () => {
    expect(
      isSupabasePublicStorageUrl("https://drive.google.com/uc?id=abc")
    ).toBe(false);
    expect(isSupabasePublicStorageUrl("https://cdn.example.com/a.png")).toBe(
      false
    );
  });
});

describe("toEmbeddableGalleryImageUrl", () => {
  it("converts drive uc?id links to thumbnail URLs", () => {
    expect(
      toEmbeddableGalleryImageUrl(
        "https://drive.google.com/uc?id=1ZJ9n9d6-P0b6MU7LVdsOXJ4yJR82Ylmw"
      )
    ).toBe(
      "https://drive.google.com/thumbnail?id=1ZJ9n9d6-P0b6MU7LVdsOXJ4yJR82Ylmw&sz=w1200"
    );
  });

  it("converts export=view links", () => {
    expect(
      toEmbeddableGalleryImageUrl(
        "https://drive.google.com/uc?export=view&id=abc123"
      )
    ).toBe("https://drive.google.com/thumbnail?id=abc123&sz=w1200");
  });

  it("converts /file/d/ path links", () => {
    expect(
      toEmbeddableGalleryImageUrl(
        "https://drive.google.com/file/d/abc123/view?usp=sharing"
      )
    ).toBe("https://drive.google.com/thumbnail?id=abc123&sz=w1200");
  });

  it("converts googleusercontent /d/ links to thumbnails", () => {
    expect(
      toEmbeddableGalleryImageUrl(
        "https://lh3.googleusercontent.com/d/abc123=w1600"
      )
    ).toBe("https://drive.google.com/thumbnail?id=abc123&sz=w1200");
  });

  it("leaves non-drive URLs unchanged", () => {
    const src =
      "https://images.unsplash.com/photo-1?q=80&w=900&auto=format&fit=crop";
    expect(toEmbeddableGalleryImageUrl(src)).toBe(src);
  });

  it("passes through Supabase Storage public URLs unchanged", () => {
    const src =
      "http://127.0.0.1:54521/storage/v1/object/public/gallery/uuid-shot.webp";
    expect(toEmbeddableGalleryImageUrl(src)).toBe(src);
  });
});
