"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function CoManagerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Co-manager panel error"
      description="Something went wrong in the co-manager panel."
      reset={reset}
      homeHref={ROUTES.CO_MANAGER_DASHBOARD}
      homeLabel="Back to dashboard"
    />
  );
}
