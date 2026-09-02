"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Admin panel error"
      description="Something went wrong in the admin panel."
      reset={reset}
      homeHref={ROUTES.ADMIN_ROOT}
      homeLabel="Back to admin"
    />
  );
}
