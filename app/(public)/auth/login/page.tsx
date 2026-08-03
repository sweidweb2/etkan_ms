import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import { getSessionRole, getSessionUser } from "@/lib/auth/session";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/constants/auth";
import { ROUTES } from "@/lib/constants/routes";
import { getPublicLocale } from "@/lib/i18n/get-public-locale";
import { translate } from "@/lib/i18n/messages";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { resolveIsInstructor } from "@/services/role.service";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const role = await getSessionRole();

  if (role) {
    const user = await getSessionUser();
    const client = await createSupabaseServerComponentClient();
    const isInstructor = user?.id
      ? await resolveIsInstructor(client, user.id)
      : false;
    redirect(getPostLoginRedirect(role, params.next, { isInstructor }));
  }

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
