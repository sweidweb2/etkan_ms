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
import { getSessionRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const role = await getSessionRole();

  if (role) {
    redirect(getPostLoginRedirect(role, params.next));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm next={params.next} />
        <p
          className="text-center text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          Don&apos;t have an account?{" "}
          <Link
            href={ROUTES.SIGNUP}
            suppressHydrationWarning
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
