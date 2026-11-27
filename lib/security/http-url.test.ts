import { describe, expect, it } from "vitest";
import { isHttpUrl } from "@/lib/security/http-url";

describe("isHttpUrl", () => {
  it("accepts http(s) absolute URLs", () => {
    expect(isHttpUrl("https://example.com/a")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
  });

  it("rejects javascript, data, and relative values", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,<script>")).toBe(false);
    expect(isHttpUrl("/relative")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });
});
