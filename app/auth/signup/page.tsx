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
import { ROUTES } from "@/lib/constants/routes";

export default async function SignupPage() {
  const role = await getSessionRole();

  if (role) {
    redirect(getPostLoginRedirect(role));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create account</CardTitle>
        <CardDescription>
          Register as a student with your profile details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link
            href={ROUTES.LOGIN}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
