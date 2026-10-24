import { describe, expect, it } from "vitest";
import { inspectStudentTaskUploadBytes } from "@/lib/manager/student-tasks/inspect-upload-bytes";

describe("inspectStudentTaskUploadBytes", () => {
  it("accepts PDF magic bytes", async () => {
    const result = await inspectStudentTaskUploadBytes(
      Buffer.from("%PDF-1.4\n%")
    );
    expect(result).toEqual({ ok: true, mime: "application/pdf" });
  });

  it("accepts plain text without null bytes", async () => {
    const result = await inspectStudentTaskUploadBytes(
      Buffer.from("hello student report\n")
    );
    expect(result).toEqual({ ok: true, mime: "text/plain" });
  });

  it("rejects spoofed binary as text", async () => {
    const result = await inspectStudentTaskUploadBytes(
      Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe])
    );
    expect(result.ok).toBe(false);
  });

  it("rejects empty payloads", async () => {
    const result = await inspectStudentTaskUploadBytes(Buffer.alloc(0));
    expect(result).toEqual({ ok: false, error: "File is empty." });
  });
});
