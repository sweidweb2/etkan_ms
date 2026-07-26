import { RouteLoading } from "@/components/loaders/route-loading";
import { getPublicLocale } from "@/lib/i18n/get-public-locale";
import { translate } from "@/lib/i18n/messages";

export default async function AuthLoading() {
  const locale = await getPublicLocale();
  return (
    <RouteLoading
      variant="full-page"
      label={translate(locale, "auth.loading")}
    />
  );
}
