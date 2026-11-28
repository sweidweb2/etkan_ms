import { describe, expect, it } from "vitest";
import { inspectWorkshopDocumentBytes } from "@/lib/manager/workshops/inspect-upload-bytes";

describe("inspectWorkshopDocumentBytes", () => {
  it("accepts PDF magic bytes", async () => {
    const result = await inspectWorkshopDocumentBytes(
      Buffer.from("%PDF-1.4\n%")
    );
    expect(result).toEqual({ ok: true, mime: "application/pdf" });
  });

  it("rejects spoofed binary", async () => {
    const result = await inspectWorkshopDocumentBytes(
      Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe])
    );
    expect(result.ok).toBe(false);
  });
});
