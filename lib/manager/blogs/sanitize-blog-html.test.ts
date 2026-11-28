import { describe, expect, it } from "vitest";
import {
  BLOG_BODY_IMG_RESERVE_CLASS,
  sanitizeBlogHtml,
} from "@/lib/manager/blogs/sanitize-blog-html";

describe("sanitizeBlogHtml", () => {
  it("drops non-http image sources and event handlers", () => {
    const clean = sanitizeBlogHtml(
      '<img src="javascript:alert(1)" onerror="alert(2)"><img src=x>'
    );
    expect(clean).not.toMatch(/<img/i);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).not.toMatch(/javascript:/i);
  });

  it("hardens https images for lazy load and CLS reservation", () => {
    const clean = sanitizeBlogHtml(
      '<img src="https://cdn.example.com/a.jpg" alt="A" class="hero">'
    );
    expect(clean).toContain('src="https://cdn.example.com/a.jpg"');
    expect(clean).toContain('alt="A"');
    expect(clean).toContain('loading="lazy"');
    expect(clean).toContain('decoding="async"');
    expect(clean).toContain(BLOG_BODY_IMG_RESERVE_CLASS);
    expect(clean).toContain("hero");
  });

  it("keeps explicit dimensions without the reserve class", () => {
    const clean = sanitizeBlogHtml(
      '<img src="https://cdn.example.com/a.jpg" width="800" height="500" alt="">'
    );
    expect(clean).toContain('width="800"');
    expect(clean).toContain('height="500"');
    expect(clean).not.toContain(BLOG_BODY_IMG_RESERVE_CLASS);
  });
});
