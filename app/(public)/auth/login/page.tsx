import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/constants/auth";
import { ROUTES } from "@/lib/constants/routes";
import { getPublicLocale } from "@/lib/i18n/get-public-locale";
import { translate } from "@/lib/i18n/messages";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Signed-in visitors are redirected in middleware. Do not load the session
  // pack here — that call was holding this page for many seconds.
  const params = await searchParams;
  const locale = await getPublicLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.login.title")}</CardTitle>
        <CardDescription>{t("auth.login.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm next={params.next} />
        {PUBLIC_SIGNUP_ENABLED ? (
          <p
            className="text-center text-sm text-muted-foreground"
            suppressHydrationWarning
          >
            {t("auth.login.noAccount")}{" "}
            <Link
              href={ROUTES.SIGNUP}
              suppressHydrationWarning
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {t("auth.login.signUpLink")}
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
