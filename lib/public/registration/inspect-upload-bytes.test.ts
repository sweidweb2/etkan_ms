import { describe, expect, it } from "vitest";
import { inspectRegistrationDocumentBytes } from "@/lib/public/registration/inspect-upload-bytes";

describe("inspectRegistrationDocumentBytes", () => {
  it("accepts PDF magic bytes", async () => {
    const result = await inspectRegistrationDocumentBytes(
      Buffer.from("%PDF-1.4\n%")
    );
    expect(result).toEqual({ ok: true, mime: "application/pdf" });
  });

  it("rejects plain text even when otherwise sniffable", async () => {
    const result = await inspectRegistrationDocumentBytes(
      Buffer.from("hello identity doc\n")
    );
    expect(result).toEqual({
      ok: false,
      error: "File type is not allowed.",
    });
  });

  it("rejects empty payloads", async () => {
    const result = await inspectRegistrationDocumentBytes(Buffer.alloc(0));
    expect(result).toEqual({ ok: false, error: "File is empty." });
  });
});
