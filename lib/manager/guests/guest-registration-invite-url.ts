import { getSiteUrl } from "@/lib/config/site";
import { getRegisterGuestRoute } from "@/lib/constants/routes";

export function getGuestRegistrationInviteUrl(token: string): string {
  return `${getSiteUrl()}${getRegisterGuestRoute(token)}`;
}
