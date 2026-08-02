import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import { getSessionRole } from "@/lib/auth/session";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/constants/auth";
import { ROUTES } from "@/lib/constants/routes";
import { getPublicLocale } from "@/lib/i18n/get-public-locale";
import { translate } from "@/lib/i18n/messages";

export default async function SignupPage() {
  if (!PUBLIC_SIGNUP_ENABLED) {
    redirect(ROUTES.LOGIN);
  }

  const role = await getSessionRole();

  if (role) {
    redirect(getPostLoginRedirect(role));
  }

  const locale = await getPublicLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.signup.title")}</CardTitle>
        <CardDescription>{t("auth.signup.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p
          className="mt-4 text-center text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          <Link
            href={ROUTES.LOGIN}
            suppressHydrationWarning
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("auth.signup.backToSignIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
