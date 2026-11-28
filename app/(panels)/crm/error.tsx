"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function CrmError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="CRM panel error"
      description="Something went wrong in the CRM panel."
      reset={reset}
      homeHref={ROUTES.MANAGER_GUESTS}
      homeLabel="Back to guests"
    />
  );
}
