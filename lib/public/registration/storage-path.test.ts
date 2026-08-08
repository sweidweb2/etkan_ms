import { describe, expect, it } from "vitest";
import {
  REGISTRATION_STORAGE_BUCKET,
  buildRegistrationDocumentStoragePath,
  buildRegistrationTempStoragePath,
  isRegistrationTempStoragePath,
  sanitizeRegistrationDocumentFileName,
  splitRegistrationStoragePath,
} from "@/lib/public/registration/storage-path";

describe("sanitizeRegistrationDocumentFileName", () => {
  it("strips path segments and unsafe characters", () => {
    expect(sanitizeRegistrationDocumentFileName("../../id (v1).pdf")).toBe(
      "id-v1.pdf"
    );
  });

  it("falls back when name is empty after sanitize", () => {
    expect(sanitizeRegistrationDocumentFileName("***")).toBe("file");
  });
});

describe("buildRegistrationTempStoragePath", () => {
  it("builds registration/tmp/{sessionId}/{uuid}-{safeName}", () => {
    const sessionId = "11111111-1111-4111-8111-111111111111";
    const objectId = "22222222-2222-4222-8222-222222222222";
    const path = buildRegistrationTempStoragePath(
      sessionId,
      "National ID.pdf",
      objectId
    );
    expect(path).toBe(
      `${REGISTRATION_STORAGE_BUCKET}/tmp/${sessionId}/${objectId}-National-ID.pdf`
    );
  });
});

describe("buildRegistrationDocumentStoragePath", () => {
  it("builds registration/{applicationId}/{uuid}-{safeName}", () => {
    const applicationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const objectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const path = buildRegistrationDocumentStoragePath(
      applicationId,
      "passport.png",
      objectId
    );
    expect(path).toBe(
      `${REGISTRATION_STORAGE_BUCKET}/${applicationId}/${objectId}-passport.png`
    );
  });
});

describe("splitRegistrationStoragePath", () => {
  it("splits bucket prefix from object path", () => {
    const { bucket, objectPath } = splitRegistrationStoragePath(
      "registration/tmp/s1/abc-file.pdf"
    );
    expect(bucket).toBe(REGISTRATION_STORAGE_BUCKET);
    expect(objectPath).toBe("tmp/s1/abc-file.pdf");
  });
});

describe("isRegistrationTempStoragePath", () => {
  it("accepts paths under the session tmp prefix", () => {
    const sessionId = "11111111-1111-4111-8111-111111111111";
    expect(
      isRegistrationTempStoragePath(
        `registration/tmp/${sessionId}/abc-file.pdf`,
        sessionId
      )
    ).toBe(true);
  });

  it("rejects paths outside the session tmp prefix", () => {
    expect(
      isRegistrationTempStoragePath(
        "registration/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/abc-file.pdf",
        "11111111-1111-4111-8111-111111111111"
      )
    ).toBe(false);
  });
});
