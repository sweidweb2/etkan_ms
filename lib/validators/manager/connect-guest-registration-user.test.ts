import { describe, expect, it } from "vitest";
import {
  connectGuestRegistrationUserSchema,
  parseConnectGuestRegistrationUserFormData,
} from "@/lib/validators/manager/connect-guest-registration-user";

const guestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const userId = "11111111-1111-4111-8111-111111111111";

describe("connectGuestRegistrationUserSchema", () => {
  it("accepts guest and user ids", () => {
    const parsed = connectGuestRegistrationUserSchema.safeParse({
      guest_id: guestId,
      user_id: userId,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing user id", () => {
    const parsed = connectGuestRegistrationUserSchema.safeParse({
      guest_id: guestId,
      user_id: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid guest id", () => {
    const parsed = connectGuestRegistrationUserSchema.safeParse({
      guest_id: "not-a-uuid",
      user_id: userId,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseConnectGuestRegistrationUserFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("guest_id", guestId);
    formData.set("user_id", userId);

    const parsed = parseConnectGuestRegistrationUserFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.guest_id).toBe(guestId);
      expect(parsed.data.user_id).toBe(userId);
    }
  });
});
