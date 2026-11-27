import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/components/seo/json-ld";

describe("serializeJsonLd", () => {
  it("escapes script breakout sequences", () => {
    const serialized = serializeJsonLd({
      headline: "</script><script>alert(1)</script>",
    });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script>");
  });
});
