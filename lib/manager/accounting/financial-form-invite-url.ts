import { getSiteUrl } from "@/lib/config/site";
import { getFinancialFormInviteRoute } from "@/lib/constants/routes";

export function getFinancialFormInviteUrl(token: string): string {
  return `${getSiteUrl()}${getFinancialFormInviteRoute(token)}`;
}
