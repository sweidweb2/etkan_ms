import { describe, expect, it } from "vitest";
import { sanitizeRichHtml } from "@/lib/security/sanitize-rich-html";

describe("sanitizeRichHtml", () => {
  it("strips scripts, handlers, and dangerous URIs", () => {
    const dirty =
      '<p onclick="alert(1)">Hi</p><script>alert(2)</script><a href="javascript:alert(3)">x</a><img src=x onerror="alert(4)">';
    const clean = sanitizeRichHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).not.toMatch(/<img/i);
    expect(clean).toContain("Hi");
  });

  it("keeps allowlisted TipTap markup and https links", () => {
    const input =
      '<h2>Title</h2><p>Hello <strong>world</strong></p><ul><li><a href="https://example.com">link</a></li></ul>';
    const clean = sanitizeRichHtml(input);
    expect(clean).toContain("<h2>");
    expect(clean).toContain("<strong>");
    expect(clean).toContain('href="https://example.com"');
  });
});
