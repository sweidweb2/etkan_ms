import { describe, expect, it } from "vitest";
import { toEmbeddableGalleryImageUrl } from "@/lib/utils/gallery-image-url";

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
});
