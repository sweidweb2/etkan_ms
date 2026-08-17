import { describe, expect, it } from "vitest";
import {
  GUEST_CURRENT_STATUS_BADGE_CLASSES,
  GUEST_CURRENT_STATUS_VALUES,
  GUEST_DEFAULT_STATUS,
  GUEST_PIPELINE_STATUS_VALUES,
  GUEST_STATUS_VALUES,
  canMutateGuestPipeline,
  canRemoveGuestPipelineStatus,
} from "@/lib/constants/guest";

describe("guest status constants", () => {
  it("defaults new guests to scheduled", () => {
    expect(GUEST_DEFAULT_STATUS).toBe("scheduled");
  });

  it("keeps profile statuses off the pipeline log catalog", () => {
    for (const status of GUEST_CURRENT_STATUS_VALUES) {
      if (status === "finished") {
        continue;
      }
      expect(GUEST_PIPELINE_STATUS_VALUES).not.toContain(status);
    }
  });

  it("uses the seven pipeline nodes as the event catalog", () => {
    expect(GUEST_STATUS_VALUES).toEqual(GUEST_PIPELINE_STATUS_VALUES);
    expect(GUEST_PIPELINE_STATUS_VALUES).toHaveLength(7);
  });

  it("allows pipeline CRUD only while pending", () => {
    expect(canMutateGuestPipeline("pending")).toBe(true);
    expect(canMutateGuestPipeline("scheduled")).toBe(false);
    expect(canMutateGuestPipeline("cancelled")).toBe(false);
    expect(canMutateGuestPipeline("rejected")).toBe(false);
    expect(canMutateGuestPipeline("finished")).toBe(false);
  });

  it("allows pipeline removes while pending or finished", () => {
    expect(canRemoveGuestPipelineStatus("pending")).toBe(true);
    expect(canRemoveGuestPipelineStatus("finished")).toBe(true);
    expect(canRemoveGuestPipelineStatus("scheduled")).toBe(false);
    expect(canRemoveGuestPipelineStatus("cancelled")).toBe(false);
    expect(canRemoveGuestPipelineStatus("rejected")).toBe(false);
  });

  it("styles every profile status badge", () => {
    expect(Object.keys(GUEST_CURRENT_STATUS_BADGE_CLASSES).sort()).toEqual(
      [...GUEST_CURRENT_STATUS_VALUES].sort()
    );
  });
});
