"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  return (
    <ErrorPage
      title="Admin panel error"
      description={
        error.message ||
        "Something went wrong while loading this admin page. Try again or return to the dashboard."
      }
      reset={reset}
      homeHref={ROUTES.ADMIN_DASHBOARD}
      homeLabel="Back to dashboard"
    />
  );
}
